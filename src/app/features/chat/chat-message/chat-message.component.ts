import { Component, input, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../../../core/models/chat.model';
import { MarkdownFormatterService } from '../../../core/utils/markdown-formatter.util';
import { TrendChartComponent } from './trend-chart.component';
import { parseTrendData, TrendSeries } from '../../../core/utils/trend-parser.util';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule, TrendChartComponent],
  template: `
    <div class="message-row" [class.user]="message().role === 'user'" [class.assistant]="message().role === 'assistant'">
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
                  <div class="ai-avatar-badge">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M3 3v18h18"/>
                      <path d="M18 9l-5 5-4-4-3 3"/>
                    </svg>
                  </div>
                  <span class="card-title">CFO Conversational Analytics</span>
                </div>
                <button
                  class="copy-btn"
                  [class.copied]="isCopied()"
                  (click)="copyResponseText(message().content)"
                  title="Copy response to clipboard"
                >
                  @if (isCopied()) {
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
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

              @if (trendData(); as trend) {
                <app-trend-chart [trendData]="trend" [userQuery]="userQuery()" />
              }

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
      max-width: 100%;
      animation: fadeInUp 250ms ease;

      &.user {
        margin-left: auto;
        justify-content: flex-end;
      }

      &.assistant {
        margin-right: auto;
        width: 100%;
      }
    }

    .message-bubble {
      padding: 10px 16px;
      border-radius: var(--radius-card);
      line-height: 1.5;
      font-size: 0.9rem;

      .user & {
        background: var(--primary-accent);
        color: #ffffff;
        border-bottom-right-radius: 2px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        max-width: 78%;
      }

      &.assistant-bubble {
        padding: 0;
        background: transparent;
        border: none;
        width: 100%;
      }

      &.typing {
        padding: 12px 18px;
        background: var(--card-surface);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-card);
      }
    }

    .message-text {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* ── Assistant Response Container ── */
    .assistant-card-container {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      width: 100%;
    }

    .assistant-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }

    .card-title-group {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .ai-avatar-badge {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      background: var(--primary-accent);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .card-title {
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--foreground);
      letter-spacing: -0.01em;
    }

    .copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      color: var(--muted-text);
      font-size: 0.74rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        color: var(--foreground);
        border-color: oklch(0.8 0.015 260);
      }

      &.copied {
        color: var(--color-success);
        border-color: var(--color-success);
      }
    }

    .assistant-card-footer {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed var(--border-color);
    }

    ::ng-deep .assistant-markdown-content {
      color: var(--foreground);
      font-size: 0.92rem;
      line-height: 1.6;

      p {
        margin: 0 0 10px 0;
        &:last-child { margin-bottom: 0; }
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 14px 0 8px 0;
        font-weight: 700;
        color: var(--foreground);
        letter-spacing: -0.01em;
        &:first-child { margin-top: 0; }
      }

      h1, h2, h3 {
        font-size: 1.05rem;
      }

      h4, h5, h6 {
        font-size: 0.95rem;
      }

      ul, ol {
        margin: 8px 0 12px 0;
        padding-left: 20px;
      }

      li {
        margin-bottom: 4px;
        &:last-child { margin-bottom: 0; }
      }

      pre {
        background: var(--secondary-surface);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-base);
        padding: 12px 14px;
        margin: 12px 0;
        overflow-x: auto;
        font-family: var(--font-mono);
        font-size: 0.85rem;
        color: var(--foreground);

        code {
          background: transparent;
          padding: 0;
          border-radius: 0;
          color: inherit;
          font-family: inherit;
        }
      }

      code {
        background: var(--secondary-surface);
        color: var(--primary-accent);
        border: 1px solid var(--border-color);
        padding: 2px 5px;
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 0.85rem;
      }

      blockquote {
        border-left: 3px solid var(--primary-accent);
        margin: 10px 0;
        padding: 6px 0 6px 12px;
        color: var(--muted-text);
        background: var(--secondary-surface);
        border-radius: 0 4px 4px 0;
      }

      hr {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 14px 0;
      }
    }

    .assistant-agent-meta {
      display: inline-block;
      font-size: 0.72rem;
      color: var(--muted-text);
    }

    .typing-dots {
      display: flex;
      align-items: center;
      gap: 5px;
      height: 16px;
    }

    .dot {
      width: 6px;
      height: 6px;
      background: var(--primary-accent);
      border-radius: 50%;
      animation: typingDot 1.2s ease-in-out infinite;

      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }

    @keyframes typingDot {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
      40% { opacity: 1; transform: scale(1.15); }
    }
  `],
})
export class ChatMessageComponent {
  readonly message = input.required<ChatMessage>();
  readonly userQuery = input<string>('');
  readonly markdownFormatter = inject(MarkdownFormatterService);
  readonly isCopied = signal(false);

  readonly trendData = computed<TrendSeries | null>(() => {
    const msg = this.message();
    if (msg.role !== 'assistant' || !msg.content || msg.isTyping) return null;
    return parseTrendData(msg.content, this.userQuery());
  });

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
