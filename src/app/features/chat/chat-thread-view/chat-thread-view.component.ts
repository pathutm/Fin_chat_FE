import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-chat-thread-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="thread-container">
      <!-- Background Ambient Glow -->
      <div class="thread-ambient-bg"></div>

      <!-- Header Bar -->
      <div class="thread-header">
        <button class="header-action-btn" (click)="chatService.setView('home')" title="Back to Home">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Home</span>
        </button>

        <div class="session-pill">
          <span class="live-pulse-dot"></span>
          <span class="session-title">Live Session</span>
          <span class="model-tag">{{ chatService.selectedModel() }}</span>
        </div>

        @if (chatService.messages().length > 0) {
          <button class="header-action-btn clear-btn" (click)="chatService.clearChat()" title="Clear current session">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Clear</span>
          </button>
        } @else {
          <div style="width: 70px;"></div>
        }
      </div>

      <!-- Conversation Scroll Stream -->
      <div class="messages-stream">
        @if (chatService.messages().length === 0) {
          <!-- Clean Empty State (No Hardcoded Chat!) -->
          <div class="empty-thread-state">
            <div class="empty-gem-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </div>
            <h3 class="empty-title">Ask. Analyze. Understand.</h3>
            <p class="empty-desc">Get intelligent answers to your finance and business questions.</p>
          </div>
        } @else {
          @for (msg of chatService.messages(); track msg.id) {
            @if (msg.role === 'user') {
              <!-- User Message: Luminous Emerald Gradient Pill Bubble -->
              <div class="message-row user-row">
                <div class="user-bubble-pill">
                  {{ msg.content }}
                </div>
              </div>
            } @else {
              <!-- Assistant Message: Dot Icon + Clean Typography -->
              <div class="message-row assistant-row">
                <div class="assistant-dot-icon">
                  <div class="dot-inner"></div>
                </div>
                <div class="assistant-content">
                  <p class="assistant-text">{{ msg.content }}</p>
                </div>
              </div>
            }
          }

          <!-- Clean Backend Awaiting Indicator (UI Only - Ready for API) -->
          @if (chatService.isAwaitingBackend()) {
            <div class="backend-waiting-card">
              <div class="waiting-spinner"></div>
              <div class="waiting-details">
                <span class="waiting-title">Request sent to backend API</span>
                <span class="waiting-endpoint">Endpoint: <code>POST /api/v1/chat/completions</code></span>
              </div>
            </div>
          }
        }
      </div>

      <!-- Follow-up Capsule Composer -->
      <div class="composer-outer">
        <div class="thread-composer-capsule">
          <input
            type="text"
            class="thread-input"
            placeholder="Ask a question..."
            [(ngModel)]="inputText"
            (keydown.enter)="onSend()"
            autofocus
          />

          <div class="thread-composer-actions">
            <!-- Glowing Emerald Send Circle Button -->
            <button
              class="send-emerald-circle"
              (click)="onSend()"
              title="Send message"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .thread-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: calc(100vh - 60px);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 32px 28px;
      overflow: hidden;
      background: var(--bg-ambient-thread);
      transition: background 0.3s ease;
    }

    .thread-ambient-bg {
      position: absolute;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 700px;
      height: 400px;
      background: radial-gradient(
        circle,
        var(--top-glow-color) 0%,
        transparent 70%
      );
      filter: var(--top-glow-filter);
      pointer-events: none;
      z-index: 0;
      transition: all 0.3s ease;
    }

    /* ── Header ── */
    .thread-header {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 800px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      animation: fadeInUp 400ms ease;
    }

    .header-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--pill-bg);
      border: 1px solid var(--pill-border);
      border-radius: 999px;
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        color: var(--text-primary);
        border-color: rgba(16, 185, 129, 0.4);
        background: rgba(16, 185, 129, 0.12);
      }

      &.clear-btn:hover {
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.4);
        background: rgba(239, 68, 68, 0.1);
      }
    }

    .session-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 7px 16px;
      background: var(--pill-bg);
      border: 1px solid var(--pill-border);
      border-radius: 999px;
      backdrop-filter: blur(16px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .live-pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 1.5s infinite;
    }

    .session-title {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--pill-text);
    }

    .model-tag {
      font-size: 0.76rem;
      color: var(--text-muted);
      background: var(--tool-btn-bg);
      padding: 2px 8px;
      border-radius: 999px;
    }

    /* ── Message Stream ── */
    .messages-stream {
      position: relative;
      z-index: 1;
      flex: 1;
      width: 100%;
      max-width: 800px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 22px;
      padding: 10px 16px 20px;
    }

    /* ── Empty State ── */
    .empty-thread-state {
      margin: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 40px 20px;
      animation: fadeInScale 400ms ease;
    }

    .empty-gem-icon {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: radial-gradient(circle at 35% 30%, #34d399, #059669);
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #022c22;
      margin-bottom: 20px;
    }

    .empty-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--headline-color);
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }

    .empty-desc {
      font-size: 0.9rem;
      color: var(--text-muted);
      max-width: 420px;
      line-height: 1.5;
    }

    .message-row {
      display: flex;
      width: 100%;
      animation: fadeInUp 350ms ease both;
    }

    /* ── User Bubble ── */
    .user-row {
      justify-content: flex-end;
    }

    .user-bubble-pill {
      max-width: 78%;
      padding: 14px 22px;
      border-radius: 24px;
      border-bottom-right-radius: 8px;
      background: var(--user-bubble-bg);
      box-shadow: var(--user-bubble-shadow);
      color: var(--user-bubble-color);
      font-size: 0.95rem;
      font-weight: 500;
      line-height: 1.45;
      letter-spacing: -0.01em;
    }

    /* ── Assistant Message ── */
    .assistant-row {
      justify-content: flex-start;
      gap: 14px;
      align-items: flex-start;
    }

    .assistant-dot-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--assistant-dot-bg);
      border: 1px solid var(--assistant-dot-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 4px;
      transition: all 0.3s ease;
    }

    .dot-inner {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #34d399, #059669);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.8);
    }

    .assistant-content {
      flex: 1;
      max-width: 85%;
      padding: 6px 0;
    }

    .assistant-text {
      color: var(--assistant-text);
      font-size: 0.95rem;
      line-height: 1.6;
      letter-spacing: -0.01em;
      transition: color 0.3s ease;
    }

    /* ── Backend Indicator ── */
    .backend-waiting-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 18px;
      border-radius: 14px;
      background: var(--backend-card-bg);
      border: 1px dashed var(--backend-card-border);
      max-width: 480px;
      align-self: flex-start;
      margin-top: 6px;
      animation: fadeInScale 300ms ease;
      transition: all 0.3s ease;
    }

    .waiting-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .waiting-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .waiting-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--backend-card-title);
    }

    .waiting-endpoint {
      font-size: 0.74rem;
      color: var(--text-muted);

      code {
        color: var(--text-primary);
        background: var(--tool-btn-bg);
        padding: 2px 5px;
        border-radius: 4px;
      }
    }

    /* ── Floating Capsule Composer ── */
    .composer-outer {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 800px;
      padding-top: 12px;
    }

    .thread-composer-capsule {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px 10px 20px;
      background: var(--composer-bg);
      border: 1px solid var(--composer-border);
      border-radius: 999px;
      backdrop-filter: blur(24px);
      box-shadow: var(--composer-shadow);
      transition: all 0.25s ease;

      &:focus-within {
        border-color: var(--composer-border-focus);
        box-shadow: var(--composer-shadow-focus);
      }
    }

    .thread-input {
      flex: 1;
      font-size: 0.95rem;
      color: var(--composer-input-color);
      transition: color 0.3s ease;

      &::placeholder {
        color: var(--composer-placeholder);
      }
    }

    .thread-composer-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .send-emerald-circle {
      width: 38px;
      height: 38px;
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
    }
  `],
})
export class ChatThreadViewComponent {
  readonly chatService = inject(ChatService);
  inputText = '';

  onSend(): void {
    if (!this.inputText.trim()) return;
    this.chatService.sendUserMessage(this.inputText);
    this.inputText = '';
  }
}
