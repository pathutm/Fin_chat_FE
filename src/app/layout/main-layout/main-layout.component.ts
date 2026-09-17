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
          <!-- Gem icon -->
          <div class="onboarding-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
            </svg>
          </div>

          <h2 id="onboarding-title" class="onboarding-title">What can we call you?</h2>
          <p class="onboarding-subtitle">This name will appear in your chat session.</p>

          <input
            id="display-name-input"
            type="text"
            class="onboarding-input"
            [(ngModel)]="enteredName"
            placeholder="E.g. Tejaswi"
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
      height: calc(100vh - 60px);
      overflow: hidden;
    }

    .desktop-content {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      position: relative;
    }

    /* ── Onboarding overlay ── */
    .onboarding-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(9, 13, 22, 0.82);
      backdrop-filter: blur(8px);
      padding: 20px;
    }

    .onboarding-card {
      background: rgba(22, 30, 46, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      padding: 44px 40px 36px;
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.25s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .onboarding-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: radial-gradient(circle at 35% 30%, #34d399, #059669);
      box-shadow: 0 0 28px rgba(16, 185, 129, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #022c22;
      margin-bottom: 20px;
    }

    .onboarding-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 8px 0;
      text-align: center;
      letter-spacing: -0.02em;
    }

    .onboarding-subtitle {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0 0 24px 0;
      text-align: center;
    }

    .onboarding-input {
      width: 100%;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      color: #ffffff;
      font-size: 0.95rem;
      padding: 12px 16px;
      outline: none;
      transition: border-color 0.2s;
      margin-bottom: 8px;
    }

    .onboarding-input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }

    .onboarding-input::placeholder {
      color: #64748b;
    }

    .onboarding-error {
      font-size: 0.8rem;
      color: #f87171;
      margin: 0 0 12px 0;
      align-self: flex-start;
    }

    .onboarding-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      margin-top: 16px;
    }

    .onboarding-btn {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .onboarding-btn.primary {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #ffffff;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35);
    }

    .onboarding-btn.primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #34d399, #10b981);
      transform: translateY(-1px);
    }

    .onboarding-btn.primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .onboarding-btn.secondary {
      background: transparent;
      color: #64748b;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .onboarding-btn.secondary:hover:not(:disabled) {
      color: #94a3b8;
      border-color: rgba(255, 255, 255, 0.18);
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
    // Show the onboarding card if the authenticated user has no saved display_name yet
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
