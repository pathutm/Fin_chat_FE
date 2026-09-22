import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiMetricItem } from '../../../core/models/analytics-view.model';

@Component({
  selector: 'app-kpi-metric-cards',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-grid-container" [style.--col-count]="metrics().length">
      @for (m of metrics(); track m.id) {
        <div class="kpi-card" [class.highlighted]="m.changeType === 'positive'">
          <div class="kpi-card-header">
            <span class="kpi-label" [title]="m.label">{{ m.label }}</span>
            @if (m.changeText) {
              <span class="kpi-badge" [class]="m.changeType">
                @if (m.changeType === 'positive') {
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                } @else if (m.changeType === 'negative') {
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                }
                {{ m.changeText }}
              </span>
            }
          </div>

          <div class="kpi-value-row">
            <span class="kpi-value tabular-nums">{{ m.value }}</span>
          </div>

          @if (m.subtext) {
            <div class="kpi-subtext">
              <span>{{ m.subtext }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .kpi-grid-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin: 14px 0;
      width: 100%;
    }

    .kpi-card {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      &:hover {
        border-color: oklch(0.78 0.03 265);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        transform: translateY(-1px);
      }
    }

    .kpi-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .kpi-label {
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--muted-text);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .kpi-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      line-height: 1;

      &.positive {
        background: oklch(0.95 0.04 155);
        color: var(--color-success);
        border: 1px solid oklch(0.88 0.06 155);
      }

      &.negative {
        background: oklch(0.96 0.04 25);
        color: var(--color-destructive);
        border: 1px solid oklch(0.9 0.06 25);
      }

      &.neutral {
        background: var(--secondary-surface);
        color: var(--muted-text);
        border: 1px solid var(--border-color);
      }
    }

    .kpi-value-row {
      margin-bottom: 4px;
    }

    .kpi-value {
      font-size: 1.45rem;
      font-weight: 700;
      color: var(--foreground);
      letter-spacing: -0.02em;
      line-height: 1.2;
      font-family: var(--font-sans);
    }

    .kpi-subtext {
      font-size: 0.75rem;
      color: var(--muted-text);
      line-height: 1.3;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `]
})
export class KpiMetricCardsComponent {
  readonly metrics = input.required<KpiMetricItem[]>();
}
