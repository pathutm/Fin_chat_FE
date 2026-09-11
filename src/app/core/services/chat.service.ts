import { Injectable, signal, computed } from '@angular/core';
import { ChatMessage, Conversation, SuggestionChip } from '../models/chat.model';

export type DesktopViewMode = 'home' | 'chat';

@Injectable({ providedIn: 'root' })
export class ChatService {
  /** Active desktop display mode: 'home' or 'chat' */
  readonly currentView = signal<DesktopViewMode>('home');

  /** Model selector */
  readonly selectedModel = signal<string>('Claude Haiku');

  /** Clean messages array - NO hardcoded chat! Starts empty */
  readonly messages = signal<ChatMessage[]>([]);

  /** Empty compatibility lists */
  readonly suggestionCards = [];
  readonly suggestions: SuggestionChip[] = [];

  /** Conversations list */
  readonly conversations = signal<Conversation[]>([]);
  readonly activeConversationId = signal<string | null>(null);
  readonly isTyping = signal<boolean>(false);
  readonly hasMessages = computed(() => this.messages().length > 0);

  /** Awaiting backend response flag - UI only, ready for API */
  readonly isAwaitingBackend = signal<boolean>(false);

  setView(view: DesktopViewMode): void {
    this.currentView.set(view);
  }

  setModel(model: string): void {
    this.selectedModel.set(model);
  }

  selectConversation(id: string): void {
    this.activeConversationId.set(id);
    this.currentView.set('chat');
  }

  startNewConversation(initialText?: string): void {
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
    this.messages.set([]);
    this.isAwaitingBackend.set(false);
  }

  /**
   * UI ONLY: Appends user message and sets backend waiting status
   * Responses will come from backend API!
   */
  sendUserMessage(text: string): void {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    this.messages.update((msgs) => [...msgs, userMsg]);
    this.currentView.set('chat');

    // UI state indicator: awaiting backend API
    this.isAwaitingBackend.set(true);
  }
}
