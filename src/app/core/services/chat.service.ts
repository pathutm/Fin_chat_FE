import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatMessage, Conversation, SuggestionChip } from '../models/chat.model';

export type DesktopViewMode = 'home' | 'chat';

export interface ChatResponse {
  response: string;
  agent?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/chat';

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

  /** Awaiting backend response flag */
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
    this.isAwaitingBackend.set(true);

    this.http
      .post<ChatResponse>(this.apiUrl, {
        message: userMsg.content,
      })
      .subscribe({
        next: (data) => {
          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: data.response,
            agent: data.agent,
            timestamp: new Date(),
          };
          this.messages.update((msgs) => [...msgs, assistantMsg]);
          this.isAwaitingBackend.set(false);
        },
        error: (err) => {
          console.error('Failed to communicate with backend:', err);
          this.isAwaitingBackend.set(false);
        },
      });
  }
}

