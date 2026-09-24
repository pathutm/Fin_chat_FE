import { Component, input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownFormatterService } from '../../../core/utils/markdown-formatter.util';
import { analyzeAnalyticalResponse } from '../../../core/utils/analytics-detector.util';
import { AnalyticalPresentation, VisualFormatType } from '../../../core/models/analytics-view.model';
import { TrendChartComponent } from './trend-chart.component';
import { KpiMetricCardsComponent } from './kpi-metric-cards.component';
import { DataTableViewComponent } from './data-table-view.component';
import { ChatService } from '../../../core/services/chat.service';

/**
 * Strips raw ASCII charts, code fences wrapping ASCII/HTML cards,
 * and leftover HTML tags from previously cached assistant responses.
 * Leaves clean, readable narrative, headings, formulas, and recommendations.
 */
export function cleanDisplayContent(content: string, hasVisual: boolean = false): string {
  if (!content) return '';
  let cleaned = content;

  // 1. Remove triple-backtick code blocks containing ASCII charts or perf-3d
  cleaned = cleaned.replace(/```[a-z]*\s*[\s\S]*?(?:COMPARATIVE|ACCEPTANCE RATE|VARIANCE|MISMATCH|[█░▓▒■❚|=]{3,}|perf-3d)[\s\S]*?```/gi, '');

  // 2. Remove raw HTML ascii/perf-3d cards and rows
  cleaned = cleaned.replace(/<div class=["'](?:ascii-3d-visual-card|perf-3d-row)["']>[\s\S]*?<\/div>\s*(?:<\/div>)?/gi, '');

  // 3. Remove raw text ASCII chart sections when a visual is present
  if (hasVisual) {
    cleaned = cleaned.replace(/(?:#+\s*)?COMPARATIVE PERFORMANCE VISUALIZATION[\s\S]*?(?=(?:#+\s*)?BUSINESS INSIGHTS|(?:\d+\.\s+[A-Z])|\$|\n\n[A-Z\s]{4,}:|\n\n###|$)/gi, '');
    cleaned = cleaned.replace(/(?:#+\s*)?[A-Z\s\-]+(?:\(Higher is Better\)|\(Closer to 0% is Better\))[\s\S]*?(?=(?:#+\s*)?BUSINESS INSIGHTS|(?:\d+\.\s+[A-Z])|\$|\n\n[A-Z\s]{4,}:|\n\n###|$)/gi, '');
  }

  // 4. Remove any remaining raw ASCII bar lines
  cleaned = cleaned.replace(/^[\s*#-]*[A-Za-z0-9_\-./\s]{2,30}?\s+[█░▓▒■❚|=#-]{3,}[\s\S]*?$/gm, '');

  // 5. Strip plain text visualization question prompts (rendered via interactive buttons instead)
  cleaned = cleaned.replace(/would\s+you\s+like\s+.*(?:visualize|chart|graph|visual).*\?\s*\([^\)]*\)/gi, '');
  cleaned = cleaned.replace(/would\s+you\s+like\s+a\s+chart[^\n]*/gi, '');
  cleaned = cleaned.replace(/✓\s*Yes\s*×\s*No/gi, '');

  // 6. Clean extra blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

@Component({
  selector: 'app-analytical-response',
  standalone: true,
  imports: [
    CommonModule,
    TrendChartComponent,
    KpiMetricCardsComponent,
    DataTableViewComponent
  ],
  template: `
    <div class="analytical-response-container">
      <!-- ── 1. Clean Text Narrative / Explanation / Business Insights ── -->
      @if (displayContent()) {
        <div
          class="assistant-markdown-content"
          [innerHTML]="markdownFormatter.formatMarkdown(displayContent())"
        ></div>
      }

      <!-- ── 2. Opt-In Interactive Quick Action Bar (when visualization is offered & pending) ── -->
      @if (presentation().visualizationOffered && optInChoice() === 'pending' && !isChartVisible()) {
        <div class="visualization-opt-in-bar">
          <span class="opt-in-prompt-text">Would you like to visualize this data as a chart?</span>
          <div class="opt-in-buttons-group">
            <button class="opt-in-btn yes-btn" (click)="confirmVisualization()">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span>Yes, show chart</span>
            </button>
            <button class="opt-in-btn no-btn" (click)="declineVisualization()">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>No</span>
            </button>
          </div>
        </div>
      }

      <!-- ── 3. Dynamic Visual Component Rendering (Placed Below Text Narrative) ── -->
      @if (isChartVisible()) {
        <div class="visual-presentation-wrapper">
          <!-- Visual View Selector Bar (when multiple suitable views exist) -->
          @if (presentation().suitableViews.length > 1) {
            <div class="visual-view-selector-bar">
              <span class="view-selector-label">Visual View:</span>
              <div class="view-pills-group">
                @for (view of presentation().suitableViews; track view) {
                  <button
                    class="view-pill-btn"
                    [class.active]="currentView() === view"
                    (click)="setView(view)"
                  >
                    @if (isChartView(view)) {
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2">
                        <path d="M3 3v18h18" />
                        <path d="M18 9l-5 5-4-4-3 3" />
                      </svg>
                    } @else if (view === 'data-table') {
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                    } @else if (view === 'kpi-grid') {
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    } @else if (view === 'dashboard') {
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    }
                    <span>{{ getViewLabel(view) }}</span>
                  </button>
                }
              </div>
            </div>
          }

          <!-- 1a. KPI Grid View -->
          @if (currentView() === 'kpi-grid' && presentation().kpiItems) {
            <app-kpi-metric-cards [metrics]="presentation().kpiItems!" />
          }

          <!-- 1b. Dashboard View (KPIs + Chart) -->
          @if (currentView() === 'dashboard') {
            @if (presentation().kpiItems) {
              <app-kpi-metric-cards [metrics]="presentation().kpiItems!" />
            }
            @if (presentation().chartData) {
              <app-trend-chart
                [trendData]="presentation().chartData!"
                [userQuery]="userQuery()"
              />
            }
          }

          <!-- 1c. Chart Views (Line, Bar, Donut, Scatter) -->
          @if (isChartView(currentView()) && presentation().chartData) {
            <app-trend-chart
              [trendData]="presentation().chartData!"
              [userQuery]="userQuery()"
            />
          }

          <!-- 1d. Interactive Data Table View -->
          @if (currentView() === 'data-table' && presentation().tableData) {
            <app-data-table-view [tableData]="presentation().tableData!" />
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .analytical-response-container {
      width: 100%;
    }

    .visualization-opt-in-bar {
      margin-top: 14px;
      padding: 12px 16px;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card, 8px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    }

    .opt-in-prompt-text {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--foreground);
    }

    .opt-in-buttons-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .opt-in-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      outline: none;

      &.yes-btn {
        background: var(--primary-accent, #1e3a8a);
        color: #ffffff;
        border: 1px solid var(--primary-accent, #1e3a8a);
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.3);
          filter: brightness(1.1);
        }

        &:active {
          transform: translateY(0);
        }
      }

      &.no-btn {
        background: var(--card-surface, #ffffff);
        color: var(--foreground, #1e293b);
        border: 1px solid var(--border-color, #cbd5e1);

        &:hover {
          background: var(--secondary-surface, #f8fafc);
          border-color: oklch(0.7 0.02 260);
          color: var(--foreground, #0f172a);
        }

        &:active {
          background: #e2e8f0;
        }
      }
    }

    .visual-view-selector-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 14px 0 8px;
      padding: 6px 10px;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      flex-wrap: wrap;
    }

    .view-selector-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--muted-text);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .view-pills-group {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }

    .view-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 4px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--muted-text);
      font-size: 0.73rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        color: var(--foreground);
        border-color: oklch(0.8 0.015 260);
      }

      &.active {
        background: var(--primary-accent);
        color: #ffffff;
        border-color: var(--primary-accent);
        font-weight: 600;

        svg {
          color: #ffffff;
        }
      }
    }

    .visual-presentation-wrapper {
      margin-top: 16px;
      animation: fadeInUp 200ms ease;
    }

    ::ng-deep .assistant-markdown-content {
      color: var(--foreground);
      font-size: 0.92rem;
      line-height: 1.6;

      p {
        margin: 0 0 10px 0;
        &:last-child { margin-bottom: 0; }
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 14px 0 8px 0;
        font-weight: 700;
        color: var(--foreground);
        letter-spacing: -0.01em;
        &:first-child { margin-top: 0; }
      }

      h1, h2, h3 {
        font-size: 1.05rem;
      }

      h4, h5, h6 {
        font-size: 0.95rem;
      }

      ul, ol {
        margin: 8px 0 12px 0;
        padding-left: 20px;
      }

      li {
        margin-bottom: 4px;
        &:last-child { margin-bottom: 0; }
      }

      pre {
        background: var(--secondary-surface);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-base);
        padding: 12px 14px;
        margin: 12px 0;
        overflow-x: auto;
        font-family: var(--font-mono);
        font-size: 0.85rem;
        color: var(--foreground);

        code {
          background: transparent;
          padding: 0;
          border-radius: 0;
          color: inherit;
          font-family: inherit;
        }
      }

      code {
        background: var(--secondary-surface);
        color: var(--primary-accent);
        border: 1px solid var(--border-color);
        padding: 2px 5px;
        border-radius: 4px;
        font-family: var(--font-mono);
        font-size: 0.85rem;
      }

      blockquote {
        border-left: 3px solid var(--primary-accent);
        margin: 10px 0;
        padding: 6px 0 6px 12px;
        color: var(--muted-text);
        background: var(--secondary-surface);
        border-radius: 0 4px 4px 0;
      }

      hr {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 14px 0;
      }

      /* 3D Visual Performance Cards (Transformed from ASCII bars) */
      .ascii-3d-visual-card {
        background: var(--card-surface);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-card);
        padding: 14px 18px;
        margin: 12px 0;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .perf-3d-heading {
        font-size: 0.74rem;
        font-weight: 700;
        color: var(--primary-accent);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding-bottom: 5px;
        border-bottom: 1px solid var(--border-color);
        margin-top: 6px;
        &:first-child { margin-top: 0; }
      }
      .perf-3d-row {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.82rem;
      }
      .perf-3d-label {
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--foreground);
        min-width: 95px;
      }
      .perf-3d-track {
        flex: 1;
        height: 12px;
        background: var(--secondary-surface);
        border-radius: 6px;
        overflow: hidden;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
        position: relative;
      }
      .perf-3d-fill {
        height: 100%;
        background: linear-gradient(90deg, #38bdf8, #2563eb, #1d4ed8);
        border-radius: 6px;
        box-shadow: 0 1px 5px rgba(37, 99, 235, 0.45);
        transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .perf-3d-val {
        font-family: var(--font-mono);
        font-weight: 700;
        color: var(--foreground);
        min-width: 58px;
        text-align: right;
      }
      .perf-3d-badge {
        font-size: 0.68rem;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: var(--radius-pill);
        min-width: 55px;
        text-align: center;
        &.perf-badge-best { background: #dcfce7; color: #15803d; }
        &.perf-badge-warn { background: #fef3c7; color: #b45309; }
        &.perf-badge-neutral { background: var(--secondary-surface); color: var(--text-secondary); }
      }

      /* Raw markdown table styling fallback */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
        font-size: 0.84rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-card);
        overflow: hidden;

        th {
          background: var(--secondary-surface);
          color: var(--text-secondary);
          font-weight: 600;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        td {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          color: var(--foreground);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover td {
          background: oklch(0.985 0.003 260);
        }
      }
    }
  `]
})
export class AnalyticalResponseComponent {
  readonly content = input.required<string>();
  readonly userQuery = input<string>('');
  readonly agent = input<string | undefined>(undefined);

  readonly markdownFormatter = inject(MarkdownFormatterService);
  readonly chatService = inject(ChatService);

  readonly isChartRevealed = signal<boolean>(false);
  readonly optInChoice = signal<'pending' | 'yes' | 'no'>('pending');

  readonly presentation = computed<AnalyticalPresentation>(() => {
    return analyzeAnalyticalResponse(this.content(), this.userQuery());
  });

  readonly isChartVisible = computed<boolean>(() => {
    if (this.isChartRevealed()) return true;
    return this.presentation().isVisualizationUseful ?? false;
  });

  readonly displayContent = computed<string>(() => {
    return cleanDisplayContent(this.content(), this.isChartVisible());
  });

  private readonly selectedViewSignal = signal<VisualFormatType | null>(null);

  readonly currentView = computed<VisualFormatType>(() => {
    const custom = this.selectedViewSignal();
    if (custom) return custom;
    return this.presentation().activeView;
  });

  setView(v: VisualFormatType): void {
    this.selectedViewSignal.set(v);
  }

  confirmVisualization(): void {
    this.optInChoice.set('yes');
    this.isChartRevealed.set(true);
  }

  declineVisualization(): void {
    this.optInChoice.set('no');
    this.isChartRevealed.set(false);
  }

  isChartView(type: VisualFormatType): boolean {
    return (
      type === 'line-chart' ||
      type === 'bar-chart' ||
      type === 'donut-chart' ||
      type === 'scatter-chart'
    );
  }

  getViewLabel(view: VisualFormatType): string {
    switch (view) {
      case 'line-chart':
        return 'Trend Chart';
      case 'bar-chart':
        return 'Bar Chart';
      case 'donut-chart':
        return 'Donut Breakdown';
      case 'scatter-chart':
        return 'Scatter Plot';
      case 'kpi-grid':
        return 'Key Metrics';
      case 'dashboard':
        return 'Dashboard';
      case 'data-table':
        return 'Data Table';
      default:
        return 'Default View';
    }
  }
}
