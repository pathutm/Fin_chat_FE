import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  displayName: string;
  customDisplayName?: string | null;  // user-chosen name stored in metadata
  photoURL?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseKey
  );
  private readonly router = inject(Router);

  readonly currentUser = signal<User | null>(null);
  readonly isLoading = signal<boolean>(true);

  /** The user-chosen display name ("What can we call you?"). Null = not yet set. */
  readonly displayName = signal<string | null>(null);

  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initAuth();
  }

  private async initAuth(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      this.updateUserFromSession(session);
    } catch (e) {
      console.error('Error restoring Supabase session:', e);
    } finally {
      this.isLoading.set(false);
    }

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.updateUserFromSession(session);
      this.isLoading.set(false);
    });
  }

  /**
   * Helper to ensure auth state initialization completes before route guards evaluate.
   */
  async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  private updateUserFromSession(session: Session | null) {
    if (session?.user) {
      const metadata = session.user.user_metadata || {};
      const customDisplayName: string | null = metadata['display_name'] || null;
      this.currentUser.set({
        id: session.user.id,
        email: session.user.email || '',
        displayName:
          metadata['full_name'] ||
          metadata['name'] ||
          session.user.email?.split('@')[0] ||
          'User',
        customDisplayName,
        photoURL: metadata['avatar_url'] || metadata['picture'] || undefined,
      });
      this.displayName.set(customDisplayName);
    } else {
      this.currentUser.set(null);
      this.displayName.set(null);
    }
  }

  /**
   * Persist a user-chosen display name to Supabase Auth user_metadata.
   * Returns true on success, false on failure.
   */
  async saveDisplayName(name: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        data: { display_name: name.trim() }
      });
      if (error) {
        console.error('Failed to save display name:', error);
        return false;
      }
      this.displayName.set(name.trim());
      // Also update in-memory user object
      const user = this.currentUser();
      if (user) {
        this.currentUser.set({ ...user, customDisplayName: name.trim() });
      }
      return true;
    } catch (e) {
      console.error('Unexpected error saving display name:', e);
      return false;
    }
  }

  /**
   * Google OAuth sign-in via Supabase.
   */
  async signInWithGoogle(): Promise<any> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  }

  /**
   * Email + Password sign-in via Supabase.
   */
  async signInWithEmail(email: string, password: string): Promise<any> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  /**
   * User Sign-up via Supabase Auth.
   */
  async signUp(email: string, password: string): Promise<any> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Password Reset Email via Supabase.
   */
  async resetPassword(email: string): Promise<any> {
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Logout via Supabase Auth.
   */
  async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
      }
    } catch (e) {
      console.error('Unexpected error during logout:', e);
    } finally {
      this.currentUser.set(null);
      this.router.navigate(['/login']);
    }
  }

  /**
   * Get current authenticated user object.
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Get current Supabase session.
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }
}
