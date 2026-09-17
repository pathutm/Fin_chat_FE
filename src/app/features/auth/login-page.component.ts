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
          <div class="gem-logo">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-name">FinAI</span>
          </div>
        </div>

        <h1 class="login-title">Welcome to FinAI</h1>
        <p class="login-subtitle">Your intelligent financial assistant</p>

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
          <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
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
          <span class="divider-text">OR</span>
          <span class="divider-line"></span>
        </div>

        <!-- Email/Password Form -->
        <form (ngSubmit)="onEmailSignIn()" class="login-form">
          <div class="form-group">
            <label for="email-input">Email</label>
            <input
              id="email-input"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="Enter your email"
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
                placeholder="Enter your password"
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
                  <!-- Eye Off Icon -->
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                } @else {
                  <!-- Eye Icon -->
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
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
              <span>Signing In…</span>
            } @else {
              <span>Sign In</span>
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
      background: var(--bg-app, #090d16);
      font-family: inherit;
      padding: 20px;
      box-sizing: border-box;
    }

    .login-card {
      background: var(--topbar-bg, rgba(22, 30, 46, 0.85));
      border: 1px solid var(--topbar-border, rgba(255, 255, 255, 0.1));
      backdrop-filter: blur(24px);
      border-radius: 20px;
      padding: 40px 36px;
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
      box-sizing: border-box;
    }

    .brand-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .gem-logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: radial-gradient(circle at 35% 30%, #34d399, #059669);
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #022c22;
    }

    .brand-name {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--headline-color, #ffffff);
      letter-spacing: -0.02em;
    }

    .login-title {
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--headline-color, #ffffff);
      margin: 0 0 6px 0;
      text-align: center;
    }

    .login-subtitle {
      font-size: 0.88rem;
      color: var(--text-secondary, #94a3b8);
      margin: 0 0 20px 0;
      text-align: center;
    }

    /* ── Banners ── */
    .alert {
      width: 100%;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.84rem;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      box-sizing: border-box;
    }

    .alert-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    .alert-success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #6ee7b7;
    }

    .google-login-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 12px 20px;
      background: #ffffff;
      color: #1f2937;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .google-login-btn:hover:not(:disabled) {
      background: #f9fafb;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
    }

    .google-login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .google-icon {
      flex-shrink: 0;
    }

    /* ── Divider ── */
    .divider {
      display: flex;
      align-items: center;
      width: 100%;
      margin: 22px 0;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: var(--topbar-border, rgba(255, 255, 255, 0.12));
    }

    .divider-text {
      padding: 0 14px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary, #64748b);
      letter-spacing: 0.05em;
    }

    /* ── Form Controls ── */
    .login-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: left;
    }

    .form-group label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--headline-color, #e2e8f0);
    }

    .form-group input {
      width: 100%;
      padding: 11px 14px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--topbar-border, rgba(255, 255, 255, 0.12));
      border-radius: 10px;
      color: var(--headline-color, #ffffff);
      font-size: 0.92rem;
      outline: none;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-group input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }

    .password-wrapper {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
    }

    .password-wrapper input {
      padding-right: 42px;
    }

    .toggle-password-btn {
      position: absolute;
      right: 10px;
      background: transparent;
      border: none;
      color: var(--text-secondary, #94a3b8);
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: color 0.2s ease;
    }

    .toggle-password-btn:hover {
      color: var(--headline-color, #ffffff);
    }

    .forgot-password-container {
      display: flex;
      justify-content: flex-end;
      margin-top: -6px;
    }

    .submit-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
      margin-top: 4px;
    }

    .submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #34d399, #10b981);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.4);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .link-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary, #94a3b8);
      font-size: 0.82rem;
      cursor: pointer;
      padding: 0;
      transition: color 0.2s ease;
    }

    .link-btn:hover:not(:disabled) {
      color: var(--headline-color, #ffffff);
      text-decoration: underline;
    }

    .link-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .link-btn.highlight {
      color: #10b981;
      font-weight: 600;
      margin-left: 6px;
    }

    .link-btn.highlight:hover:not(:disabled) {
      color: #34d399;
    }

    .signup-prompt {
      margin-top: 24px;
      font-size: 0.85rem;
      color: var(--text-secondary, #94a3b8);
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
