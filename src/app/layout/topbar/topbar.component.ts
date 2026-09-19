import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../core/utils/avatar.util';
import { SNS_SQUARE_LOGO } from '../../core/constants/assets';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="desktop-topbar">
      <!-- Left: Company Logo & CFO Conversational Analytics Brand -->
      <div class="org-logo-container" title="SNS Square — Redesigning Business">
        <img [src]="logoUrl" alt="SNS Square Logo" class="org-logo-img" />
      </div>

      <div class="brand-group" (click)="chatService.setView('home')">
        <div class="brand-icon-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M3 3v18h18" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18 9l-5 5-4-4-3 3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="brand-text">
          <span class="brand-name">CFO Conversational Analytics</span>
        </div>
      </div>

      <!-- Center: View Switcher Tabs (Home & Chat Session) -->
      <nav class="view-tabs" aria-label="Main Views">
        <button
          class="tab-btn"
          [class.active]="chatService.currentView() === 'home'"
          (click)="chatService.setView('home')"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>

        <button
          class="tab-btn"
          [class.active]="chatService.currentView() === 'chat'"
          (click)="chatService.setView('chat')"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Chat Session</span>
        </button>
      </nav>

      <!-- Right: Model Pill & User Profile -->
      <div class="topbar-right">
        <!-- Model Pill -->
        <div class="model-badge">
          <span>{{ chatService.selectedModel() }}</span>
        </div>

        <!-- User Profile Area -->
        @if (authService.currentUser()) {
          <div class="user-profile-area">
            <div class="user-avatar-container" [innerHTML]="avatarService.getSanitizedAvatar(authService.currentUser()?.id)"></div>
            <div class="user-info">
              <span class="user-name">{{ getUserDisplayName() }}</span>
            </div>
            <button class="logout-btn" (click)="authService.logout()" title="Logout">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        }
      </div>
    </header>
  `,
  styles: [`
    .desktop-topbar {
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      background: var(--card-surface);
      border-bottom: 1px solid var(--border-color);
      position: relative;
      z-index: 100;
    }

    /* ── Brand ── */
    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }

    .brand-icon-box {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-base);
      background: var(--primary-accent);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .brand-text {
      display: flex;
      align-items: center;
    }

    .brand-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--foreground);
      letter-spacing: -0.02em;
    }

    /* ── View Switcher Tabs ── */
    .view-tabs {
      display: flex;
      align-items: center;
      gap: 3px;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      padding: 3px;
      border-radius: var(--radius-pill);
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: var(--radius-pill);
      font-size: 0.84rem;
      font-weight: 500;
      color: var(--muted-text);
      transition: all 0.15s ease;

      &:hover {
        color: var(--foreground);
      }

      &.active {
        color: #ffffff;
        background: var(--primary-accent);
        font-weight: 600;
      }
    }

    /* ── Right Controls ── */
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .model-badge {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--muted-text);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      font-family: var(--font-mono);
    }

    /* ── Exact Company Logo in Top-Right ── */
    .org-logo-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3px 12px;
      border-radius: var(--radius-base);
      background: #ffffff;
      border: 1px solid var(--border-color);
      height: 52px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .org-logo-img {
      height: 46px;
      width: auto;
      max-width: 220px;
      object-fit: contain;
      display: block;
    }

    /* ── User Profile Area ── */
    .user-profile-area {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 12px;
      border-left: 1px solid var(--border-color);
    }

    .user-avatar-container {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 50%;
      overflow: hidden;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
    }

    .user-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--foreground);
    }

    .logout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-base);
      color: var(--muted-text);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: oklch(0.955 0.006 260);
        color: var(--color-destructive);
      }
    }

    @media (max-width: 900px) {
      .user-info {
        display: none;
      }
    }
  `],
})
export class TopbarComponent {
  readonly chatService = inject(ChatService);
  readonly authService = inject(AuthService);
  readonly avatarService = inject(AvatarService);
  readonly logoUrl = SNS_SQUARE_LOGO;

  getUserDisplayName(): string {
    const custom = this.authService.displayName();
    if (custom && custom.trim()) return custom.trim();

    const user = this.authService.currentUser();
    if (!user) return 'User';

    if (user.displayName && !user.displayName.includes('@')) {
      return user.displayName;
    }

    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  }
}
