import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-suggestion-chip',
  standalone: true,
  template: `
    <button class="chip-card" (click)="clicked.emit()">
      <div class="chip-icon">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 17l9.2-9.2M17 17V7H7"/>
        </svg>
      </div>
      <span class="chip-title">{{ title() }}</span>
    </button>
  `,
  styles: [`
    .chip-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: var(--radius-base);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;

      &:hover {
        background: var(--secondary-surface);
        border-color: oklch(0.8 0.015 260);
        color: var(--foreground);

        .chip-icon {
          color: var(--primary-accent);
        }
      }
    }

    .chip-icon {
      color: var(--muted-text);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: color 0.15s ease;
    }

    .chip-title {
      font-size: 0.82rem;
      font-weight: 500;
    }
  `],
})
export class SuggestionChipComponent {
  readonly title = input.required<string>();
  readonly clicked = output<void>();
}
