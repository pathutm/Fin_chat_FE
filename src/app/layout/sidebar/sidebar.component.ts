import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar" [class.collapsed]="isCollapsed()">
      <!-- Header -->
      <div class="sidebar-header">
        <div class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 3v18h18" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18 9l-5 5-4-4-3 3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          @if (!isCollapsed()) {
            <span class="brand-name">CFO Analytics</span>
          }
        </div>
        <button class="collapse-btn" (click)="toggleCollapse()" [attr.aria-label]="isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            @if (isCollapsed()) {
              <polyline points="9 18 15 12 9 6"></polyline>
            } @else {
              <polyline points="15 18 9 12 15 6"></polyline>
            }
          </svg>
        </button>
      </div>

      <!-- New Chat Button -->
      <div class="sidebar-section">
        <button class="new-chat-btn" (click)="onNewChat()" id="new-chat-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          @if (!isCollapsed()) {
            <span>New Chat</span>
          }
        </button>
      </div>

      <!-- Conversations List -->
      @if (!isCollapsed()) {
        <div class="sidebar-section conversations">
          <div class="section-label">Chat History</div>
          <div class="conv-list">
            @for (conv of chatService.conversations(); track conv.id) {
              <div
                class="conv-item"
                [class.active]="conv.id === chatService.activeConversationId()"
                (click)="chatService.selectConversation(conv.id)"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
                </svg>
                <span class="conv-title">{{ conv.title }}</span>
                <button
                  class="delete-conv-btn"
                  (click)="onDeleteConversation($event, conv.id)"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            }
          </div>
        </div>
      }
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .sidebar {
      width: var(--sidebar-width);
      height: 100%;
      background: var(--bg-app);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease;
      overflow: hidden;

      &.collapsed {
        width: var(--sidebar-collapsed);
      }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 14px 12px;
      min-height: 56px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-base);
      background: var(--primary-accent);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-name {
      font-size: 0.94rem;
      font-weight: 700;
      color: var(--foreground);
      letter-spacing: -0.01em;
      white-space: nowrap;
    }

    .collapse-btn {
      width: 28px;
      height: 28px;
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

    .sidebar-section {
      padding: 0 10px;
      margin-bottom: 8px;
    }

    .new-chat-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 14px;
      border-radius: var(--radius-base);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--foreground);
      font-weight: 600;
      font-size: 0.84rem;
      transition: all 0.15s ease;

      &:hover {
        background: var(--secondary-surface);
        border-color: oklch(0.8 0.015 260);
      }
    }

    .collapsed .new-chat-btn {
      padding: 9px;
    }

    .conversations {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .section-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted-text);
      padding: 10px 10px 6px;
    }

    .conv-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .conv-item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: var(--radius-base);
      color: var(--text-secondary);
      font-size: 0.82rem;
      transition: all 0.15s ease;
      text-align: left;
      border: 1px solid transparent;
      cursor: pointer;

      svg {
        flex-shrink: 0;
        opacity: 0.7;
      }

      &:hover {
        background: var(--secondary-surface);
        color: var(--foreground);

        .delete-conv-btn {
          opacity: 1;
        }
      }

      &.active {
        background: var(--secondary-surface);
        border-color: var(--border-color);
        color: var(--primary-accent);
        font-weight: 600;

        svg {
          opacity: 1;
          color: var(--primary-accent);
        }
      }
    }

    .conv-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .delete-conv-btn {
      opacity: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      color: var(--muted-text);
      transition: all 0.15s ease;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;

      &:hover {
        color: var(--color-destructive, #ef4444);
        background: oklch(0.955 0.006 260);
      }
    }
  `],
})
export class SidebarComponent {
  readonly chatService = inject(ChatService);
  readonly isCollapsed = signal(false);

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  onNewChat(): void {
    this.chatService.startNewConversation();
  }

  onDeleteConversation(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.chatService.deleteConversation(id);
  }
}
