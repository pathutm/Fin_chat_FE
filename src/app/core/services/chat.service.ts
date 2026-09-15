import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatMessage, Conversation, SuggestionChip } from '../models/chat.model';

export type DesktopViewMode = 'home' | 'chat';

export interface ChatRequest {
  message: string;
  conversation_id: string;
}

export interface ChatResponse {
  response: string;
  agent?: string;
}

/** localStorage key for persisted chat history */
const STORAGE_KEY = 'finance_ai_chat_history';
const ACTIVE_KEY = 'finance_ai_active_conv';

/** Serialisable form stored in localStorage (timestamps as ISO strings) */
interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent?: string;
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
  private readonly apiUrl: string = 'http://127.0.0.1:8000/chat';
  private readonly proxyUrl: string = '/chat';

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

  readonly isTyping = signal<boolean>(false);
  readonly hasMessages = computed(() => this.messages().length > 0);

  /** Awaiting backend response flag */
  readonly isAwaitingBackend = signal<boolean>(false);

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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveStoredConversations(stored: StoredConversation[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
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
    };
  }

  private fromStoredMessage(sm: StoredMessage): ChatMessage {
    return {
      id: sm.id,
      role: sm.role,
      content: sm.content,
      timestamp: new Date(sm.timestamp),
      agent: sm.agent,
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
    const lastActiveId = localStorage.getItem(ACTIVE_KEY);
    const target = (lastActiveId ? stored.find((c) => c.id === lastActiveId) : null) ?? stored[0];

    this.activeConversationId.set(target.id);
    this.messages.set(target.messages.map((m) => this.fromStoredMessage(m)));

    if (target.messages.length > 0) {
      this.currentView.set('chat');
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  setView(view: DesktopViewMode): void {
    this.currentView.set(view);
  }

  setModel(model: string): void {
    this.selectedModel.set(model);
  }

  selectConversation(id: string): void {
    const stored = this.loadStoredConversations();
    const target = stored.find((c) => c.id === id);
    if (!target) return;

    this.activeConversationId.set(target.id);
    this.messages.set(target.messages.map((m) => this.fromStoredMessage(m)));
    this.isAwaitingBackend.set(false);
    this.isTyping.set(false);
    this.currentView.set('chat');

    try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* ignore */ }
  }

  startNewConversation(initialText?: string): void {
    const newId = this.generateConversationId();
    this.messages.set([]);
    this.isAwaitingBackend.set(false);
    this.isTyping.set(false);
    this.activeConversationId.set(newId);

    try { localStorage.setItem(ACTIVE_KEY, newId); } catch { /* ignore */ }

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
    const newId = this.generateConversationId();

    // Remove old conversation from storage only if it was empty
    const convId = this.activeConversationId();
    if (convId) {
      const stored = this.loadStoredConversations();
      const cleaned = stored.filter((c) => !(c.id === convId && c.messages.length === 0));
      this.saveStoredConversations(cleaned);
      this.conversations.set(cleaned.map((sc) => this.toConversation(sc)));
    }

    this.messages.set([]);
    this.isAwaitingBackend.set(false);
    this.isTyping.set(false);
    this.activeConversationId.set(newId);

    try { localStorage.setItem(ACTIVE_KEY, newId); } catch { /* ignore */ }
  }

  sendUserMessage(text: string): void {
    if (!text.trim()) return;

    let convId = this.activeConversationId();
    if (!convId) {
      convId = this.generateConversationId();
      this.activeConversationId.set(convId);
    }

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    this.messages.update((msgs) => [...msgs, userMsg]);
    this.currentView.set('chat');
    this.isAwaitingBackend.set(true);
    this.isTyping.set(true);

    // Persist after user message
    this.persistCurrentConversation();
    try { localStorage.setItem(ACTIVE_KEY, convId); } catch { /* ignore */ }

    const payload: ChatRequest = {
      message: userMsg.content,
      conversation_id: convId,
    };

    const handleSuccess = (data: ChatResponse) => {
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        agent: data.agent,
        timestamp: new Date(),
      };
      this.messages.update((msgs) => [...msgs, assistantMsg]);
      this.isAwaitingBackend.set(false);
      this.isTyping.set(false);
      // Persist after assistant response
      this.persistCurrentConversation();
    };

    const handleError = (err: unknown) => {
      console.error('Failed to communicate with backend:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content:
          'Unable to connect to the backend server. Please make sure the backend is running at http://127.0.0.1:8000.',
        agent: 'System',
        timestamp: new Date(),
      };
      this.messages.update((msgs) => [...msgs, errorMsg]);
      this.isAwaitingBackend.set(false);
      this.isTyping.set(false);
      // Still persist so the user message is not lost
      this.persistCurrentConversation();
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
}
