import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-chat-home-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="home-container">
      <div class="content-wrapper">
        <!-- Badge -->
        <div class="header-badge">
          <span class="status-dot"></span>
          <span>Working Capital Intelligence</span>
        </div>

        <!-- Main Headline -->
        <h1 class="main-headline">
          CFO Conversational Analytics
        </h1>
        <p class="main-subheadline">
          Instant financial insights, cash flow intelligence, and trend analytics.
        </p>

        <!-- Clean Enterprise Composer -->
        <div class="composer-card">
          <textarea
            class="composer-input"
            rows="3"
            placeholder="Ask a financial question, request invoice trends, or analyze cash flow..."
            [(ngModel)]="promptText"
            (keydown.enter)="onKeyDown($event)"
            autofocus
          ></textarea>

          <div class="composer-bottom-bar">
            <span class="composer-hint">Press Enter to send, Shift+Enter for new line</span>
            <button
              class="submit-action-btn"
              [disabled]="!promptText.trim()"
              (click)="onSubmit()"
              title="Submit prompt"
              aria-label="Send prompt"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>

        <!-- Suggestion Chips / Quick Prompts -->
        <div class="quick-prompts-section">
          <div class="quick-prompts-label">Quick Analytics Queries</div>
          <div class="prompts-grid">
            @for (item of samplePrompts; track item) {
              <button class="prompt-chip" (click)="usePrompt(item)">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M7 17l9.2-9.2M17 17V7H7"/>
                </svg>
                <span>{{ item }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      width: 100%;
      height: 100%;
      min-height: calc(100vh - 68px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px 60px;
      overflow-y: auto;
      background: var(--bg-app);
    }

    .content-wrapper {
      width: 100%;
      max-width: 740px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin: auto 0;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--primary-accent);
      margin-bottom: 20px;
      letter-spacing: 0.02em;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-success);
    }

    .main-headline {
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: var(--foreground);
      margin-bottom: 10px;
    }

    .main-subheadline {
      font-size: 1rem;
      color: var(--muted-text);
      max-width: 520px;
      margin-bottom: 32px;
      line-height: 1.5;
    }

    /* ── The Composer Card ── */
    .composer-card {
      width: 100%;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 16px 18px 12px;
      box-shadow: var(--composer-shadow);
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: left;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus-within {
        border-color: var(--primary-accent);
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06), 0 0 0 1px var(--primary-accent);
      }
    }

    .composer-input {
      font-size: 0.96rem;
      color: var(--foreground);
      width: 100%;
      background: transparent;
      resize: none;
      line-height: 1.5;

      &::placeholder {
        color: var(--muted-text);
      }
    }

    .composer-bottom-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 6px;
      border-top: 1px solid oklch(0.96 0.004 260);
    }

    .composer-hint {
      font-size: 0.74rem;
      color: var(--muted-text);
    }

    .submit-action-btn {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-base);
      background: var(--primary-accent);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        opacity: 0.92;
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }

    /* ── Quick Prompts ── */
    .quick-prompts-section {
      width: 100%;
      margin-top: 28px;
      text-align: left;
    }

    .quick-prompts-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted-text);
      margin-bottom: 10px;
    }

    .prompts-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .prompt-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: var(--radius-base);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;

      svg {
        color: var(--muted-text);
      }

      &:hover {
        background: var(--secondary-surface);
        border-color: oklch(0.8 0.015 260);
        color: var(--foreground);

        svg {
          color: var(--primary-accent);
        }
      }
    }

    @media (max-width: 640px) {
      .main-headline {
        font-size: 1.85rem;
      }
    }
  `],
})
export class ChatHomeViewComponent {
  readonly chatService = inject(ChatService);
  promptText = '';

  readonly samplePrompts = [
    'Show monthly invoice amount trend',
    'What is our total outstanding balance?',
    'List top 5 vendors by spend this quarter',
    'Analyze working capital metrics',
  ];

  onKeyDown(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.onSubmit();
    }
  }

  usePrompt(prompt: string): void {
    this.promptText = prompt;
    this.onSubmit();
  }

  onSubmit(): void {
    if (!this.promptText.trim()) return;
    this.chatService.sendUserMessage(this.promptText);
    this.promptText = '';
  }
}
