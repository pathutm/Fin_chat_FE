import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent, CommonModule, FormsModule],
  template: `
    <div class="desktop-shell">
      <app-topbar />
      <div class="layout-body">
        <app-sidebar />
        <main class="desktop-content">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Onboarding Overlay: shown only when display_name has never been set -->
    @if (showOnboarding()) {
      <div class="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div class="onboarding-card">
          <div class="onboarding-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>

          <h2 id="onboarding-title" class="onboarding-title">What can we call you?</h2>
          <p class="onboarding-subtitle">This name will appear in your CFO Analytics session.</p>

          <input
            id="display-name-input"
            type="text"
            class="onboarding-input"
            [(ngModel)]="enteredName"
            placeholder="E.g. Financial Director"
            maxlength="60"
            (keydown.enter)="onSaveName()"
            autofocus
          />

          @if (onboardingError()) {
            <p class="onboarding-error">{{ onboardingError() }}</p>
          }

          <div class="onboarding-actions">
            <button
              id="onboarding-continue-btn"
              class="onboarding-btn primary"
              (click)="onSaveName()"
              [disabled]="isSaving()"
            >
              @if (isSaving()) { Saving… } @else { Continue }
            </button>
            <button
              id="onboarding-skip-btn"
              class="onboarding-btn secondary"
              (click)="onSkip()"
              [disabled]="isSaving()"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .desktop-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: var(--bg-app);
      position: relative;
    }

    .layout-body {
      display: flex;
      flex: 1;
      height: calc(100vh - 68px);
      overflow: hidden;
    }

    .desktop-content {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
      background: var(--bg-app);
    }

    /* ── Onboarding overlay ── */
    .onboarding-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      padding: 20px;
    }

    .onboarding-card {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 32px 30px;
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
      animation: fadeInScale 0.2s ease;
    }

    .onboarding-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-base);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      color: var(--primary-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .onboarding-title {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0 0 6px 0;
      text-align: center;
      letter-spacing: -0.01em;
    }

    .onboarding-subtitle {
      font-size: 0.84rem;
      color: var(--muted-text);
      margin: 0 0 20px 0;
      text-align: center;
    }

    .onboarding-input {
      width: 100%;
      box-sizing: border-box;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      color: var(--foreground);
      font-size: 0.92rem;
      padding: 10px 14px;
      outline: none;
      transition: border-color 0.15s;
      margin-bottom: 8px;
    }

    .onboarding-input:focus {
      border-color: var(--primary-accent);
      box-shadow: 0 0 0 2px oklch(0.32 0.11 265 / 0.15);
    }

    .onboarding-input::placeholder {
      color: var(--muted-text);
    }

    .onboarding-error {
      font-size: 0.8rem;
      color: var(--color-destructive);
      margin: 0 0 12px 0;
      align-self: flex-start;
    }

    .onboarding-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      margin-top: 12px;
    }

    .onboarding-btn {
      width: 100%;
      padding: 10px;
      border-radius: var(--radius-base);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }

    .onboarding-btn.primary {
      background: var(--primary-accent);
      color: #ffffff;
    }

    .onboarding-btn.primary:hover:not(:disabled) {
      opacity: 0.92;
    }

    .onboarding-btn.primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .onboarding-btn.secondary {
      background: transparent;
      color: var(--muted-text);
      border: 1px solid var(--border-color);
    }

    .onboarding-btn.secondary:hover:not(:disabled) {
      background: var(--secondary-surface);
      color: var(--foreground);
    }

    .onboarding-btn.secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class MainLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);

  showOnboarding = signal(false);
  enteredName = '';
  isSaving = signal(false);
  onboardingError = signal<string | null>(null);

  ngOnInit(): void {
    const displayName = this.authService.displayName();
    if (!displayName) {
      this.showOnboarding.set(true);
    }
  }

  async onSaveName(): Promise<void> {
    const name = this.enteredName.trim();
    if (!name) {
      this.onboardingError.set('Please enter a name, or click Skip.');
      return;
    }
    this.onboardingError.set(null);
    this.isSaving.set(true);
    const ok = await this.authService.saveDisplayName(name);
    this.isSaving.set(false);
    if (ok) {
      this.showOnboarding.set(false);
    } else {
      this.onboardingError.set('Could not save your name. Please try again.');
    }
  }

  onSkip(): void {
    this.showOnboarding.set(false);
  }
}
