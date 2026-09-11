import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar" [class.collapsed]="isCollapsed()">
      <!-- Logo / Brand -->
      <div class="sidebar-header">
        <div class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#34d399"/>
                  <stop offset="100%" stop-color="#059669"/>
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="14" stroke="url(#logoGrad)" stroke-width="2.5" fill="none"/>
              <path d="M10 20 L14 12 L18 17 L22 10" stroke="url(#logoGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <circle cx="22" cy="10" r="2" fill="#34d399"/>
            </svg>
          </div>
          @if (!isCollapsed()) {
            <span class="brand-name">FinChat</span>
          }
        </div>
        <button class="collapse-btn" (click)="toggleCollapse()" [attr.aria-label]="isCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <div class="section-label">Recent</div>
          <div class="conv-list">
            @for (conv of chatService.conversations(); track conv.id) {
              <button
                class="conv-item"
                [class.active]="conv.id === chatService.activeConversationId()"
                (click)="chatService.selectConversation(conv.id)"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
                </svg>
                <span class="conv-title">{{ conv.title }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Nav Links -->
      <div class="sidebar-nav">
        @for (item of navItems; track item.label) {
          <button class="nav-item" [class.active]="item.active">
            <span class="nav-icon" [innerHTML]="item.icon"></span>
            @if (!isCollapsed()) {
              <span class="nav-label">{{ item.label }}</span>
            }
          </button>
        }
      </div>
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
      background: var(--surface-card);
      border-right: 1px solid var(--surface-border-subtle);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-normal);
      overflow: hidden;

      &.collapsed {
        width: var(--sidebar-collapsed);
      }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 16px 16px;
      min-height: 64px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--emerald-300), var(--emerald-500));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
    }

    .collapse-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--text-tertiary);
      transition: all var(--transition-fast);
      flex-shrink: 0;

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
    }

    .sidebar-section {
      padding: 0 12px;
      margin-bottom: 8px;
    }

    .new-chat-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1));
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--emerald-400);
      font-weight: 500;
      font-size: 0.875rem;
      transition: all var(--transition-fast);

      &:hover {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.2));
        border-color: rgba(16, 185, 129, 0.4);
        box-shadow: var(--glow-sm);
      }
    }

    .collapsed .new-chat-btn {
      padding: 10px;
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
      letter-spacing: 0.08em;
      color: var(--text-tertiary);
      padding: 12px 12px 6px;
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
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.835rem;
      transition: all var(--transition-fast);
      text-align: left;

      svg {
        flex-shrink: 0;
        opacity: 0.5;
      }

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }

      &.active {
        background: rgba(16, 185, 129, 0.1);
        color: var(--emerald-400);

        svg { opacity: 1; }
      }
    }

    .conv-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-nav {
      margin-top: auto;
      padding: 12px;
      border-top: 1px solid var(--surface-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 0.835rem;
      transition: all var(--transition-fast);
      width: 100%;
      text-align: left;

      &:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }

      &.active {
        color: var(--emerald-400);
      }
    }

    .nav-icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      :host ::ng-deep svg {
        width: 18px;
        height: 18px;
      }
    }

    .nav-label {
      white-space: nowrap;
    }
  `],
})
export class SidebarComponent {
  readonly chatService = inject(ChatService);
  readonly isCollapsed = signal(false);

  readonly navItems = [
    {
      label: 'Markets',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
      active: false,
    },
    {
      label: 'Portfolio',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"></path></svg>',
      active: false,
    },
    {
      label: 'Watchlist',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
      active: false,
    },
    {
      label: 'Settings',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>',
      active: false,
    },
  ];

  toggleCollapse(): void {
    this.isCollapsed.update((v) => !v);
  }

  onNewChat(): void {
    this.chatService.startNewConversation();
  }
}
