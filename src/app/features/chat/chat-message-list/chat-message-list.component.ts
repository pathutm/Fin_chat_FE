import { Component, input, inject, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../core/models/chat.model';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-chat-message-list',
  standalone: true,
  imports: [CommonModule, ChatMessageComponent],
  template: `
    <div class="message-list" #scrollContainer>
      <div class="message-list-inner">
        @for (msg of messages(); track msg.id) {
          <app-chat-message [message]="msg" />
        }

        @if (chatService.isTyping()) {
          <app-chat-message [message]="typingMessage" />
        }
      </div>
    </div>
  `,
  styles: [`
    .message-list {
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 24px 32px;
    }

    .message-list-inner {
      max-width: 760px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-bottom: 16px;
    }
  `],
})
export class ChatMessageListComponent {
  readonly messages = input.required<ChatMessage[]>();
  readonly chatService = inject(ChatService);

  private readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  /** A dummy message to render the typing indicator */
  readonly typingMessage: ChatMessage = {
    id: 'typing',
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isTyping: true,
  };

  constructor() {
    // Auto-scroll to bottom when messages change
    effect(() => {
      this.messages();
      this.chatService.isTyping();
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
