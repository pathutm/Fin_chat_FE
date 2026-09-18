import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Fixed light theme */
  readonly theme = signal<ThemeMode>('light');
  readonly isDark = signal<boolean>(false);

  constructor() {
    this.enforceLightTheme();
  }

  toggleTheme(): void {
    // Light mode only per design specification
    this.enforceLightTheme();
  }

  setTheme(_mode?: string): void {
    this.enforceLightTheme();
  }

  private enforceLightTheme(): void {
    this.theme.set('light');
    this.isDark.set(false);

    if (typeof document !== 'undefined') {
      const body = document.body;
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
    }
  }
}
