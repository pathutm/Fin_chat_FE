import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';
import { VoiceService } from '../../../core/services/voice.service';

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="composer-wrapper">
      <div class="composer">
        <!-- Attachment button -->
        <button class="composer-btn attach-btn" aria-label="Attach file" id="attach-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"></path>
          </svg>
        </button>

        <!-- Text input -->
        <div class="input-container">
          <input
            type="text"
            class="composer-input"
            placeholder="Ask AI a question or describe your idea"
            [(ngModel)]="inputText"
            (keydown.enter)="onSend()"
            id="chat-input"
          />
        </div>

        <!-- Model selector pill -->
        <div class="model-pill">
          <span>FinChat 1.0</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <!-- Mic / Send button -->
        @if (inputText().trim()) {
          <button class="composer-btn send-btn" (click)="onSend()" aria-label="Send message" id="send-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        } @else {
          <button class="composer-btn mic-btn" (click)="onMicClick()" aria-label="Voice input" id="mic-btn">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path>
              <path d="M19 10v2a7 7 0 01-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .composer-wrapper {
      padding: 16px 32px 24px;
    }

    .composer {
      max-width: 760px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: var(--radius-xl);
      background: var(--surface-card);
      border: 1px solid var(--surface-border-subtle);
      transition: all var(--transition-fast);

      &:focus-within {
        border-color: rgba(16, 185, 129, 0.3);
        box-shadow: var(--glow-sm);
      }
    }

    .composer-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: var(--text-tertiary);
      transition: all var(--transition-fast);
      flex-shrink: 0;

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
    }

    .send-btn {
      background: var(--emerald-600);
      color: white !important;

      &:hover {
        background: var(--emerald-500);
        box-shadow: var(--glow-sm);
      }
    }

    .mic-btn {
      background: var(--emerald-600);
      color: white !important;

      &:hover {
        background: var(--emerald-500);
        box-shadow: var(--glow-sm);
      }
    }

    .input-container {
      flex: 1;
      min-width: 0;
    }

    .composer-input {
      width: 100%;
      padding: 10px 4px;
      font-size: 0.9rem;
      color: var(--text-primary);
      background: transparent;

      &::placeholder {
        color: var(--text-tertiary);
      }
    }

    .model-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border-radius: var(--radius-full);
      background: var(--surface-elevated);
      border: 1px solid var(--surface-border-subtle);
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: all var(--transition-fast);
      flex-shrink: 0;

      &:hover {
        background: var(--surface-hover);
        border-color: rgba(16, 185, 129, 0.2);
      }
    }
  `],
})
export class ChatComposerComponent {
  private readonly chatService = inject(ChatService);
  private readonly voiceService = inject(VoiceService);

  readonly inputText = signal('');

  onSend(): void {
    const text = this.inputText().trim();
    if (!text) return;

    if (!this.chatService.activeConversationId()) {
      this.chatService.startNewConversation(text);
    } else {
      this.chatService.sendMessage(text);
    }
    this.inputText.set('');
  }

  onMicClick(): void {
    this.voiceService.openOverlay();
  }
}
