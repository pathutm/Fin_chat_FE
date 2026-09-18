import { Component, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../core/models/chat.model';
import { MarkdownFormatterService } from '../../../core/utils/markdown-formatter.util';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="message-row" [class.user]="message().role === 'user'" [class.assistant]="message().role === 'assistant'">
      @if (message().role === 'assistant') {
        <div class="bot-avatar">
          <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
            <defs>
              <linearGradient id="msgLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#34d399"/>
                <stop offset="100%" stop-color="#059669"/>
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="14" stroke="url(#msgLogoGrad)" stroke-width="2" fill="none"/>
            <path d="M10 20 L14 12 L18 17 L22 10" stroke="url(#msgLogoGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
      }
      <div class="message-bubble" [class.typing]="message().isTyping" [class.assistant-bubble]="message().role === 'assistant'">
        @if (message().isTyping) {
          <div class="typing-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        } @else {
          @if (message().role === 'assistant') {
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
                  [class.copied]="isCopied()"
                  (click)="copyResponseText(message().content)"
                  title="Copy response to clipboard"
                >
                  @if (isCopied()) {
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
              <div class="assistant-markdown-content" [innerHTML]="markdownFormatter.formatMarkdown(message().content)"></div>

              @if (message().agent) {
                <div class="assistant-card-footer">
                  <span class="assistant-agent-meta">{{ getAgentLabel(message().agent) }}</span>
                </div>
              }
            </div>
          } @else {
            <p class="message-text">{{ message().content }}</p>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .message-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      max-width: 88%;
      animation: fadeInUp 300ms ease;

      &.user {
        margin-left: auto;
        flex-direction: row-reverse;
      }

      &.assistant {
        margin-right: auto;
      }
    }

    .bot-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 4px;
    }

    .message-bubble {
      padding: 14px 18px;
      border-radius: var(--radius-lg);
      line-height: 1.6;
      font-size: 0.9rem;

      .user & {
        background: linear-gradient(135deg, var(--emerald-600), var(--emerald-700));
        color: var(--emerald-50);
        border-bottom-right-radius: 4px;
        box-shadow: 0 2px 12px rgba(16, 185, 129, 0.2);
      }

      &.assistant-bubble {
        padding: 0;
        background: transparent;
        border: none;
      }

      &.typing {
        padding: 18px 24px;
        background: var(--surface-elevated);
        border: 1px solid var(--surface-border-subtle);
      }
    }

    .message-text {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
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

    ::ng-deep .assistant-markdown-content {
      color: var(--text-primary);
      font-size: 0.93rem;
      line-height: 1.6;

      p {
        margin: 0 0 10px 0;
        color: var(--text-primary);
        &:last-child { margin-bottom: 0; }
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 14px 0 8px 0;
        font-weight: 600;
        color: var(--headline-color);
        &:first-child { margin-top: 0; }
      }

      h1, h2, h3 {
        color: var(--response-header-title, #34d399);
      }

      ul, ol {
        margin: 6px 0 10px 0;
        padding-left: 20px;
        color: var(--text-primary);
      }

      li {
        margin-bottom: 4px;
        color: var(--text-primary);
        &:last-child { margin-bottom: 0; }
      }

      pre {
        background: var(--code-block-bg, rgba(15, 23, 42, 0.6));
        border: 1px solid var(--code-block-border, rgba(16, 185, 129, 0.2));
        border-radius: 8px;
        padding: 10px 14px;
        margin: 10px 0;
        overflow-x: auto;
        font-family: monospace;
        font-size: 0.85rem;
        color: var(--code-block-text, #e2e8f0);
      }

      code {
        background: var(--inline-code-bg, rgba(16, 185, 129, 0.12));
        color: var(--inline-code-text, #34d399);
        border: 1px solid var(--inline-code-border, rgba(16, 185, 129, 0.2));
        padding: 2px 5px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.85rem;
      }
    }

    .assistant-agent-meta {
      display: inline-block;
      margin-top: 6px;
      font-size: 0.74rem;
      color: var(--text-muted);
    }

    .typing-dots {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 16px;
    }

    .dot {
      width: 7px;
      height: 7px;
      background: var(--emerald-400);
      border-radius: 50%;
      animation: typingDot 1.4s ease-in-out infinite;

      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  `],
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessage>();
  readonly markdownFormatter = inject(MarkdownFormatterService);
  readonly isCopied = signal(false);

  copyResponseText(text: string): void {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.setCopiedState();
      }).catch(() => {
        this.fallbackCopyText(text);
      });
    } else {
      this.fallbackCopyText(text);
    }
  }

  private fallbackCopyText(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.setCopiedState();
    } finally {
      document.body.removeChild(textarea);
    }
  }

  private setCopiedState(): void {
    this.isCopied.set(true);
    setTimeout(() => {
      this.isCopied.set(false);
    }, 1800);
  }

  getAgentLabel(agent?: string): string {
    if (!agent) return '';
    if (agent.startsWith('Generated by')) return agent;
    return `Generated by: ${agent}`;
  }
}


