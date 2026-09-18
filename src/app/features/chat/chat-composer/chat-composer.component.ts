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
        <!-- Text input -->
        <div class="input-container">
          <input
            type="text"
            class="composer-input"
            placeholder="Ask CFO Analytics a question or request trend analysis..."
            [(ngModel)]="inputText"
            (keydown.enter)="onSend()"
            id="chat-input"
          />
        </div>

        <!-- Model selector pill -->
        <div class="model-pill">
          <span>{{ chatService.selectedModel() }}</span>
        </div>

        <!-- Mic / Send button -->
        @if (inputText().trim()) {
          <button class="composer-btn send-btn" (click)="onSend()" aria-label="Send message" id="send-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        } @else {
          <button class="composer-btn mic-btn" (click)="onMicClick()" aria-label="Voice input" id="mic-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      padding: 12px 24px 20px;
    }

    .composer {
      max-width: 820px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px 6px 14px;
      border-radius: var(--radius-card);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      box-shadow: var(--composer-shadow);
      transition: all 0.15s ease;

      &:focus-within {
        border-color: var(--primary-accent);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05), 0 0 0 1px var(--primary-accent);
      }
    }

    .composer-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-base);
      color: var(--muted-text);
      transition: all 0.15s ease;
      flex-shrink: 0;

      &:hover {
        background: var(--secondary-surface);
        color: var(--foreground);
      }
    }

    .send-btn {
      background: var(--primary-accent);
      color: #ffffff !important;

      &:hover {
        opacity: 0.92;
      }
    }

    .mic-btn {
      background: var(--secondary-surface);
      color: var(--text-secondary);

      &:hover {
        background: var(--card-surface);
        color: var(--primary-accent);
      }
    }

    .input-container {
      flex: 1;
      min-width: 0;
    }

    .composer-input {
      width: 100%;
      padding: 8px 4px;
      font-size: 0.92rem;
      color: var(--foreground);
      background: transparent;

      &::placeholder {
        color: var(--muted-text);
      }
    }

    .model-pill {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: var(--radius-pill);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      color: var(--muted-text);
      font-size: 0.72rem;
      font-weight: 500;
      white-space: nowrap;
      font-family: var(--font-mono);
      flex-shrink: 0;
    }
  `],
})
export class ChatComposerComponent {
  readonly chatService = inject(ChatService);
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
