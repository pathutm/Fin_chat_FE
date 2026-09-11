import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-suggestion-chip',
  standalone: true,
  template: `
    <button class="chip-card" (click)="clicked.emit()">
      <div class="chip-icon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20.02L12 17.27L7.09 20.02L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
                fill="var(--emerald-400)" opacity="0.8"/>
          <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20.02L12 17.27L7.09 20.02L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
                stroke="var(--emerald-300)" stroke-width="0.5" fill="none"/>
        </svg>
      </div>
      <span class="chip-title">{{ title() }}</span>
    </button>
  `,
  styles: [`
    .chip-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 18px;
      border-radius: var(--radius-md);
      background: rgba(16, 185, 129, 0.06);
      border: 1px solid rgba(16, 185, 129, 0.12);
      backdrop-filter: blur(12px);
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);
      white-space: nowrap;
      min-width: 180px;

      &:hover {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.3);
        box-shadow: var(--glow-sm);
        transform: translateY(-2px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .chip-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: rgba(16, 185, 129, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .chip-title {
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-secondary);
    }
  `],
})
export class SuggestionChipComponent {
  readonly title = input.required<string>();
  readonly clicked = output<void>();
}
