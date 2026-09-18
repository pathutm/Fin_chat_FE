import { Component, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';
import { MarkdownFormatterService } from '../../../core/utils/markdown-formatter.util';

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
              <!-- Assistant Message: Dark-Green Response Container -->
              <div class="message-row assistant-row">
                <div class="assistant-dot-icon">
                  <div class="dot-inner"></div>
                </div>
                <div class="assistant-content">
                  <div class="assistant-card-container">
                    <!-- Container Header -->
                    <div class="assistant-card-header">
                      <div class="card-title-group">
                        <svg class="sparkle-icon" viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                          <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                        </svg>
                        <span class="card-title">FinAI Response</span>
                      </div>
                      <button
                        class="copy-btn"
                        [class.copied]="copiedMessageId() === msg.id"
                        (click)="copyResponseText(msg.content, msg.id)"
                        title="Copy response to clipboard"
                      >
                        @if (copiedMessageId() === msg.id) {
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Copied</span>
                        } @else {
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy</span>
                        }
                      </button>
                    </div>

                    <!-- Container Body: Markdown Content -->
                    <div class="assistant-markdown-content" [innerHTML]="markdownFormatter.formatMarkdown(msg.content)"></div>

                    @if (msg.agent) {
                      <div class="assistant-card-footer">
                        <span class="assistant-agent-meta">{{ getAgentLabel(msg.agent) }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          }

          <!-- Polished Enterprise AI Processing Indicator -->
          @if (chatService.isAwaitingBackend()) {
            <div class="message-row assistant-row loading-row">
              <div class="assistant-dot-icon glowing-dot-pulse">
                <div class="dot-inner"></div>
              </div>
              <div class="loading-status-card">
                <div class="loading-header">
                  <span class="loading-status-text">{{ currentLoadingStatus() }}</span>
                  <div class="loading-typing-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                  </div>
                </div>
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
      max-width: 88%;
      padding: 2px 0;
    }

    /* ── Assistant Response Dark-Green Container ── */
    .assistant-card-container {
      background: var(--response-card-bg, var(--new-chat-bg));
      border: 1px solid var(--response-card-border, var(--new-chat-border));
      border-radius: 16px;
      padding: 16px 22px;
      box-shadow: var(--response-card-shadow, 0 4px 24px rgba(0, 0, 0, 0.3));
      backdrop-filter: blur(12px);
      transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .assistant-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(16, 185, 129, 0.15);
    }

    .card-title-group {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--response-header-title, #34d399);
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .sparkle-icon {
      color: var(--response-header-title, #34d399);
      filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.4));
    }

    .copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--tool-btn-bg, rgba(255, 255, 255, 0.06));
      border: 1px solid var(--tool-btn-border, rgba(255, 255, 255, 0.1));
      color: var(--text-secondary, #94a3b8);
      font-size: 0.76rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(16, 185, 129, 0.14);
        color: var(--response-header-title, #34d399);
        border-color: rgba(16, 185, 129, 0.35);
      }

      &.copied {
        background: rgba(16, 185, 129, 0.22);
        color: var(--response-header-title, #34d399);
        border-color: #10b981;
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.3);
      }
    }

    .assistant-card-footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed rgba(16, 185, 129, 0.15);
    }

    /* ── Structured Assistant Markdown Formatting ── */
    ::ng-deep .assistant-markdown-content {
      color: var(--text-primary);
      font-size: 0.95rem;
      line-height: 1.65;
      letter-spacing: -0.01em;

      p {
        margin: 0 0 12px 0;
        color: var(--text-primary);

        &:last-child {
          margin-bottom: 0;
        }
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 18px 0 10px 0;
        font-weight: 600;
        color: var(--headline-color);
        letter-spacing: -0.02em;

        &:first-child {
          margin-top: 0;
        }
      }

      h1, h2, h3 {
        font-size: 1.08rem;
        color: var(--response-header-title, #34d399);
      }

      h4, h5, h6 {
        font-size: 0.98rem;
        color: var(--headline-color);
      }

      ul, ol {
        margin: 8px 0 14px 0;
        padding-left: 22px;
        color: var(--text-primary);
      }

      li {
        margin-bottom: 6px;
        color: var(--text-primary);

        &:last-child {
          margin-bottom: 0;
        }
      }

      pre {
        background: var(--code-block-bg, rgba(15, 23, 42, 0.6));
        border: 1px solid var(--code-block-border, rgba(16, 185, 129, 0.25));
        border-radius: 10px;
        padding: 14px 18px;
        margin: 14px 0;
        overflow-x: auto;
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 0.88rem;
        color: var(--code-block-text, #e2e8f0);

        code {
          background: transparent;
          padding: 0;
          border-radius: 0;
          color: inherit;
          font-family: inherit;
          font-size: inherit;
        }
      }

      code {
        background: var(--inline-code-bg, rgba(16, 185, 129, 0.14));
        color: var(--inline-code-text, #34d399);
        border: 1px solid var(--inline-code-border, rgba(16, 185, 129, 0.2));
        padding: 2px 6px;
        border-radius: 5px;
        font-family: 'Fira Code', 'Consolas', monospace;
        font-size: 0.88rem;
      }

      blockquote {
        border-left: 3px solid #10b981;
        margin: 12px 0;
        padding: 6px 0 6px 14px;
        color: var(--text-muted);
        font-style: italic;
        background: rgba(16, 185, 129, 0.05);
        border-radius: 0 6px 6px 0;
      }

      hr {
        border: none;
        border-top: 1px solid var(--topbar-border, rgba(16, 185, 129, 0.2));
        margin: 16px 0;
      }
    }

    .assistant-agent-meta {
      display: inline-block;
      margin-top: 8px;
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    /* ── Polished Enterprise AI Processing Indicator ── */
    .loading-row {
      margin-top: 4px;
      animation: fadeInUp 300ms ease;
    }

    .glowing-dot-pulse {
      animation: pulseGlow 2s ease-in-out infinite;
    }

    @keyframes pulseGlow {
      0%, 100% {
        box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
        border-color: rgba(16, 185, 129, 0.3);
      }
      50% {
        box-shadow: 0 0 18px rgba(16, 185, 129, 0.8);
        border-color: rgba(16, 185, 129, 0.6);
      }
    }

    .loading-status-card {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 10px 18px;
      border-radius: 14px;
      background: var(--response-card-bg, var(--new-chat-bg));
      border: 1px solid var(--response-card-border, var(--new-chat-border));
      backdrop-filter: blur(16px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }

    .loading-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .loading-status-text {
      font-size: 0.88rem;
      font-weight: 500;
      color: var(--headline-color, #e2e8f0);
      letter-spacing: -0.01em;
      transition: opacity 0.3s ease;
    }

    .loading-typing-dots {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .loading-typing-dots .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #34d399;
      opacity: 0.4;
      animation: dotPulse 1.4s infinite ease-in-out;
    }

    .loading-typing-dots .dot:nth-child(1) { animation-delay: 0s; }
    .loading-typing-dots .dot:nth-child(2) { animation-delay: 0.2s; }
    .loading-typing-dots .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes dotPulse {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.3; }
      40% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 6px #34d399; }
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
export class ChatThreadViewComponent implements OnDestroy {
  readonly chatService = inject(ChatService);
  readonly markdownFormatter = inject(MarkdownFormatterService);
  inputText = '';

  private readonly loadingSteps = [
    'Processing your request...',
    'Understanding your request...',
    'Analyzing the information...',
    'Preparing your response...',
  ];

  readonly currentStepIndex = signal(0);
  readonly currentLoadingStatus = computed(() => this.loadingSteps[this.currentStepIndex()]);
  private loadingInterval: any = null;

  constructor() {
    effect(() => {
      if (this.chatService.isAwaitingBackend()) {
        this.startLoadingRotation();
      } else {
        this.stopLoadingRotation();
      }
    });
  }

  private startLoadingRotation(): void {
    this.currentStepIndex.set(0);
    this.stopLoadingRotation();
    this.loadingInterval = setInterval(() => {
      this.currentStepIndex.update((idx) => (idx + 1) % this.loadingSteps.length);
    }, 2200);
  }

  private stopLoadingRotation(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.stopLoadingRotation();
  }

  readonly copiedMessageId = signal<string | null>(null);

  copyResponseText(text: string, msgId: string): void {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.setCopiedState(msgId);
      }).catch(() => {
        this.fallbackCopyText(text, msgId);
      });
    } else {
      this.fallbackCopyText(text, msgId);
    }
  }

  private fallbackCopyText(text: string, msgId: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.setCopiedState(msgId);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  private setCopiedState(msgId: string): void {
    this.copiedMessageId.set(msgId);
    setTimeout(() => {
      if (this.copiedMessageId() === msgId) {
        this.copiedMessageId.set(null);
      }
    }, 1800);
  }

  getAgentLabel(agent?: string): string {
    if (!agent) return '';
    if (agent.startsWith('Generated by')) return agent;
    return `Generated by: ${agent}`;
  }

  onSend(): void {
    if (!this.inputText.trim()) return;
    this.chatService.sendUserMessage(this.inputText);
    this.inputText = '';
  }
}


