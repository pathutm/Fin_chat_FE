import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatMessage, Conversation, SuggestionChip } from '../models/chat.model';
import { AuthService } from './auth.service';

export type DesktopViewMode = 'home' | 'chat';

export interface ChatRequest {
  message: string;
  conversation_id: string;
  user_name?: string | null;
  user_id?: string | null;
}

export interface ChatResponse {
  response: string;
  agent?: string;
  deleted?: boolean;
  requires_confirmation?: boolean;
  safe_finance_query?: string;
}

// Base keys, will be appended with user ID
const BASE_STORAGE_KEY = 'finance_ai_chat_history';
const BASE_ACTIVE_KEY = 'finance_ai_active_conv';

/** Serialisable form stored in localStorage (timestamps as ISO strings) */
interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent?: string;
  deleted?: boolean;
}

interface StoredConversation {
  id: string;          // used as conversation_id sent to backend
  title: string;
  messages: StoredMessage[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl: string = 'http://127.0.0.1:8000/chat';
  private readonly proxyUrl: string = '/chat';

  private get storageKey(): string {
    const userId = this.authService.currentUser()?.id || 'anonymous';
    return `${BASE_STORAGE_KEY}_${userId}`;
  }

  private get activeKey(): string {
    const userId = this.authService.currentUser()?.id || 'anonymous';
    return `${BASE_ACTIVE_KEY}_${userId}`;
  }

  /** Active desktop display mode: 'home' or 'chat' */
  readonly currentView = signal<DesktopViewMode>('home');

  /** Model selector */
  readonly selectedModel = signal<string>('Claude Haiku');

  /** Messages for the current active conversation */
  readonly messages = signal<ChatMessage[]>([]);

  /** Empty compatibility lists */
  readonly suggestionCards = [];
  readonly suggestions: SuggestionChip[] = [];

  /** All conversations (persisted) */
  readonly conversations = signal<Conversation[]>([]);

  /** The active conversation_id — reused for all messages in the same chat */
  readonly activeConversationId = signal<string>('');

  /** Conversation IDs currently waiting for backend response */
  readonly pendingConvSet = signal<Set<string>>(new Set());

  /** Most recent conversation that was initiated and is still loading */
  readonly pendingConversationId = signal<string | null>(null);

  /** In-memory cache of messages for pending conversations */
  private readonly pendingMessagesMap = new Map<string, ChatMessage[]>();

  readonly isTyping = computed(() => this.pendingConvSet().has(this.activeConversationId()));
  readonly hasMessages = computed(() => this.messages().length > 0);

  /** Awaiting backend response flag per conversation */
  readonly isAwaitingBackend = computed(() => this.pendingConvSet().has(this.activeConversationId()));

  constructor() {
    this.restoreFromStorage();
  }

  // ─── ID generation ────────────────────────────────────────────────────────

  generateConversationId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'conv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }

  // ─── localStorage helpers ─────────────────────────────────────────────────

  private loadStoredConversations(): StoredConversation[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveStoredConversations(stored: StoredConversation[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    } catch {
      console.warn('Failed to save chat history to localStorage.');
    }
  }

  private toStoredMessage(msg: ChatMessage): StoredMessage {
    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : String(msg.timestamp),
      agent: msg.agent,
      deleted: msg.deleted,
    };
  }

  private fromStoredMessage(sm: StoredMessage): ChatMessage {
    return {
      id: sm.id,
      role: sm.role,
      content: sm.content,
      timestamp: new Date(sm.timestamp),
      agent: sm.agent,
      deleted: sm.deleted,
    };
  }

  private toConversation(sc: StoredConversation): Conversation {
    return {
      id: sc.id,
      title: sc.title,
      messages: sc.messages.map((m) => this.fromStoredMessage(m)),
      createdAt: new Date(sc.createdAt),
      updatedAt: new Date(sc.updatedAt),
    };
  }

  private persistCurrentConversation(): void {
    const convId = this.activeConversationId();
    if (!convId) return;

    const stored = this.loadStoredConversations();
    const idx = stored.findIndex((c) => c.id === convId);
    const now = new Date().toISOString();
    const msgs = this.messages();

    // If it's empty, don't persist it as a real conversation yet to avoid clutter
    if (msgs.length === 0 && idx === -1) {
      return;
    }

    const firstUserMsg = msgs.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 40) + (firstUserMsg.content.length > 40 ? '…' : '')
      : 'New conversation';

    const entry: StoredConversation = {
      id: convId,
      title,
      messages: msgs.filter((m) => !m.isTyping).map((m) => this.toStoredMessage(m)),
      createdAt: idx >= 0 ? stored[idx].createdAt : now,
      updatedAt: now,
    };

    if (idx >= 0) {
      stored[idx] = entry;
    } else {
      stored.push(entry);
    }

    // Sort stored conversations by updatedAt descending (newest first)
    stored.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    this.saveStoredConversations(stored);
    this.conversations.set(stored.map((sc) => this.toConversation(sc)));
  }

  // ─── Boot-time restore ────────────────────────────────────────────────────

  private restoreFromStorage(): void {
    const stored = this.loadStoredConversations();
    if (stored.length === 0) {
      this.activeConversationId.set(this.generateConversationId());
      return;
    }

    // Ensure sorted on boot
    stored.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.conversations.set(stored.map((sc) => this.toConversation(sc)));

    // Restore the last active conversation
    const lastActiveId = localStorage.getItem(this.activeKey);
    const target = lastActiveId ? stored.find((c) => c.id === lastActiveId) : null;

    if (target) {
      this.activeConversationId.set(target.id);
      this.messages.set(target.messages.map((m) => this.fromStoredMessage(m)));
      if (target.messages.length > 0) {
        this.currentView.set('chat');
      }
    } else {
      this.activeConversationId.set(lastActiveId || this.generateConversationId());
      this.messages.set([]);
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  setView(view: DesktopViewMode): void {
    if (view === 'chat') {
      const pendingId = this.pendingConversationId();
      if (pendingId && this.pendingConvSet().has(pendingId)) {
        this.selectConversation(pendingId);
        return;
      }
    }
    this.currentView.set(view);
  }

  setModel(model: string): void {
    this.selectedModel.set(model);
  }

  selectConversation(id: string): void {
    const pendingMsgs = this.pendingMessagesMap.get(id);

    if (pendingMsgs && this.pendingConvSet().has(id)) {
      this.activeConversationId.set(id);
      this.messages.set([...pendingMsgs]);
      this.currentView.set('chat');
      try { localStorage.setItem(this.activeKey, id); } catch { /* ignore */ }
      return;
    }

    const stored = this.loadStoredConversations();
    const target = stored.find((c) => c.id === id);
    if (!target) return;

    this.activeConversationId.set(target.id);
    this.messages.set(target.messages.map((m) => this.fromStoredMessage(m)));
    this.currentView.set('chat');

    try { localStorage.setItem(this.activeKey, id); } catch { /* ignore */ }
  }

  startNewConversation(initialText?: string): void {
    const newId = this.generateConversationId();
    this.messages.set([]);
    this.activeConversationId.set(newId);

    try { localStorage.setItem(this.activeKey, newId); } catch { /* ignore */ }

    if (initialText) {
      this.sendUserMessage(initialText);
    } else {
      this.currentView.set('home');
    }
  }

  sendMessage(text: string): void {
    this.sendUserMessage(text);
  }

  clearChat(): void {
    const convId = this.activeConversationId();
    if (convId) {
      this.pendingMessagesMap.delete(convId);
      this.pendingConvSet.update((set) => {
        const next = new Set(set);
        next.delete(convId);
        return next;
      });
      if (this.pendingConversationId() === convId) {
        this.pendingConversationId.set(null);
      }

      const stored = this.loadStoredConversations();
      const idx = stored.findIndex((c) => c.id === convId);
      if (idx >= 0) {
        stored[idx] = {
          ...stored[idx],
          messages: [],
          updatedAt: new Date().toISOString(),
        };
        this.saveStoredConversations(stored);
        this.conversations.set(stored.map((sc) => this.toConversation(sc)));
      }
    }

    this.messages.set([]);
  }

  deleteConversation(id: string): void {
    if (!id) return;
    this.pendingMessagesMap.delete(id);
    this.pendingConvSet.update((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });
    if (this.pendingConversationId() === id) {
      this.pendingConversationId.set(null);
    }

    const stored = this.loadStoredConversations();
    const cleaned = stored.filter((c) => c.id !== id);
    this.saveStoredConversations(cleaned);
    this.conversations.set(cleaned.map((sc) => this.toConversation(sc)));

    if (this.activeConversationId() === id) {
      this.clearChat();
    }
  }

  sendUserMessage(text: string): void {
    if (!text.trim()) return;

    const rawUserText = text.trim();

    // If we are sending from home view AND the current active conversation already contains messages,
    // generate a brand new conversation ID for this new chat.
    let convId = this.activeConversationId();
    if (this.currentView() === 'home' && (this.messages().length > 0 || !convId)) {
      convId = this.generateConversationId();
      this.activeConversationId.set(convId);
      this.messages.set([]);
    } else if (!convId) {
      convId = this.generateConversationId();
      this.activeConversationId.set(convId);
    }

    const targetConvId = convId;

    // Create user message immediately so it stays visible in the chat stream during generation
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: rawUserText,
      timestamp: new Date(),
    };

    // Append user message to active messages signal immediately
    const updatedActiveMsgs = [...this.messages(), userMsg];
    this.messages.set(updatedActiveMsgs);

    // Track pending conversation & messages
    this.pendingConversationId.set(targetConvId);
    this.pendingMessagesMap.set(targetConvId, updatedActiveMsgs);
    this.pendingConvSet.update((set) => {
      const next = new Set(set);
      next.add(targetConvId);
      return next;
    });

    // Save user message immediately to storage so history sidebar updates right away
    this.saveUserMsgToTargetConv(targetConvId, userMsg);

    // Switch view to chat
    this.currentView.set('chat');

    try { localStorage.setItem(this.activeKey, targetConvId); } catch { /* ignore */ }

    const payload: ChatRequest = {
      message: rawUserText,
      conversation_id: targetConvId,
      user_name: this.authService.displayName() || null,
      user_id: this.authService.currentUser()?.id || null,
    };

    const handleSuccess = (data: ChatResponse) => {
      if (data.deleted) {
        // PII detected by backend: replacement deleted user message
        userMsg.content = `🗑️ Message deleted\n\nThis message was removed because it contained personal or sensitive information.\n\nPlease do not share personal or private information in this chat.`;
        userMsg.deleted = true;
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.response,
        agent: data.agent,
        timestamp: new Date(),
      };

      // 1. Save userMsg and assistantMsg to target conversation entry in localStorage
      this.savePairToTargetConv(targetConvId, userMsg, assistantMsg);

      // 2. Clear pending state for targetConvId
      this.pendingMessagesMap.delete(targetConvId);
      this.pendingConvSet.update((set) => {
        const next = new Set(set);
        next.delete(targetConvId);
        return next;
      });
      if (this.pendingConversationId() === targetConvId) {
        this.pendingConversationId.set(null);
      }

      // 3. Update active view if user is still viewing targetConvId
      if (this.activeConversationId() === targetConvId) {
        this.messages.update((msgs) => {
          const hasUserMsg = msgs.some((m) => m.id === userMsg.id);
          const base = hasUserMsg ? msgs : [...msgs, userMsg];
          return [...base, assistantMsg];
        });
      }
    };

    const handleError = (err: unknown) => {
      console.error('Failed to communicate with backend:', err);

      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content:
          'Unable to connect to the assistant service. Please verify your connection and try again.',
        agent: 'System',
        timestamp: new Date(),
      };

      this.savePairToTargetConv(targetConvId, userMsg, errorMsg);

      this.pendingMessagesMap.delete(targetConvId);
      this.pendingConvSet.update((set) => {
        const next = new Set(set);
        next.delete(targetConvId);
        return next;
      });
      if (this.pendingConversationId() === targetConvId) {
        this.pendingConversationId.set(null);
      }

      if (this.activeConversationId() === targetConvId) {
        this.messages.update((msgs) => {
          const hasUserMsg = msgs.some((m) => m.id === userMsg.id);
          const base = hasUserMsg ? msgs : [...msgs, userMsg];
          return [...base, errorMsg];
        });
      }
    };

    // HTTP POST — fallback to dev proxy on CORS block (status 0)
    this.http.post<ChatResponse>(this.apiUrl, payload).subscribe({
      next: handleSuccess,
      error: (err) => {
        if (err?.status === 0 && this.proxyUrl !== this.apiUrl) {
          console.warn('Direct backend call failed; retrying via dev proxy…');
          this.http.post<ChatResponse>(this.proxyUrl, payload).subscribe({
            next: handleSuccess,
            error: handleError,
          });
        } else {
          handleError(err);
        }
      },
    });
  }

  private saveUserMsgToTargetConv(targetConvId: string, userMsg: ChatMessage): void {
    const stored = this.loadStoredConversations();
    const idx = stored.findIndex((c) => c.id === targetConvId);
    const now = new Date().toISOString();
    const storedUser = this.toStoredMessage(userMsg);

    if (idx >= 0) {
      const existing = stored[idx].messages;
      if (!existing.some((m) => m.id === userMsg.id)) {
        stored[idx] = {
          ...stored[idx],
          messages: [...existing, storedUser],
          updatedAt: now,
        };
      }
    } else {
      const title = userMsg.content.slice(0, 40) + (userMsg.content.length > 40 ? '…' : '');
      stored.push({
        id: targetConvId,
        title,
        messages: [storedUser],
        createdAt: now,
        updatedAt: now,
      });
    }

    stored.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.saveStoredConversations(stored);
    this.conversations.set(stored.map((sc) => this.toConversation(sc)));
  }

  private savePairToTargetConv(targetConvId: string, userMsg: ChatMessage, assistantMsg: ChatMessage): void {
    const stored = this.loadStoredConversations();
    const idx = stored.findIndex((c) => c.id === targetConvId);
    const now = new Date().toISOString();

    const storedUser = this.toStoredMessage(userMsg);
    const storedAssistant = this.toStoredMessage(assistantMsg);

    if (idx >= 0) {
      const existingMsgs = [...stored[idx].messages];
      const userIdx = existingMsgs.findIndex((m) => m.id === userMsg.id);
      let updatedMsgs: StoredMessage[];
      if (userIdx >= 0) {
        existingMsgs[userIdx] = storedUser;
        updatedMsgs = [...existingMsgs, storedAssistant];
      } else {
        updatedMsgs = [...existingMsgs, storedUser, storedAssistant];
      }

      const firstUser = updatedMsgs.find((m) => m.role === 'user');
      const title = firstUser
        ? (firstUser.deleted ? 'Protected Conversation' : (firstUser.content.slice(0, 40) + (firstUser.content.length > 40 ? '…' : '')))
        : 'New conversation';

      stored[idx] = {
        ...stored[idx],
        title,
        messages: updatedMsgs,
        updatedAt: now,
      };
    } else {
      const title = userMsg.deleted
        ? 'Protected Conversation'
        : (userMsg.content.slice(0, 40) + (userMsg.content.length > 40 ? '…' : ''));

      stored.push({
        id: targetConvId,
        title,
        messages: [storedUser, storedAssistant],
        createdAt: now,
        updatedAt: now,
      });
    }

    stored.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    this.saveStoredConversations(stored);
    this.conversations.set(stored.map((sc) => this.toConversation(sc)));
  }
}
