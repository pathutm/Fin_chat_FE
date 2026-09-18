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
      <!-- Top Ambient Emerald Glow -->
      <div class="top-ambient-glow"></div>

      <!-- Content Column -->
      <div class="content-wrapper">
        <!-- Big Headline from Reference -->
        <h1 class="main-headline">
          Welcome to FinAI
        </h1>

        <!-- The Capsule Composer (Screen 1 Reference) -->
        <div class="composer-capsule">
          <input
            type="text"
            class="composer-input"
            placeholder="Ask an open question or search..."
            [(ngModel)]="promptText"
            (keydown.enter)="onSubmit()"
            autofocus
          />

          <div class="composer-bottom-bar">
            <!-- Right Controls: Glowing Emerald Circular Button -->
            <button
              class="glowing-action-btn"
              (click)="onSubmit()"
              title="Submit prompt"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Hint footer -->
        <div class="ui-only-note">
          <span class="note-dot"></span>
          <span>Desktop UI Mode • Response will connect to backend API</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: calc(100vh - 60px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 32px 64px;
      overflow-y: auto;
      background: var(--bg-ambient-home);
      transition: background 0.3s ease;
    }

    .top-ambient-glow {
      position: absolute;
      top: -150px;
      left: 50%;
      transform: translateX(-50%);
      width: 850px;
      height: 500px;
      background: radial-gradient(
        circle,
        var(--top-glow-color) 0%,
        transparent 75%
      );
      filter: var(--top-glow-filter);
      pointer-events: none;
      z-index: 0;
      transition: all 0.3s ease;
    }

    .content-wrapper {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      margin: auto 0;
    }

    /* ── Main Headline ── */
    .main-headline {
      font-family: var(--font-family);
      font-size: 3.8rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.03em;
      color: var(--headline-color);
      margin-bottom: 48px;
      text-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
      animation: fadeInUp 500ms ease 100ms both;
      transition: color 0.3s ease;
    }

    /* ── The Capsule Composer ── */
    .composer-capsule {
      width: 100%;
      background: var(--composer-bg);
      border: 1px solid var(--composer-border);
      border-radius: 28px;
      padding: 18px 24px 16px 26px;
      backdrop-filter: blur(24px);
      box-shadow: var(--composer-shadow);
      display: flex;
      flex-direction: column;
      gap: 18px;
      animation: fadeInUp 500ms ease 200ms both;
      transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.3s ease;

      &:focus-within {
        border-color: var(--composer-border-focus);
        box-shadow: var(--composer-shadow-focus);
      }
    }

    .composer-input {
      font-size: 1.1rem;
      color: var(--composer-input-color);
      width: 100%;
      background: transparent;
      transition: color 0.3s ease;

      &::placeholder {
        color: var(--composer-placeholder);
      }
    }

    .composer-bottom-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    /* ── Glowing Emerald Circular Button ── */
    .glowing-action-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--glowing-btn-bg);
      box-shadow: var(--glowing-btn-shadow);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--glowing-btn-color);
      transition: all 0.25s ease;

      &:hover {
        transform: scale(1.08);
        box-shadow: var(--glowing-btn-shadow-hover);
      }

      &:active {
        transform: scale(0.96);
      }
    }

    /* ── Backend Note ── */
    .ui-only-note {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 24px;
      font-size: 0.8rem;
      color: var(--text-muted);
      align-self: center;
      transition: color 0.3s ease;
    }

    .note-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    @media (max-width: 768px) {
      .main-headline {
        font-size: 2.6rem;
      }
    }
  `],
})
export class ChatHomeViewComponent {
  readonly chatService = inject(ChatService);
  promptText = '';

  onSubmit(): void {
    if (!this.promptText.trim()) return;
    this.chatService.sendUserMessage(this.promptText);
    this.promptText = '';
  }
}
