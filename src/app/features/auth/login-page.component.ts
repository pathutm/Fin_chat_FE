import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-fullscreen-container">
      <div class="login-card">
        <!-- Brand Header -->
        <div class="brand-group">
          <div class="brand-icon-box">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 3v18h18" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18 9l-5 5-4-4-3 3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">CFO Conversational Analytics</span>
          </div>
        </div>

        <h1 class="login-title">Sign in to your account</h1>
        <p class="login-subtitle">Enterprise Working Capital Intelligence Platform</p>

        <!-- Error & Success Banners -->
        @if (errorMessage()) {
          <div class="alert alert-error">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (successMessage()) {
          <div class="alert alert-success">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{{ successMessage() }}</span>
          </div>
        }

        <!-- Google OAuth Button -->
        <button type="button" class="google-login-btn" (click)="onGoogleLogin()" [disabled]="isSubmitting()">
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <!-- Divider -->
        <div class="divider">
          <span class="divider-line"></span>
          <span class="divider-text">OR EMAIL</span>
          <span class="divider-line"></span>
        </div>

        <!-- Email/Password Form -->
        <form (ngSubmit)="onEmailSignIn()" class="login-form">
          <div class="form-group">
            <label for="email-input">Email address</label>
            <input
              id="email-input"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="name@company.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label for="password-input">Password</label>
            <div class="password-wrapper">
              <input
                id="password-input"
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter password"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="toggle-password-btn"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                @if (showPassword()) {
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
              </button>
            </div>
          </div>

          <div class="forgot-password-container">
            <button type="button" class="link-btn" (click)="onForgotPassword()">Forgot password?</button>
          </div>

          <button type="submit" class="submit-btn" [disabled]="isSubmitting()">
            @if (isSubmitting()) {
              <span>Signing in…</span>
            } @else {
              <span>Sign in</span>
            }
          </button>
        </form>

        <!-- Footer Supporting UI -->
        <div class="signup-prompt">
          <span>Don't have an account?</span>
          <button type="button" class="link-btn highlight" (click)="onSignUp()" [disabled]="isSubmitting()">Sign up</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-fullscreen-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100vw;
      background: var(--bg-app);
      padding: 24px;
      box-sizing: border-box;
    }

    .login-card {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 36px 32px;
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      box-sizing: border-box;
    }

    .brand-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .brand-icon-box {
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
      font-size: 0.96rem;
      font-weight: 700;
      color: var(--foreground);
      letter-spacing: -0.01em;
    }

    .login-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0 0 4px 0;
      text-align: center;
      letter-spacing: -0.01em;
    }

    .login-subtitle {
      font-size: 0.84rem;
      color: var(--muted-text);
      margin: 0 0 20px 0;
      text-align: center;
    }

    /* ── Banners ── */
    .alert {
      width: 100%;
      padding: 9px 12px;
      border-radius: var(--radius-base);
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      box-sizing: border-box;
    }

    .alert-error {
      background: oklch(0.55 0.22 25 / 0.1);
      border: 1px solid oklch(0.55 0.22 25 / 0.25);
      color: var(--color-destructive);
    }

    .alert-success {
      background: oklch(0.55 0.14 155 / 0.1);
      border: 1px solid oklch(0.55 0.14 155 / 0.25);
      color: var(--color-success);
    }

    .google-login-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 10px 16px;
      background: var(--card-surface);
      color: var(--foreground);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      box-sizing: border-box;

      &:hover:not(:disabled) {
        background: var(--secondary-surface);
        border-color: oklch(0.8 0.015 260);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .google-icon {
      flex-shrink: 0;
    }

    /* ── Divider ── */
    .divider {
      display: flex;
      align-items: center;
      width: 100%;
      margin: 18px 0;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: var(--border-color);
    }

    .divider-text {
      padding: 0 10px;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--muted-text);
      letter-spacing: 0.05em;
    }

    /* ── Form Controls ── */
    .login-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
    }

    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--foreground);
    }

    .form-group input {
      width: 100%;
      padding: 9px 12px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      color: var(--foreground);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.15s ease;
      box-sizing: border-box;

      &:focus {
        border-color: var(--primary-accent);
        box-shadow: 0 0 0 2px oklch(0.32 0.11 265 / 0.15);
      }
    }

    .password-wrapper {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }

    .password-wrapper input {
      padding-right: 36px;
    }

    .toggle-password-btn {
      position: absolute;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--muted-text);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      &:hover {
        color: var(--foreground);
      }
    }

    .forgot-password-container {
      display: flex;
      justify-content: flex-end;
      margin-top: -4px;
    }

    .submit-btn {
      width: 100%;
      padding: 10px;
      background: var(--primary-accent);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-base);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-top: 4px;

      &:hover:not(:disabled) {
        opacity: 0.92;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .link-btn {
      background: transparent;
      border: none;
      color: var(--muted-text);
      font-size: 0.8rem;
      cursor: pointer;
      padding: 0;
      transition: color 0.15s ease;

      &:hover:not(:disabled) {
        color: var(--foreground);
        text-decoration: underline;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &.highlight {
        color: var(--primary-accent);
        font-weight: 600;
        margin-left: 4px;

        &:hover:not(:disabled) {
          text-decoration: underline;
        }
      }
    }

    .signup-prompt {
      margin-top: 20px;
      font-size: 0.82rem;
      color: var(--muted-text);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `]
})
export class LoginPageComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isSubmitting = signal<boolean>(false);

  togglePasswordVisibility() {
    this.showPassword.update((val) => !val);
  }

  async onGoogleLogin() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    try {
      await this.authService.signInWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      this.errorMessage.set(err?.message || 'Google sign-in failed. Please try again.');
    }
  }

  async onEmailSignIn() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter both email and password.');
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    try {
      await this.authService.signInWithEmail(this.email, this.password);
      this.router.navigate(['/']);
    } catch (err: any) {
      console.error('Email sign-in error:', err);
      if (err?.message?.includes('Invalid login credentials')) {
        this.errorMessage.set('Invalid email or password.');
      } else {
        this.errorMessage.set(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async onForgotPassword() {
    if (!this.email) {
      this.errorMessage.set('Please enter your email address to reset password.');
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.authService.resetPassword(this.email);
      this.successMessage.set('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      console.error('Reset password error:', err);
      this.errorMessage.set(err?.message || 'Failed to send password reset email.');
    }
  }

  async onSignUp() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter both email and password to sign up.');
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    try {
      const data = await this.authService.signUp(this.email, this.password);
      if (data?.user && !data?.session) {
        this.successMessage.set('Account created! Please check your email inbox to confirm your account before logging in.');
      } else {
        this.router.navigate(['/']);
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      this.errorMessage.set(err?.message || 'Sign-up failed. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
