import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { AvatarService } from '../../core/utils/avatar.util';
import { SNS_SQUARE_LOGO } from '../../core/constants/assets';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="desktop-topbar">
      <!-- Left: Emerald Brand Logo -->
      <div class="brand-group" (click)="chatService.setView('home')">
        <div class="gem-logo">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
          </svg>
        </div>
        <div class="brand-text">
          <span class="brand-name">FinAI</span>
          <span class="brand-badge">Desktop</span>
        </div>
      </div>

      <!-- Center: View Switcher Tabs (Home & Chat Session) -->
      <nav class="view-tabs">
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

      <!-- Right: Theme Toggle, Model Pill, Backend Status & User Profile -->
      <div class="topbar-right">
        <!-- Theme Toggle Button (Light/Dark Mode) -->
        <button
          class="theme-toggle-btn"
          (click)="themeService.toggleTheme()"
          [title]="themeService.isDark() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          @if (themeService.isDark()) {
            <!-- Sun Icon for switching to light -->
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
            <span class="theme-label">Light</span>
          } @else {
            <!-- Moon Icon for switching to dark -->
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span class="theme-label">Dark</span>
          }
        </button>

        <!-- Model Pill -->
        <div class="model-badge">
          <span>{{ chatService.selectedModel() }}</span>
        </div>

        <!-- Attached Organization Logo (SNS Square) -->
        <div class="org-logo-pill" title="SNS Square - Redesigning Business">
          <img [src]="logoUrl" alt="SNS Square Logo" class="org-logo-img" />
        </div>

        <!-- User Profile Area -->
        @if (authService.currentUser()) {
          <div class="user-profile-area">
            <div class="user-avatar-container" [innerHTML]="avatarService.getSanitizedAvatar(authService.currentUser()?.id)"></div>
            <div class="user-info">
              <span class="user-name">{{ getUserDisplayName() }}</span>
            </div>
            <button class="logout-btn" (click)="authService.logout()" title="Logout">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
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
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      background: var(--topbar-bg);
      border-bottom: 1px solid var(--topbar-border);
      backdrop-filter: blur(20px);
      position: relative;
      z-index: 100;
      transition: background-color 0.3s ease, border-color 0.3s ease;
    }

    /* ── Brand ── */
    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }

    .gem-logo {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: radial-gradient(circle at 35% 30%, #34d399, #059669);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #022c22;
    }

    .brand-text {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .brand-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--headline-color);
      letter-spacing: -0.02em;
    }

    .brand-badge {
      font-size: 0.72rem;
      font-weight: 600;
      color: #059669;
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid rgba(16, 185, 129, 0.28);
      padding: 1px 6px;
      border-radius: 4px;
    }

    /* ── View Switcher Tabs ── */
    .view-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--topbar-tab-bg);
      border: 1px solid var(--topbar-tab-border);
      padding: 4px 6px;
      border-radius: 999px;
      transition: all 0.3s ease;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 0.84rem;
      font-weight: 500;
      color: var(--topbar-tab-text);
      transition: all 0.2s ease;

      &:hover {
        color: var(--headline-color);
        background: rgba(16, 185, 129, 0.1);
      }

      &.active {
        color: var(--topbar-tab-active-text);
        background: var(--topbar-tab-active-bg);
        border: 1px solid var(--topbar-tab-active-border);
        box-shadow: 0 0 14px rgba(16, 185, 129, 0.25);
      }
    }

    /* ── Right Controls ── */
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* ── Theme Toggle Button ── */
    .theme-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: var(--pill-bg);
      border: 1px solid var(--pill-border);
      color: var(--text-primary);
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(16, 185, 129, 0.15);
        border-color: rgba(16, 185, 129, 0.4);
        transform: translateY(-1px);
      }
    }

    .theme-label {
      text-transform: capitalize;
    }

    .model-badge {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-primary);
      background: var(--tool-btn-bg);
      border: 1px solid var(--tool-btn-border);
      padding: 4px 10px;
      border-radius: 999px;
    }

    .org-logo-pill {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3px 10px;
      border-radius: 999px;
      background: #ffffff;
      border: 1px solid rgba(16, 185, 129, 0.35);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      height: 32px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28);
        border-color: #10b981;
      }
    }

    .org-logo-img {
      height: 22px;
      width: auto;
      object-fit: contain;
      display: block;
    }

    /* ── User Profile Area ── */
    .user-profile-area {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 12px;
      margin-left: 4px;
      border-left: 1px solid var(--topbar-border);
    }

    .user-avatar-container {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--headline-color);
    }

    .logout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.2);
    }

    @media (max-width: 900px) {
      .brand-badge, .user-info {
        display: none;
      }
    }
  `],
})
export class TopbarComponent {
  readonly chatService = inject(ChatService);
  readonly themeService = inject(ThemeService);
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

