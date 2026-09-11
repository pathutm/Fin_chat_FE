import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Current active theme, default is 'dark' (the current design) */
  readonly theme = signal<ThemeMode>('dark');
  readonly isDark = signal<boolean>(true);

  constructor() {
    // Check saved preference or default to dark
    const saved = localStorage.getItem('finchat-theme') as ThemeMode | null;
    const initialTheme: ThemeMode = saved === 'light' ? 'light' : 'dark';
    this.setTheme(initialTheme);
  }

  toggleTheme(): void {
    const next = this.isDark() ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    const dark = mode === 'dark';
    this.isDark.set(dark);

    if (typeof document !== 'undefined') {
      const body = document.body;
      if (dark) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
      } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
      }
    }

    try {
      localStorage.setItem('finchat-theme', mode);
    } catch {
      // Ignore storage errors in sandbox
    }
  }
}
