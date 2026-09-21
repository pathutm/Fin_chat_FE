import { Component, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat.service';
import { MarkdownFormatterService } from '../../../core/utils/markdown-formatter.util';
import { TrendChartComponent } from '../chat-message/trend-chart.component';
import { parseTrendData, TrendSeries } from '../../../core/utils/trend-parser.util';

@Component({
  selector: 'app-chat-thread-view',
  standalone: true,
  imports: [CommonModule, FormsModule, TrendChartComponent],
  template: `
    <div class="thread-container">
      <!-- Header Bar -->
      <div class="thread-header">
        <button class="header-action-btn" (click)="chatService.setView('home')" title="Back to Home">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Home</span>
        </button>

        <div class="session-pill">
          <span class="live-pulse-dot"></span>
          <span class="session-title">Active Analytics Session</span>
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
          <!-- Clean Empty State -->
          <div class="empty-thread-state">
            <div class="empty-icon-box">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 class="empty-title">CFO Conversational Analytics</h3>
            <p class="empty-desc">Ask questions about invoices, vendor spending, working capital metrics, or trend analysis.</p>
          </div>
        } @else {
          @for (msg of chatService.messages(); track msg.id) {
            @if (msg.role === 'user') {
              <!-- User Message -->
              <div class="message-row user-row">
                <div class="user-bubble" [class.deleted-user-bubble]="msg.deleted">
                  @if (msg.deleted) {
                    <div class="deleted-msg-card">
                      <div class="deleted-msg-header">
                        <span>🗑️</span>
                        <span>Message deleted</span>
                      </div>
                      <div class="deleted-msg-body">
                        This message was removed because it contained personal or sensitive information.
                      </div>
                      <div class="deleted-msg-footer">
                        Please do not share personal or private information in this chat.
                      </div>
                    </div>
                  } @else {
                    {{ msg.content }}
                  }
                </div>
              </div>
            } @else {
              <!-- AI Assistant Response Container -->
              <div class="message-row assistant-row">
                <div class="assistant-content">
                  <div class="assistant-card-container">
                    <!-- Header -->
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
                        [class.copied]="copiedMessageId() === msg.id"
                        (click)="copyResponseText(msg.content, msg.id)"
                        title="Copy response to clipboard"
                      >
                        @if (copiedMessageId() === msg.id) {
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

                    <!-- Markdown Content -->
                    <div class="assistant-markdown-content" [innerHTML]="markdownFormatter.formatMarkdown(msg.content)"></div>

                    <!-- Graphical Trend Visualization -->
                    @if (getTrendSeries(msg.content); as trend) {
                      <app-trend-chart [trendData]="trend" [userQuery]="getUserQueryForMessage(msg.id)" />
                    }

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

          <!-- Subtle Enterprise Loading State -->
          @if (chatService.isAwaitingBackend()) {
            <div class="message-row assistant-row loading-row">
              <div class="loading-status-card">
                <div class="loading-spinner"></div>
                <span class="loading-status-text">{{ currentLoadingStatus() }}</span>
              </div>
            </div>
          }
        }
      </div>

      <!-- Composer Bar -->
      <div class="composer-outer">
        <div class="thread-composer-box">
          <input
            type="text"
            class="thread-input"
            placeholder="Ask a follow-up question or request trend analysis..."
            [(ngModel)]="inputText"
            (keydown.enter)="onSend()"
            autofocus
          />

          <button
            class="send-btn"
            [disabled]="!inputText.trim()"
            (click)="onSend()"
            title="Send message"
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .thread-container {
      width: 100%;
      height: 100%;
      min-height: calc(100vh - 68px);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 24px 20px;
      overflow: hidden;
      background: var(--bg-app);
    }

    /* ── Header ── */
    .thread-header {
      width: 100%;
      max-width: 820px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 8px;
    }

    .header-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.15s ease;

      &:hover {
        background: var(--secondary-surface);
        color: var(--foreground);
      }

      &.clear-btn:hover {
        color: var(--color-destructive);
        border-color: oklch(0.55 0.22 25 / 0.3);
      }
    }

    .session-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 14px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-pill);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .live-pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-success);
    }

    .session-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--foreground);
    }

    .model-tag {
      font-size: 0.72rem;
      color: var(--muted-text);
      background: var(--secondary-surface);
      padding: 2px 7px;
      border-radius: var(--radius-pill);
      font-family: var(--font-mono);
    }

    /* ── Message Stream ── */
    .messages-stream {
      flex: 1;
      width: 100%;
      max-width: 820px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 4px 6px 16px;
    }

    /* ── Empty State ── */
    .empty-thread-state {
      margin: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 30px 20px;
    }

    .empty-icon-box {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-base);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-accent);
      margin-bottom: 14px;
    }

    .empty-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--foreground);
      margin-bottom: 6px;
    }

    .empty-desc {
      font-size: 0.88rem;
      color: var(--muted-text);
      max-width: 440px;
      line-height: 1.5;
    }

    .message-row {
      display: flex;
      width: 100%;
      animation: fadeInUp 250ms ease both;
    }

    /* ── User Bubble ── */
    .user-row {
      justify-content: flex-end;
    }

    .user-bubble {
      max-width: 78%;
      padding: 10px 16px;
      border-radius: var(--radius-card);
      border-bottom-right-radius: 2px;
      background: var(--primary-accent);
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 500;
      line-height: 1.5;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      word-break: break-word;
      white-space: pre-wrap;

      &.deleted-user-bubble {
        background: var(--card-surface, #ffffff);
        border: 1px solid oklch(0.6 0.18 25 / 0.35);
        color: var(--foreground, #1f2937);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        padding: 12px 16px;
      }
    }

    .deleted-msg-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .deleted-msg-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 0.92rem;
      color: oklch(0.55 0.22 25);
    }

    .deleted-msg-body {
      font-size: 0.88rem;
      color: var(--foreground, #374151);
      line-height: 1.45;
    }

    .deleted-msg-footer {
      font-size: 0.84rem;
      color: var(--muted-text, #6b7280);
      line-height: 1.4;
    }

    /* ── Assistant Response Container (oklch(1 0 0) white surface) ── */
    .assistant-row {
      justify-content: flex-start;
      align-items: flex-start;
    }

    .assistant-content {
      width: 100%;
    }

    .assistant-card-container {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
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

    .assistant-agent-meta {
      display: inline-block;
      font-size: 0.72rem;
      color: var(--muted-text);
    }

    /* ── Assistant Markdown Presentation ── */
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
        color: var(--foreground);
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

      /* Clean Financial Tables */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-base);
        font-size: 0.86rem;

        th {
          background: var(--secondary-surface);
          color: var(--text-secondary);
          font-weight: 600;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          text-align: left;
        }

        td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          color: var(--foreground);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover td {
          background: oklch(0.985 0.003 260);
        }
      }
    }

    /* ── Subtle Enterprise Loading ── */
    .loading-row {
      margin-top: 2px;
    }

    .loading-status-card {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      border-radius: var(--radius-base);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .loading-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid var(--border-color);
      border-top-color: var(--primary-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-status-text {
      font-size: 0.82rem;
      font-weight: 500;
      color: var(--muted-text);
    }

    /* ── Floating Capsule Composer ── */
    .composer-outer {
      width: 100%;
      max-width: 820px;
      padding-top: 8px;
    }

    .thread-composer-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px 6px 16px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      box-shadow: var(--composer-shadow);
      transition: all 0.15s ease;

      &:focus-within {
        border-color: var(--primary-accent);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05), 0 0 0 1px var(--primary-accent);
      }
    }

    .thread-input {
      flex: 1;
      font-size: 0.92rem;
      color: var(--foreground);

      &::placeholder {
        color: var(--muted-text);
      }
    }

    .send-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-base);
      background: var(--primary-accent);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        opacity: 0.92;
      }

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }
  `],
})
export class ChatThreadViewComponent implements OnDestroy {
  readonly chatService = inject(ChatService);
  readonly markdownFormatter = inject(MarkdownFormatterService);
  inputText = '';

  private readonly loadingSteps = [
    'Analyzing financial data...',
    'Evaluating working capital metrics...',
    'Generating analytics response...',
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
    }, 2500);
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

  getTrendSeries(content?: string): TrendSeries | null {
    if (!content) return null;
    return parseTrendData(content);
  }

  getUserQueryForMessage(msgId: string): string {
    const msgs = this.chatService.messages();
    const idx = msgs.findIndex((m) => m.id === msgId);
    if (idx <= 0) return '';
    for (let i = idx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user' && !msgs[i].deleted) {
        return msgs[i].content || '';
      }
    }
    return '';
  }

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
