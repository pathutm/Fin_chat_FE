import { Component, input, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  TrendSeries,
  TrendDataPoint,
  DataSeries,
  EXECUTIVE_PALETTE,
  YearPeriodOption,
  ChartType,
  ChartTypeMeta,
  getSuitableChartTypes,
  analyzeUserQuery,
  UserQueryAnalysis,
  calculateHistogramBins,
  HistogramBin,
  calculateWaterfallData,
  WaterfallStep,
  calculateDonutSlices,
  DonutSlice,
  extractCurrencySymbol,
  inferDimensionFromLabels
} from '../../../core/utils/trend-parser.util';

interface Tick {
  value: number;
  label: string;
  y: number;
}

interface MonthOption {
  pointIndex: number;
  month: string;
  shortMonth: string;
  sortKey: number;
  year?: number;
  monthIndex?: number;
  amount: number;
  isAvailable: boolean;
}

export interface PaletteShade {
  base: string;
  light: string;
  lighter: string;
  dark: string;
  darker: string;
}

export const PALETTE_SHADES: PaletteShade[] = [
  { base: '#2563eb', light: '#60a5fa', lighter: '#93c5fd', dark: '#1e40af', darker: '#0f172a' },
  { base: '#0d9488', light: '#2dd4bf', lighter: '#99f6e4', dark: '#0f766e', darker: '#134e4a' },
  { base: '#d97706', light: '#fbbf24', lighter: '#fde68a', dark: '#b45309', darker: '#78350f' },
  { base: '#7c3aed', light: '#a78bfa', lighter: '#ddd6fe', dark: '#6d28d9', darker: '#4c1d95' },
  { base: '#e11d48', light: '#fb7185', lighter: '#fecdd3', dark: '#be123c', darker: '#881337' },
  { base: '#0284c7', light: '#38bdf8', lighter: '#bae6fd', dark: '#0369a1', darker: '#0c4a6e' },
  { base: '#16a34a', light: '#4ade80', lighter: '#bbf7d0', dark: '#15803d', darker: '#14532d' },
  { base: '#ea580c', light: '#fb923c', lighter: '#fed7aa', dark: '#c2410c', darker: '#7c2d12' },
  { base: '#4f46e5', light: '#818cf8', lighter: '#c7d2fe', dark: '#4338ca', darker: '#312e81' },
  { base: '#64748b', light: '#94a3b8', lighter: '#cbd5e1', dark: '#475569', darker: '#1e293b' },
];

export interface ComparisonTableRow {
  entityName: string;
  color: string;
  amount: number;
  rawAmount: string;
  sharePct: number;
  diffFromLeader: number;
  diffFormatted: string;
  diffPercentFormatted: string;
  isLeader: boolean;
  evaluation: string;
}

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ── 1. INITIAL RANGE CLARIFICATION CARD (When broad question has no range) ── -->
    @if (!isClarified() && queryAnalysis().isAmbiguous && trendData().categoryType !== 'category' && (trendData().points[0]?.sortKey ?? 0) > 0) {
      <div class="trend-clarification-card">
        <div class="clarification-header">
          <div class="clarification-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="clarification-text-group">
            <span class="clarification-title">Select Time Range for Analysis</span>
            <span class="clarification-desc">
              Data available from <strong>{{ trendData().points[0].month }}</strong> to
              <strong>{{ trendData().points[trendData().points.length - 1].month }}</strong>
              ({{ trendData().points.length }} records). Which time range would you like to analyze?
            </span>
          </div>
        </div>
        <div class="clarification-options">
          <button class="clarification-pill-btn primary" (click)="chooseInitialOption('all')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 3v18h18"/>
              <path d="M18 9l-5 5-4-4-3 3"/>
            </svg>
            <span>All available data ({{ trendData().points[0].shortMonth }} – {{ trendData().points[trendData().points.length - 1].shortMonth }})</span>
          </button>
          <button class="clarification-pill-btn" (click)="chooseInitialOption('latest12')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
            </svg>
            <span>Latest 12 months</span>
          </button>
          @if (trendData().points.length > 12) {
            <button class="clarification-pill-btn" (click)="chooseInitialOption('latest24')">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
              </svg>
              <span>Latest 24 months</span>
            </button>
          }
          <button class="clarification-pill-btn custom" (click)="chooseInitialOption('custom')">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
            </svg>
            <span>Custom date range</span>
          </button>
        </div>
      </div>
    } @else if (isConfirmed() === false) {
      <!-- ── 2. DECLINED BANNER ── -->
      <div class="trend-declined-card">
        <div class="declined-info">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>Trend visualization hidden</span>
        </div>
        <button class="reopen-chart-btn" (click)="reopenChart()">Show Visualization</button>
      </div>
    } @else {
      <!-- ── 3. FULL PROFESSIONAL CFO ANALYTICS VISUALIZATION ENGINE ── -->
      <div class="trend-card" #chartCard (click)="closePopoversOnBackdrop($event)">
        <!-- Header -->
        <div class="chart-header">
          <div class="header-left">
            <div class="metric-title-wrap">
              <div class="chart-icon-box">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3v18h18"/>
                  <path d="M18 9l-5 5-4-4-3 3"/>
                </svg>
              </div>
              <div>
                <h4 class="metric-title">{{ trendData().title }}</h4>
                <div class="metric-meta-row">
                  <span class="meta-pill highlight">{{ activePoints().length }} {{ trendData().categoryType === 'category' ? 'Categories' : 'Periods' }} Plotted</span>
                  @if (activeDateRangeLabel()) {
                    <span class="meta-pill date-range-pill">Range: {{ activeDateRangeLabel() }}</span>
                  }
                  @if (isMultiSeries()) {
                    <span class="meta-pill count-pill">{{ activeSeriesList().length }} Entities Compared</span>
                  } @else {
                    <span class="meta-pill peak-pill">Peak: {{ activePeakPoint().month }}</span>
                  }
                  @if (trendData().hasInvoiceCount && !isMultiSeries()) {
                    <span class="meta-pill count-pill">Multi-Metric (Amount & Volume)</span>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="header-right">
            <!-- Zoom Controls (Viewport-only scaling) -->
            <div class="control-group zoom-group" title="Zoom chart viewport (or use mouse wheel)">
              <button class="ctrl-btn" [disabled]="zoomLevel() <= 0.8" (click)="zoomOut()" aria-label="Zoom out">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <button class="ctrl-btn reset-btn" [class.active]="zoomLevel() !== 1.0" (click)="resetZoom()" aria-label="Reset zoom">
                {{ Math.round(zoomLevel() * 100) }}%
              </button>
              <button class="ctrl-btn" [disabled]="zoomLevel() >= 2.5" (click)="zoomIn()" aria-label="Zoom in">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>

            <!-- Download / Export Controls -->
            <div class="control-group export-group">
              <button
                class="ctrl-btn export-btn"
                [class.active]="isDownloadMenuOpen()"
                (click)="toggleDownloadMenu($event)"
                title="Download visualization"
                aria-label="Download visualization"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Export</span>
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              @if (isDownloadMenuOpen()) {
                <div class="export-dropdown-menu" (click)="$event.stopPropagation()">
                  <button class="dropdown-opt-btn" (click)="exportChart('png')">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span>Download as PNG (Retina 2x)</span>
                  </button>
                  <button class="dropdown-opt-btn" (click)="exportChart('svg')">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                      <polyline points="2 17 12 22 22 17"/>
                      <polyline points="2 12 12 17 22 12"/>
                    </svg>
                    <span>Download as Vector SVG</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ── 4. DYNAMIC VISUALIZATION CATALOG SELECTOR (Only suitable types shown) ── -->
        <div class="chart-catalog-bar" role="tablist" aria-label="Visualization Type">
          <span class="catalog-label">Visualization:</span>
          <div class="catalog-tabs-container">
            @for (c of suitableTypes(); track c.type) {
              <button
                type="button"
                class="catalog-tab-btn"
                [class.active]="selectedType() === c.type"
                (click)="selectType(c.type)"
                role="tab"
                [attr.aria-selected]="selectedType() === c.type"
                [title]="c.description"
              >
                @if (c.type === 'line') {
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                }
                @if (c.type === 'bar') {
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="12" width="4" height="8" rx="1"/>
                    <rect x="10" y="6" width="4" height="14" rx="1"/>
                    <rect x="17" y="2" width="4" height="18" rx="1"/>
                  </svg>
                }
                @if (c.type === 'area') {
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 20h18M3 20l4-9 6 4 8-10v15H3z"/>
                  </svg>
                }
                @if (c.type === 'waterfall') {
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="4" width="4" height="6" rx="1"/>
                    <rect x="8" y="8" width="4" height="5" rx="1"/>
                    <rect x="14" y="11" width="4" height="6" rx="1"/>
                    <rect x="20" y="7" width="4" height="13" rx="1"/>
                  </svg>
                }
                @if (c.type === 'donut') {
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"/>
                    <circle cx="12" cy="12" r="4"/>
                  </svg>
                }
                @if (c.type === 'histogram') {
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="14" width="4" height="7"/>
                    <rect x="10" y="6" width="4" height="15"/>
                    <rect x="17" y="10" width="4" height="11"/>
                  </svg>
                }
                <span>{{ c.label }}</span>
              </button>
            }
          </div>
        </div>

        <!-- ── 5. SCENARIO-ADAPTIVE FILTERING BAR (Entity Filter or Date Range) ── -->
        @if (isComparisonScenario()) {
          <div class="entity-filter-bar">
            <div class="entity-filter-header">
              <span class="entity-filter-label">Filter {{ dimensionLabel() }}:</span>
              <span class="entity-filter-hint">Click a pill to isolate, or select multiple to compare</span>
            </div>
            <div class="entity-filter-pills-wrap">
              <button
                type="button"
                class="entity-pill-btn all-pill"
                [class.active]="selectedEntityIds().length === 0 || selectedEntityIds().length === allEntities().length"
                (click)="selectAllEntities()"
              >
                <span>All / Both ({{ allEntities().length }})</span>
              </button>
              @for (ent of allEntities(); track ent.id) {
                <button
                  type="button"
                  class="entity-pill-btn"
                  [class.active]="isEntitySelected(ent.id)"
                  (click)="toggleEntityFilter(ent.id)"
                  [title]="'Filter to ' + ent.label"
                >
                  <span class="entity-color-dot" [style.background-color]="ent.color"></span>
                  <span class="entity-pill-label">{{ ent.label }}</span>
                </button>
              }
            </div>
          </div>
        } @else {
          <!-- ── 5. PERMANENT DATE RANGE FILTERING BAR (For Chronological Time Series) ── -->
          <div class="filters-bar">
          <!-- Quick Presets -->
          <div class="filter-item presets-group">
            <span class="filter-label">Quick:</span>
            <button
              class="preset-pill-btn"
              [class.active]="activePreset() === 'all'"
              (click)="setPreset('all')"
              title="View all available data ({{ trendData().points[0].shortMonth }} – {{ trendData().points[trendData().points.length - 1].shortMonth }})"
            >
              All Data ({{ trendData().points.length }}M)
            </button>
            @if (trendData().points.length > 12) {
              <button
                class="preset-pill-btn"
                [class.active]="activePreset() === 'latest12'"
                (click)="setPreset('latest12')"
                title="View latest 12 months"
              >
                Latest 12M
              </button>
            }
            @if (trendData().points.length > 24) {
              <button
                class="preset-pill-btn"
                [class.active]="activePreset() === 'latest24'"
                (click)="setPreset('latest24')"
                title="View latest 24 months"
              >
                Latest 24M
              </button>
            }
            @if (latestYear()) {
              <button
                class="preset-pill-btn"
                [class.active]="activePreset() === 'currentYear'"
                (click)="setPreset('currentYear')"
                title="View current data year ({{ latestYear() }})"
              >
                {{ latestYear() }}
              </button>
            }
            @if (previousYear()) {
              <button
                class="preset-pill-btn"
                [class.active]="activePreset() === 'prevYear'"
                (click)="setPreset('prevYear')"
                title="View previous data year ({{ previousYear() }})"
              >
                {{ previousYear() }}
              </button>
            }
          </div>

          <div class="filter-divider"></div>

          <!-- Interactive Calendar / Month Picker: From Date -->
          <div class="filter-item date-picker-item">
            <span class="filter-label">From:</span>
            <div class="picker-trigger-wrap">
              <button
                class="picker-trigger-btn"
                [class.active]="isFromPickerOpen()"
                (click)="toggleFromPicker($event)"
                title="Click to open From Month calendar picker"
                aria-label="Select start date"
              >
                <svg class="picker-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span class="picker-value">{{ selectedFromPoint()?.month || 'Select date' }}</span>
                <svg class="picker-chevron" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              @if (isFromPickerOpen()) {
                <div class="calendar-popover" (click)="$event.stopPropagation()">
                  <div class="popover-header">
                    <span class="popover-title">Select Start Month</span>
                    <span class="popover-bounds">Bounds: {{ trendData().points[0].shortMonth }} – {{ trendData().points[trendData().points.length - 1].shortMonth }}</span>
                  </div>
                  <div class="calendar-years-grid">
                    @for (yr of availableYears(); track yr) {
                      <div class="year-block">
                        <span class="year-title">{{ yr }}</span>
                        <div class="months-chips-grid">
                          @for (m of getMonthsForYear(yr); track m.monthIndex) {
                            <button
                              class="month-chip-btn"
                              [class.active]="selectedFromPoint()?.sortKey === m.sortKey"
                              [disabled]="!m.isAvailable"
                              (click)="selectFromMonth(m.pointIndex)"
                              [title]="m.isAvailable ? m.month : 'No data recorded for this month'"
                            >
                              {{ m.shortMonth.slice(0, 3) }}
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Interactive Calendar / Month Picker: To Date -->
          <div class="filter-item date-picker-item">
            <span class="filter-label">To:</span>
            <div class="picker-trigger-wrap">
              <button
                class="picker-trigger-btn"
                [class.active]="isToPickerOpen()"
                (click)="toggleToPicker($event)"
                title="Click to open To Month calendar picker"
                aria-label="Select end date"
              >
                <svg class="picker-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span class="picker-value">{{ selectedToPoint()?.month || 'Select date' }}</span>
                <svg class="picker-chevron" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              @if (isToPickerOpen()) {
                <div class="calendar-popover" (click)="$event.stopPropagation()">
                  <div class="popover-header">
                    <span class="popover-title">Select End Month</span>
                    <span class="popover-bounds">Available up to {{ trendData().points[trendData().points.length - 1].shortMonth }}</span>
                  </div>
                  <div class="calendar-years-grid">
                    @for (yr of availableYears(); track yr) {
                      <div class="year-block">
                        <span class="year-title">{{ yr }}</span>
                        <div class="months-chips-grid">
                          @for (m of getMonthsForYear(yr); track m.monthIndex) {
                            <button
                              class="month-chip-btn"
                              [class.active]="selectedToPoint()?.sortKey === m.sortKey"
                              [disabled]="!m.isAvailable || (selectedFromPoint() && m.sortKey < selectedFromPoint()!.sortKey)"
                              (click)="selectToMonth(m.pointIndex)"
                              [title]="m.isAvailable ? m.month : 'Not available or earlier than From date'"
                            >
                              {{ m.shortMonth.slice(0, 3) }}
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Reset Filter Button -->
          @if (isRangeCustomized()) {
            <button class="reset-range-btn" (click)="setPreset('all')" title="Reset to entire available range">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Reset Range</span>
            </button>
          }
          </div>
        }

        <!-- Multi-Series Interactive Legend -->
        @if (isMultiSeriesVisible()) {
          <div class="chart-legend-row">
            @if (isMultiSeries()) {
              @for (s of trendData().seriesList; track s.id) {
                <button
                  type="button"
                  class="legend-item interactive-legend-item"
                  [class.dimmed]="hiddenSeriesIds().has(s.id)"
                  (click)="toggleSeriesVisibility(s.id)"
                  [title]="'Click to toggle visibility of ' + s.name"
                >
                  <span class="legend-color-dot" [style.background]="s.color"></span>
                  <span class="legend-label">{{ s.name }}</span>
                  <span class="legend-meta">Total: {{ formatCompactCurrency(getSeriesTotal(s)) }}</span>
                </button>
              }
            } @else {
              <div class="legend-item" (mouseenter)="hoveredSeries.set('amount')" (mouseleave)="hoveredSeries.set(null)">
                <span class="legend-color-dot" style="background: #2563eb;"></span>
                <span class="legend-label">{{ trendData().metricLabel || 'Amount' }}</span>
                <span class="legend-meta">Total: {{ formatCompactCurrency(activeTotalAmount()) }}</span>
              </div>
              @if (trendData().hasInvoiceCount) {
                <div class="legend-item" (mouseenter)="hoveredSeries.set('count')" (mouseleave)="hoveredSeries.set(null)">
                  <span class="legend-color-dot" style="background: #d97706;"></span>
                  <span class="legend-label">{{ trendData().secondaryMetricLabel || 'Volume' }}</span>
                  <span class="legend-meta">Secondary metric</span>
                </div>
              }
            }
          </div>
        }

        <!-- ── 6. SCROLLABLE CHART VIEWPORT (Dynamic width, zero data slicing) ── -->
        <div
          class="chart-viewport"
          #viewport
          (wheel)="onWheel($event)"
          tabindex="0"
          aria-label="Chart Viewport"
        >
          <div class="svg-container" [style.min-width.px]="viewportSvgWidth()">
            <svg
              #chartSvg
              class="trend-svg"
              [attr.viewBox]="'0 0 ' + viewportSvgWidth() + ' 310'"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#3b82f6"/>
                  <stop offset="100%" stop-color="#1d4ed8"/>
                </linearGradient>
                <linearGradient id="barSelectedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#1e40af"/>
                  <stop offset="100%" stop-color="#0f172a"/>
                </linearGradient>
                <linearGradient id="countBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#f59e0b"/>
                  <stop offset="100%" stop-color="#b45309"/>
                </linearGradient>
                <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#2563eb" stop-opacity="0.45"/>
                  <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.20"/>
                  <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.02"/>
                </linearGradient>
                <!-- 3D Isometric Facet Gradients for 10 Executive Palette Colors -->
                @for (shade of paletteShades; track $index) {
                  <linearGradient [id]="'bar3dFrontGrad_' + $index" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" [attr.stop-color]="shade.light"/>
                    <stop offset="35%" [attr.stop-color]="shade.base"/>
                    <stop offset="100%" [attr.stop-color]="shade.dark"/>
                  </linearGradient>
                  <linearGradient [id]="'bar3dTopGrad_' + $index" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" [attr.stop-color]="shade.lighter"/>
                    <stop offset="100%" stop-color="#ffffff"/>
                  </linearGradient>
                  <linearGradient [id]="'bar3dSideGrad_' + $index" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" [attr.stop-color]="shade.dark"/>
                    <stop offset="100%" [attr.stop-color]="shade.darker"/>
                  </linearGradient>
                }
                <!-- Fallback defaults -->
                <linearGradient id="bar3dFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#60a5fa"/>
                  <stop offset="35%" stop-color="#2563eb"/>
                  <stop offset="100%" stop-color="#1e40af"/>
                </linearGradient>
                <linearGradient id="bar3dTopGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#93c5fd"/>
                  <stop offset="100%" stop-color="#eff6ff"/>
                </linearGradient>
                <linearGradient id="bar3dSideGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#1e3a8a"/>
                  <stop offset="100%" stop-color="#0f172a"/>
                </linearGradient>

                <linearGradient id="hist3dFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8"/>
                  <stop offset="40%" stop-color="#0284c7"/>
                  <stop offset="100%" stop-color="#0369a1"/>
                </linearGradient>
                <linearGradient id="hist3dTopGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#bae6fd"/>
                  <stop offset="100%" stop-color="#f0f9ff"/>
                </linearGradient>
                <linearGradient id="hist3dSideGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#075985"/>
                  <stop offset="100%" stop-color="#082f49"/>
                </linearGradient>
                <filter id="donut3dDepth" x="-20%" y="-20%" width="150%" height="150%">
                  <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.22"/>
                </filter>
              </defs>

              <!-- Grid & Y-Axis (Numeric metric only, zero month concatenations) -->
              @if (selectedType() !== 'donut') {
                <g class="chart-grid">
                  @for (tick of yTicks(); track tick.value) {
                    <line class="grid-line" [attr.x1]="gridLeft" [attr.y1]="tick.y" [attr.x2]="gridRight()" [attr.y2]="tick.y"/>
                    <text class="axis-label y-axis-label" [attr.x]="gridLeft - 10" [attr.y]="tick.y + 4" text-anchor="end">{{ tick.label }}</text>
                  }
                  <line class="baseline" [attr.x1]="gridLeft" [attr.y1]="baseY" [attr.x2]="gridRight()" [attr.y2]="baseY"/>
                </g>
              }

              <!-- ── A. LINE & MULTI-LINE RENDERER ── -->
              @if (selectedType() === 'line' || selectedType() === 'multi-line') {
                <g class="line-layer">
                  @if (!isMultiSeries()) {
                    <path class="clean-trend-line primary" [attr.d]="linePathD()" fill="none"/>
                    @if (selectedType() === 'multi-line' && trendData().hasInvoiceCount) {
                      <path class="clean-trend-line secondary" [attr.d]="countLinePathD()" fill="none"/>
                    }
                    @for (item of calculatedPoints(); track item.point.pointIndex) {
                      <g
                        class="data-point-group"
                        [class.selected]="selectedMonth() === item.point.month"
                        (click)="toggleMonthSelection(item.point)"
                        (mouseenter)="onElementHover(item, $event)"
                        (mouseleave)="onElementLeave()"
                      >
                        <circle class="point-halo" [attr.cx]="item.slotCenter" [attr.cy]="item.y" r="13" [attr.fill]="getEntityColor(item.point.pointIndex)" fill-opacity="0.16"/>
                        <circle class="point-outer primary" [attr.cx]="item.slotCenter" [attr.cy]="item.y" r="5" fill="#ffffff" [attr.stroke]="getEntityColor(item.point.pointIndex)" stroke-width="2.5"/>
                        <circle class="point-inner primary" [attr.cx]="item.slotCenter" [attr.cy]="item.y" r="2.4" [attr.fill]="getEntityColor(item.point.pointIndex)"/>
                        <text
                          class="line-point-label"
                          [attr.x]="item.slotCenter"
                          [attr.y]="item.y - 10"
                          text-anchor="middle"
                          font-size="10.5"
                          font-weight="700"
                          font-family="var(--font-mono)"
                          [attr.fill]="getEntityColor(item.point.pointIndex)"
                        >
                          {{ formatCompactCurrency(item.point.amount) }}
                        </text>
                        @if (selectedType() === 'multi-line' && item.countY !== undefined) {
                          <circle class="point-outer secondary" [attr.cx]="item.slotCenter" [attr.cy]="item.countY" r="4"/>
                        }
                      </g>
                    }
                  } @else {
                    @for (series of activeSeriesList(); track series.id) {
                      <path
                        class="clean-trend-line multi-series-line"
                        [attr.d]="multiLinePathD(series)"
                        [attr.stroke]="series.color"
                        stroke-width="2.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        fill="none"
                      />
                    }
                    @for (item of calculatedPoints(); track item.point.pointIndex) {
                      <g
                        class="data-point-group"
                        [class.selected]="selectedMonth() === item.point.month"
                        (click)="toggleMonthSelection(item.point)"
                        (mouseenter)="onElementHover(item, $event)"
                        (mouseleave)="onElementLeave()"
                      >
                        <circle class="point-halo" [attr.cx]="item.slotCenter" [attr.cy]="item.y" r="14"/>
                        @for (series of activeSeriesList(); track series.id) {
                          @if (getEntityPointY(item, series); as ptY) {
                            <circle class="point-outer" [attr.cx]="item.slotCenter" [attr.cy]="ptY" r="4.5" fill="#ffffff" [attr.stroke]="series.color" stroke-width="2"/>
                            <circle class="point-inner" [attr.cx]="item.slotCenter" [attr.cy]="ptY" r="2.2" [attr.fill]="series.color"/>
                          }
                        }
                      </g>
                    }
                  }
                </g>
              }

              <!-- ── B. AREA RENDERER ── -->
              @if (selectedType() === 'area') {
                <g class="area-layer">
                  @if (!isMultiSeries()) {
                    <path class="trend-area-path" [attr.d]="areaPathD()" fill="rgba(37, 99, 235, 0.18)"/>
                    <path class="area-top-line" [attr.d]="linePathD()" fill="none"/>
                    @for (item of calculatedPoints(); track item.point.pointIndex) {
                      <g
                        class="data-point-group"
                        [class.selected]="selectedMonth() === item.point.month"
                        (click)="toggleMonthSelection(item.point)"
                        (mouseenter)="onElementHover(item, $event)"
                        (mouseleave)="onElementLeave()"
                      >
                        <circle class="point-halo" [attr.cx]="item.slotCenter" [attr.cy]="item.y" r="12"/>
                        <circle class="point-outer primary" [attr.cx]="item.slotCenter" [attr.cy]="item.y" r="4.5"/>
                        <circle class="point-inner primary" [attr.cx]="item.slotCenter" [attr.cy]="item.y" r="2.2"/>
                      </g>
                    }
                  } @else {
                    @for (series of activeSeriesList(); track series.id) {
                      <path
                        class="trend-area-path"
                        [attr.d]="multiAreaPathD(series)"
                        [attr.fill]="getAlphaColor(series.color, 0.18)"
                      />
                      <path
                        class="clean-trend-line multi-series-line"
                        [attr.d]="multiLinePathD(series)"
                        [attr.stroke]="series.color"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        fill="none"
                      />
                    }
                    @for (item of calculatedPoints(); track item.point.pointIndex) {
                      <g
                        class="data-point-group"
                        [class.selected]="selectedMonth() === item.point.month"
                        (click)="toggleMonthSelection(item.point)"
                        (mouseenter)="onElementHover(item, $event)"
                        (mouseleave)="onElementLeave()"
                      >
                        <circle class="point-halo" [attr.cx]="item.slotCenter" [attr.cy]="item.y" r="14"/>
                        @for (series of activeSeriesList(); track series.id) {
                          @if (getEntityPointY(item, series); as ptY) {
                            <circle class="point-outer" [attr.cx]="item.slotCenter" [attr.cy]="ptY" r="4.5" fill="#ffffff" [attr.stroke]="series.color" stroke-width="2"/>
                            <circle class="point-inner" [attr.cx]="item.slotCenter" [attr.cy]="ptY" r="2.2" [attr.fill]="series.color"/>
                          }
                        }
                      </g>
                    }
                  }
                </g>
              }

              <!-- ── C. CLEAN RESPONSIVE BAR & GROUPED BAR RENDERER ── -->
              @if (selectedType() === 'bar' || selectedType() === 'grouped-bar') {
                <g class="bars-layer">
                  @if (!isMultiSeries() && selectedType() === 'bar') {
                    @for (item of calculatedPoints(); track item.point.pointIndex) {
                      <g
                        class="bar-column-group bar-3d-group"
                        [class.selected]="selectedMonth() === item.point.month"
                        (click)="toggleMonthSelection(item.point)"
                        (mouseenter)="onElementHover(item, $event)"
                        (mouseleave)="onElementLeave()"
                      >
                        <rect
                          class="bar-hitbox"
                          [attr.x]="item.slotCenter - slotWidth() / 2"
                          [attr.y]="plotTop"
                          [attr.width]="slotWidth()"
                          [attr.height]="baseY - plotTop + 40"
                          fill="transparent"
                          cursor="pointer"
                        />
                        <rect
                          class="bar-hover-bg"
                          [attr.x]="item.x - 4"
                          [attr.y]="plotTop"
                          [attr.width]="item.barWidth + 8 + getBar3dDepthX(item.barWidth)"
                          [attr.height]="baseY - plotTop + 4"
                          rx="6"
                        />
                        <!-- Ground Cast Shadow -->
                        <ellipse
                          class="bar-ground-shadow"
                          [attr.cx]="item.x + item.barWidth / 2 + getBar3dDepthX(item.barWidth) / 2"
                          [attr.cy]="baseY + 3"
                          [attr.rx]="item.barWidth * 0.54"
                          [attr.ry]="3.5"
                          fill="rgba(15, 23, 42, 0.16)"
                        />
                        <!-- 3D Front Face -->
                        <rect
                          class="bar-front-3d"
                          [attr.x]="item.x"
                          [attr.y]="item.y"
                          [attr.width]="item.barWidth"
                          [attr.height]="item.height"
                          [attr.fill]="'url(#bar3dFrontGrad_' + (item.point.pointIndex % 10) + ')'"
                          rx="2"
                        />
                        <!-- 3D Top Cap Polygon -->
                        <polygon
                          class="bar-top-3d"
                          [attr.points]="getBar3dTopPoints(item.x, item.y, item.barWidth)"
                          [attr.fill]="'url(#bar3dTopGrad_' + (item.point.pointIndex % 10) + ')'"
                        />
                        <!-- 3D Right Side Extrusion Polygon -->
                        <polygon
                          class="bar-side-3d"
                          [attr.points]="getBar3dSidePoints(item.x, item.y, item.barWidth, item.height)"
                          [attr.fill]="'url(#bar3dSideGrad_' + (item.point.pointIndex % 10) + ')'"
                        />
                        <!-- Top 3D Value Label -->
                        <text
                          class="bar-top-value-label"
                          [attr.x]="item.x + item.barWidth / 2 + getBar3dDepthX(item.barWidth) / 2"
                          [attr.y]="item.y - getBar3dDepthY(item.barWidth) - 4"
                          text-anchor="middle"
                        >
                          {{ formatCompactCurrency(item.point.amount) }}
                        </text>
                      </g>
                    }
                  } @else if (isMultiSeries()) {
                    <!-- Grouped / Clustered Bars for Multi-Entity -->
                    @for (item of calculatedPoints(); track item.point.pointIndex) {
                      <g
                        class="bar-column-group multi-group bar-3d-group"
                        [class.selected]="selectedMonth() === item.point.month"
                        (click)="toggleMonthSelection(item.point)"
                        (mouseenter)="onElementHover(item, $event)"
                        (mouseleave)="onElementLeave()"
                      >
                        <rect
                          class="bar-hitbox"
                          [attr.x]="item.slotCenter - slotWidth() / 2"
                          [attr.y]="plotTop"
                          [attr.width]="slotWidth()"
                          [attr.height]="baseY - plotTop + 40"
                          fill="transparent"
                          cursor="pointer"
                        />
                        <rect
                          class="bar-hover-bg"
                          [attr.x]="item.slotCenter - slotWidth() * 0.46"
                          [attr.y]="plotTop"
                          [attr.width]="slotWidth() * 0.92"
                          [attr.height]="baseY - plotTop + 4"
                          rx="6"
                        />
                        @for (s of activeSeriesList(); track s.id; let sIdx = $index) {
                          @if (getEntityBar(item, s, sIdx, activeSeriesList().length); as b) {
                            <g class="bar-3d-entity-column">
                              <!-- Entity Ground Shadow -->
                              <ellipse
                                class="bar-ground-shadow"
                                [attr.cx]="b.x + b.width / 2 + getBar3dDepthX(b.width) / 2"
                                [attr.cy]="baseY + 2"
                                [attr.rx]="b.width * 0.5"
                                [attr.ry]="2.5"
                                fill="rgba(15, 23, 42, 0.12)"
                              />
                              <!-- Entity Front Face -->
                              <rect
                                class="bar-front-3d multi-entity-bar"
                                [attr.x]="b.x"
                                [attr.y]="b.y"
                                [attr.width]="b.width"
                                [attr.height]="b.height"
                                [attr.fill]="s.color"
                                rx="2"
                              />
                              <!-- Entity Top Cap -->
                              <polygon
                                class="bar-top-3d"
                                [attr.points]="getBar3dTopPoints(b.x, b.y, b.width)"
                                [attr.fill]="s.color"
                                fill-opacity="0.65"
                              />
                              <!-- Entity Side Face -->
                              <polygon
                                class="bar-side-3d"
                                [attr.points]="getBar3dSidePoints(b.x, b.y, b.width, b.height)"
                                [attr.fill]="s.color"
                                fill-opacity="0.85"
                              />
                            </g>
                          }
                        }
                      </g>
                    }
                  } @else {
                    <!-- Dual-metric grouped bar (amount + count) -->
                    @for (item of calculatedPoints(); track item.point.pointIndex) {
                      <g
                        class="grouped-bar-slot"
                        (mouseenter)="onElementHover(item, $event)"
                        (mouseleave)="onElementLeave()"
                        (click)="toggleMonthSelection(item.point)"
                      >
                        <rect
                          [attr.x]="item.slotCenter - item.barWidth"
                          [attr.y]="item.y"
                          [attr.width]="item.barWidth * 0.9"
                          [attr.height]="Math.max(baseY - item.y, 2)"
                          fill="#2563eb"
                          rx="2"
                        />
                        @if (item.countY !== undefined) {
                          <rect
                            [attr.x]="item.slotCenter + item.barWidth * 0.1"
                            [attr.y]="item.countY"
                            [attr.width]="item.barWidth * 0.9"
                            [attr.height]="Math.max(baseY - item.countY, 2)"
                            fill="#d97706"
                            rx="2"
                          />
                        }
                      </g>
                    }
                  }
                </g>
              }

              <!-- ── D. STACKED BAR RENDERER ── -->
              @if (selectedType() === 'stacked-bar') {
                <g class="stacked-bars-layer">
                  @for (item of calculatedPoints(); track item.point.pointIndex) {
                    <g
                      class="stacked-bar-slot"
                      (mouseenter)="onElementHover(item, $event)"
                      (mouseleave)="onElementLeave()"
                      (click)="toggleMonthSelection(item.point)"
                    >
                      <rect
                        class="bar-hitbox"
                        [attr.x]="item.slotCenter - slotWidth() / 2"
                        [attr.y]="plotTop"
                        [attr.width]="slotWidth()"
                        [attr.height]="baseY - plotTop + 24"
                        fill="transparent"
                        cursor="pointer"
                      />
                      @if (isMultiSeries()) {
                        @for (seg of getStackedSegments(item, activeSeriesList()); track seg.seriesId) {
                          <rect
                            [attr.x]="item.x"
                            [attr.y]="seg.y"
                            [attr.width]="item.barWidth"
                            [attr.height]="seg.height"
                            [attr.fill]="seg.color"
                            rx="1.5"
                          />
                        }
                      } @else {
                        <rect
                          [attr.x]="item.x"
                          [attr.y]="item.y"
                          [attr.width]="item.barWidth"
                          [attr.height]="Math.max(baseY - item.y, 2)"
                          fill="#2563eb"
                          rx="2"
                        />
                        @if (item.countY !== undefined) {
                          <rect
                            [attr.x]="item.x"
                            [attr.y]="Math.max(item.y - 12, plotTop)"
                            [attr.width]="item.barWidth"
                            height="10"
                            fill="#f59e0b"
                            rx="2"
                          />
                        }
                      }
                    </g>
                  }
                </g>
              }

              <!-- ── F. SCATTER PLOT RENDERER (Volume vs. Amount) ── -->
              @if (selectedType() === 'scatter') {
                <g class="scatter-layer">
                  @for (item of scatterPoints(); track item.point.pointIndex) {
                    <g
                      class="scatter-bubble-group"
                      (mouseenter)="onElementHover(item, $event)"
                      (mouseleave)="onElementLeave()"
                      (click)="toggleMonthSelection(item.point)"
                    >
                      <circle class="scatter-bubble" [attr.cx]="item.x" [attr.cy]="item.y" [attr.r]="item.r" fill="#2563eb" fill-opacity="0.65" stroke="#1d4ed8" stroke-width="1.5"/>
                      <text class="scatter-label" [attr.x]="item.x" [attr.y]="item.y - item.r - 4" text-anchor="middle">{{ item.point.shortMonth }}</text>
                    </g>
                  }
                </g>
              }

              <!-- ── G. HISTOGRAM RENDERER (Amount Distribution in 3D) ── -->
              @if (selectedType() === 'histogram') {
                <g class="histogram-layer">
                  @for (bin of histogramBins(); track bin.binIndex) {
                    <g
                      class="histogram-bin-group bar-3d-group"
                      (mouseenter)="onElementHover({ point: bin.points[0] || { month: bin.label, shortMonth: bin.label, amount: bin.count, currencySymbol: '', pointIndex: bin.binIndex, sortKey: bin.binIndex, rawAmount: bin.count + ' transactions' }, x: getHistBinX(bin.binIndex) + getHistBinWidth() / 2, y: getHistBinY(bin.count) }, $event)"
                      (mouseleave)="onElementLeave()"
                    >
                      <!-- Ground Shadow -->
                      <ellipse
                        class="bar-ground-shadow"
                        [attr.cx]="getHistBinX(bin.binIndex) + getHistBinWidth() / 2 + getBar3dDepthX(getHistBinWidth()) / 2"
                        [attr.cy]="baseY + 3"
                        [attr.rx]="getHistBinWidth() * 0.52"
                        [attr.ry]="3.2"
                        fill="rgba(15, 23, 42, 0.16)"
                      />
                      <!-- 3D Front Face -->
                      <rect
                        class="hist-bar bar-front-3d"
                        [attr.x]="getHistBinX(bin.binIndex)"
                        [attr.y]="getHistBinY(bin.count)"
                        [attr.width]="getHistBinWidth()"
                        [attr.height]="Math.max(baseY - getHistBinY(bin.count), 2)"
                        fill="url(#hist3dFrontGrad)"
                        rx="2"
                      />
                      <!-- 3D Top Cap Polygon -->
                      <polygon
                        class="bar-top-3d"
                        [attr.points]="getBar3dTopPoints(getHistBinX(bin.binIndex), getHistBinY(bin.count), getHistBinWidth())"
                        fill="url(#hist3dTopGrad)"
                      />
                      <!-- 3D Right Side Extrusion Polygon -->
                      <polygon
                        class="bar-side-3d"
                        [attr.points]="getBar3dSidePoints(getHistBinX(bin.binIndex), getHistBinY(bin.count), getHistBinWidth(), Math.max(baseY - getHistBinY(bin.count), 2))"
                        fill="url(#hist3dSideGrad)"
                      />
                      <!-- Frequency Count Label -->
                      <text
                        class="hist-count-label"
                        [attr.x]="getHistBinX(bin.binIndex) + getHistBinWidth() / 2 + getBar3dDepthX(getHistBinWidth()) / 2"
                        [attr.y]="getHistBinY(bin.count) - getBar3dDepthY(getHistBinWidth()) - 4"
                        text-anchor="middle"
                      >
                        {{ bin.count }} ({{ bin.percent }}%)
                      </text>
                      <!-- Uncongested Angled X-Axis Bracket Label -->
                      <text
                        class="hist-x-label rotated-x-label"
                        [attr.x]="getHistBinX(bin.binIndex) + getHistBinWidth() / 2"
                        [attr.y]="baseY + 16"
                        [attr.transform]="'rotate(-24 ' + (getHistBinX(bin.binIndex) + getHistBinWidth() / 2) + ' ' + (baseY + 16) + ')'"
                        text-anchor="end"
                      >
                        {{ bin.label }}
                      </text>
                    </g>
                  }
                </g>
              }

              <!-- ── H. WATERFALL RENDERER (Period-over-Period Variance) ── -->
              @if (selectedType() === 'waterfall') {
                <g class="waterfall-layer">
                  @for (step of waterfallSteps(); track $index) {
                    <g class="waterfall-step-group">
                      <rect
                        class="wf-bar"
                        [attr.x]="getWaterfallX($index)"
                        [attr.y]="getWaterfallY(step)"
                        [attr.width]="getWaterfallWidth()"
                        [attr.height]="getWaterfallHeight(step)"
                        [attr.fill]="step.isTotal ? '#2563eb' : (step.isPositive ? '#10b981' : '#ef4444')"
                        rx="2"
                      />
                      <text class="wf-val-label" [attr.x]="getWaterfallX($index) + getWaterfallWidth() / 2" [attr.y]="getWaterfallY(step) - 6" text-anchor="middle">
                        {{ step.changeFormatted }}
                      </text>
                      <text
                        class="axis-label x-axis-label rotated-x-label"
                        [attr.x]="getWaterfallX($index) + getWaterfallWidth() / 2"
                        [attr.y]="baseY + 16"
                        [attr.transform]="'rotate(-28 ' + (getWaterfallX($index) + getWaterfallWidth() / 2) + ' ' + (baseY + 16) + ')'"
                        text-anchor="end"
                      >
                        {{ step.shortLabel }}
                      </text>
                    </g>
                  }
                </g>
              }

              <!-- ── I. DONUT RENDERER (3D Composition & Share) ── -->
              @if (selectedType() === 'donut') {
                <g class="donut-layer" transform="translate(40, 10)" filter="url(#donut3dDepth)">
                  <!-- 3D Isometric Base Shadow Ring -->
                  <circle cx="140" cy="142" r="95" fill="rgba(15, 23, 42, 0.12)" />
                  <g class="donut-slices-group">
                    @for (slice of donutSlices(); track slice.label) {
                      <path
                        [attr.d]="slice.pathD"
                        [attr.fill]="slice.color"
                        class="donut-slice"
                        (mouseenter)="hoveredDonut.set(slice)"
                        (mouseleave)="hoveredDonut.set(null)"
                      />
                    }
                    <!-- Center Hole Content with 3D Bevel -->
                    <circle cx="140" cy="135" r="54" fill="var(--card-surface)" stroke="var(--border-color)" stroke-width="1.5"/>
                    <text x="140" y="130" text-anchor="middle" class="donut-center-total">{{ formatCompactCurrency(activeTotalAmount()) }}</text>
                    <text x="140" y="146" text-anchor="middle" class="donut-center-sub">{{ trendData().metricLabel || 'Total' }}</text>
                  </g>
                  <!-- Donut Legend Table on Right -->
                  <g class="donut-legend" transform="translate(290, 20)">
                    @for (slice of donutSlices(); track slice.label) {
                      <g [attr.transform]="'translate(0, ' + ($index * 24) + ')'" class="donut-legend-row">
                        <rect x="0" y="0" width="10" height="10" [attr.fill]="slice.color" rx="2"/>
                        <text x="18" y="9" class="donut-legend-name">{{ slice.label }}</text>
                        <text x="210" y="9" text-anchor="end" class="donut-legend-val">{{ formatCompactCurrency(slice.amount) }}</text>
                        <text x="255" y="9" text-anchor="end" class="donut-legend-pct">{{ slice.percentage }}%</text>
                      </g>
                    }
                  </g>
                </g>
              }

              <!-- ── X-Axis Labels (Dates/Entities, rotatable to never congest) ── -->
              @if (selectedType() !== 'histogram' && selectedType() !== 'donut' && selectedType() !== 'waterfall') {
                <g class="x-axis-layer">
                  @for (item of calculatedPoints(); track item.point.pointIndex) {
                    @if (shouldRenderXLabel($index, calculatedPoints().length)) {
                      <g
                        class="x-label-group"
                        [class.selected]="selectedMonth() === item.point.month"
                        (click)="toggleMonthSelection(item.point)"
                        cursor="pointer"
                      >
                        @if (isRotatedXLabel(calculatedPoints().length)) {
                          <text
                            class="axis-label x-axis-label rotated-x-label"
                            [attr.x]="item.slotCenter"
                            [attr.y]="baseY + 16"
                            [attr.transform]="'rotate(-28 ' + item.slotCenter + ' ' + (baseY + 16) + ')'"
                            text-anchor="end"
                          >
                            {{ item.point.shortMonth }}
                          </text>
                        } @else {
                          <text
                            class="axis-label x-axis-label"
                            [attr.x]="item.slotCenter"
                            [attr.y]="baseY + 20"
                            text-anchor="middle"
                          >
                            {{ item.point.shortMonth }}
                          </text>
                        }
                        @if (selectedMonth() === item.point.month) {
                          <rect [attr.x]="item.slotCenter - 10" [attr.y]="baseY + 26" width="20" height="2.5" rx="1" class="label-active-indicator"/>
                        }
                      </g>
                    }
                  }
                </g>
              }
            </svg>
          </div>

          <!-- Floating Interactive Tooltip -->
          @if (hoveredPoint()) {
            <div class="chart-tooltip" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
              <div class="tooltip-header">
                <span class="tooltip-month">{{ hoveredPoint()!.point.month }}</span>
                @if (!isMultiSeries()) {
                  <span class="tooltip-badge">{{ formatPercentOfMax(hoveredPoint()!.point.amount) }} of peak</span>
                }
              </div>

              @if (isMultiSeries()) {
                <div class="tooltip-series-list">
                  @for (s of activeSeriesList(); track s.id) {
                    <div class="tooltip-series-row">
                      <span class="tooltip-series-indicator" [style.background]="s.color"></span>
                      <span class="tooltip-series-name">{{ s.name }}</span>
                      <span class="tooltip-series-val" [class.missing]="isPointMissing(hoveredPoint()!.point, s)">
                        {{ getPointEntityValue(hoveredPoint()!.point, s) }}
                      </span>
                    </div>
                  }
                </div>
              } @else {
                <div class="tooltip-amount-row">
                  <span class="tooltip-label">{{ trendData().metricLabel || 'Amount' }}</span>
                  <span class="tooltip-amount">{{ hoveredPoint()!.point.rawAmount }}</span>
                </div>
                @if (hoveredPoint()!.point.invoiceCount) {
                  <div class="tooltip-count-row">
                    <span class="tooltip-label">{{ trendData().secondaryMetricLabel || 'Volume' }}</span>
                    <span class="tooltip-count">{{ hoveredPoint()!.point.invoiceCount }}</span>
                  </div>
                }
              }
            </div>
          }
        </div>

        <!-- ── 6b. ADAPTIVE SIDE-BY-SIDE COMPARISON ANALYSIS TABLE ── -->
        @if (comparisonTableRows().length >= 2) {
          <div class="comparison-analysis-card">
            <div class="comparison-card-header">
              <div class="comp-title-group">
                <div class="comp-icon-box">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                  </svg>
                </div>
                <div>
                  <h5 class="comp-title">{{ dimensionLabel() }} Comparison Analysis</h5>
                  @if (headToHeadSummary()) {
                    <p class="head-to-head-callout">{{ headToHeadSummary() }}</p>
                  }
                </div>
              </div>
              <span class="comp-count-pill">{{ comparisonTableRows().length }} {{ dimensionLabel() }}s Compared</span>
            </div>

            <div class="comp-table-container">
              <table class="comp-table">
                <thead>
                  <tr>
                    <th>{{ dimensionLabel() }}</th>
                    <th class="text-right">{{ trendData().metricLabel || 'Value' }}</th>
                    <th class="text-right">Share of Total</th>
                    <th class="text-right">Variance vs Leader</th>
                    <th class="text-center">Evaluation</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of comparisonTableRows(); track row.entityName) {
                    <tr [class.leader-row]="row.isLeader">
                      <td class="comp-entity-col">
                        <span class="comp-color-dot" [style.background-color]="row.color"></span>
                        <span class="comp-entity-name">{{ row.entityName }}</span>
                        @if (row.isLeader) {
                          <span class="comp-leader-badge">Top Performer</span>
                        }
                      </td>
                      <td class="text-right font-mono font-bold">{{ row.rawAmount }}</td>
                      <td class="text-right">
                        <div class="comp-share-cell">
                          <div class="comp-share-bar" [style.width.%]="row.sharePct" [style.background-color]="row.color"></div>
                          <span class="font-mono text-xs">{{ row.sharePct }}%</span>
                        </div>
                      </td>
                      <td class="text-right font-mono text-xs">
                        @if (row.isLeader) {
                          <span class="comp-baseline-tag">Baseline</span>
                        } @else {
                          <span class="comp-delta-val" [class.negative]="row.diffFromLeader < 0" [class.positive]="row.diffFromLeader > 0">
                            {{ row.diffFormatted }} ({{ row.diffPercentFormatted }})
                          </span>
                        }
                      </td>
                      <td class="text-center">
                        <span class="comp-eval-chip" [class.best]="row.isLeader" [class.warn]="row.evaluation === 'Lagging'">
                          {{ row.evaluation }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ── 7. FOCUS CARD ── -->
        @if (selectedPoint()) {
          <div class="month-focus-panel">
            <div class="focus-left">
              <div class="focus-badge">
                <span class="pulse-indicator"></span>
                Selected {{ trendData().dimensionLabel || 'Item' }}
              </div>
              <h4 class="focus-month-title">{{ selectedPoint()!.month }}</h4>
              <div class="focus-metrics-row">
                <div class="metric-box">
                  <span class="metric-lbl">{{ trendData().metricLabel || 'Total Amount' }}</span>
                  <span class="metric-val primary">{{ selectedPoint()!.rawAmount }}</span>
                </div>
                @if (selectedPoint()!.invoiceCount) {
                  <div class="metric-box">
                    <span class="metric-lbl">{{ trendData().secondaryMetricLabel || 'Volume' }}</span>
                    <span class="metric-val secondary">{{ selectedPoint()!.invoiceCount }}</span>
                  </div>
                }
                <div class="metric-box">
                  <span class="metric-lbl">Share of Filtered Total</span>
                  <span class="metric-val tertiary">{{ getShareOfTotal(selectedPoint()!.amount) }}</span>
                </div>
              </div>
            </div>
            <div class="focus-right">
              <button class="reset-selection-btn" (click)="clearMonthSelection()">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Clear Focus</span>
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; width: 100%; margin-top: 14px; position: relative; }

    .trend-clarification-card {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 16px 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      animation: fadeIn 200ms ease;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .clarification-header { display: flex; align-items: flex-start; gap: 12px; }
    .clarification-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-base);
      background: oklch(0.58 0.16 256 / 0.1);
      border: 1px solid oklch(0.58 0.16 256 / 0.25);
      color: var(--primary-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .clarification-text-group { display: flex; flex-direction: column; gap: 3px; }
    .clarification-title { font-size: 0.9rem; font-weight: 700; color: var(--foreground); }
    .clarification-desc { font-size: 0.8rem; color: var(--muted-text); line-height: 1.45; strong { color: var(--foreground); } }
    .clarification-options { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .clarification-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 13px;
      border-radius: var(--radius-pill);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      color: var(--foreground);
      transition: all 0.15s ease;
      &:hover { background: var(--card-surface); border-color: var(--primary-accent); color: var(--primary-accent); }
      &.primary { background: var(--primary-accent); border-color: var(--primary-accent); color: #fff; &:hover { opacity: 0.92; } }
      &.custom { border-style: dashed; }
    }

    .trend-declined-card {
      background: var(--secondary-surface);
      border: 1px dashed var(--border-color);
      border-radius: var(--radius-base);
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .declined-info { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--muted-text); }
    .reopen-chart-btn {
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--primary-accent);
      cursor: pointer;
      &:hover { background: var(--card-surface); }
    }

    .trend-card {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 16px 20px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      position: relative;
      animation: fadeIn 250ms ease;
    }

    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .metric-title-wrap { display: flex; align-items: flex-start; gap: 10px; }
    .chart-icon-box {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-base);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      color: var(--primary-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .metric-title { font-size: 0.94rem; font-weight: 700; color: var(--foreground); margin: 0 0 4px 0; letter-spacing: -0.01em; }
    .metric-meta-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .meta-pill {
      font-size: 0.72rem;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: var(--radius-pill);
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      &.highlight {
        background: oklch(0.58 0.16 256 / 0.1);
        border-color: oklch(0.58 0.16 256 / 0.25);
        color: oklch(0.48 0.15 256);
        font-weight: 600;
      }
      &.count-pill { color: var(--muted-text); }
    }
    .header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; position: relative; }

    .chart-catalog-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding: 4px 6px;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .catalog-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--muted-text);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding-left: 4px;
      flex-shrink: 0;
    }
    .catalog-tabs-container { display: flex; align-items: center; gap: 4px; flex-wrap: nowrap; }
    .catalog-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 9px;
      border-radius: 4px;
      background: transparent;
      border: 1px solid transparent;
      color: var(--muted-text);
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      &:hover:not(.active) {
        color: var(--foreground);
        background: var(--card-surface);
        border-color: var(--border-color);
      }
      &.active {
        background: var(--card-surface);
        border-color: var(--primary-accent);
        color: var(--primary-accent);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
    }

    .filters-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      padding: 6px 10px;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
    }
    .presets-group { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .preset-pill-btn {
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover { border-color: var(--primary-accent); color: var(--primary-accent); }
      &.active {
        background: oklch(0.58 0.16 256 / 0.12);
        border-color: var(--primary-accent);
        color: var(--primary-accent);
      }
    }
    .filter-divider { width: 1px; height: 18px; background: var(--border-color); margin: 0 2px; }
    .filter-item { display: inline-flex; align-items: center; gap: 5px; position: relative; }
    .filter-label { font-size: 0.74rem; font-weight: 600; color: var(--muted-text); }

    .picker-trigger-wrap { position: relative; }
    .picker-trigger-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 8px;
      height: 26px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--foreground);
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover, &.active { border-color: var(--primary-accent); color: var(--primary-accent); }
    }
    .picker-icon { color: var(--primary-accent); flex-shrink: 0; }
    .picker-chevron { color: var(--muted-text); }
    .calendar-popover {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      z-index: 70;
      padding: 12px;
      width: 260px;
      animation: fadeIn 150ms ease;
    }
    .popover-header {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color);
    }
    .popover-title { font-size: 0.78rem; font-weight: 700; color: var(--foreground); }
    .popover-bounds { font-size: 0.7rem; color: var(--muted-text); }
    .calendar-years-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .year-block { display: flex; flex-direction: column; gap: 4px; }
    .year-title { font-size: 0.72rem; font-weight: 700; color: var(--primary-accent); }
    .months-chips-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
    .month-chip-btn {
      padding: 3px 0;
      text-align: center;
      border-radius: 3px;
      background: var(--secondary-surface);
      border: 1px solid transparent;
      color: var(--foreground);
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.12s ease;
      &:hover:not(:disabled) { background: oklch(0.58 0.16 256 / 0.15); color: var(--primary-accent); }
      &.active { background: var(--primary-accent); color: #fff; }
      &:disabled { opacity: 0.3; cursor: not-allowed; background: transparent; }
    }

    .reset-range-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: transparent;
      border: 1px dashed var(--border-color);
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      margin-left: auto;
      transition: all 0.15s ease;
      &:hover { border-color: var(--primary-accent); color: var(--primary-accent); background: var(--card-surface); }
    }

    .chart-legend-row { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; padding: 4px 6px; flex-wrap: wrap; }
    .legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 0.74rem; font-weight: 600; color: var(--foreground); cursor: default; }
    .interactive-legend-item {
      cursor: pointer;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 3px 8px;
      transition: all 0.15s ease;
      &:hover { border-color: var(--primary-accent); }
      &.dimmed { opacity: 0.45; text-decoration: line-through; }
    }
    .legend-color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .legend-color-line { width: 14px; height: 0; }
    .legend-meta { font-size: 0.7rem; color: var(--muted-text); font-weight: 500; }

    .control-group {
      display: inline-flex;
      align-items: center;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      padding: 2px;
      gap: 2px;
      position: relative;
    }
    .zoom-group .ctrl-btn, .export-group .ctrl-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--muted-text);
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover:not(:disabled) { background: var(--card-surface); color: var(--foreground); }
      &:disabled { opacity: 0.35; cursor: not-allowed; }
      &.active { background: var(--card-surface); color: var(--primary-accent); }
      &.reset-btn {
        min-width: 40px;
        font-family: var(--font-mono);
        font-variant-numeric: tabular-nums;
        &.active { color: var(--primary-accent); }
      }
    }

    .export-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      z-index: 60;
      display: flex;
      flex-direction: column;
      padding: 4px;
      min-width: 170px;
      animation: fadeIn 150ms ease;
    }
    .dropdown-opt-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 4px;
      background: transparent;
      border: none;
      color: var(--foreground);
      font-size: 0.74rem;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease;
      &:hover { background: var(--secondary-surface); color: var(--primary-accent); }
    }

    .chart-viewport {
      position: relative;
      width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      cursor: crosshair;
      border-radius: var(--radius-base);
      outline: none;
      scrollbar-width: thin;
      scrollbar-color: var(--border-color) transparent;
      &::-webkit-scrollbar { height: 6px; }
      &::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 4px;
        &:hover { background: oklch(0.7 0.015 260); }
      }
    }
    .svg-container { width: 100%; }
    .trend-svg { width: 100%; height: 290px; display: block; }

    .grid-line { stroke: var(--border-color); stroke-width: 1; stroke-dasharray: 4 4; }
    .baseline { stroke: oklch(0.8 0.015 260); stroke-width: 1.5; }
    .axis-label {
      font-size: 10.5px;
      font-weight: 500;
      fill: var(--muted-text);
      user-select: none;
      font-family: var(--font-mono);
    }
    .x-axis-label { font-size: 10px; font-weight: 600; font-family: var(--font-sans); }
    .x-label-group {
      &:hover .x-axis-label, &.selected .x-axis-label { fill: var(--primary-accent); font-weight: 700; }
    }
    .label-active-indicator { fill: var(--primary-accent); }

    .clean-trend-line.primary { stroke: #2563eb; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .clean-trend-line.secondary { stroke: #d97706; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 3 3; }
    .area-top-line { stroke: #2563eb; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
    .trend-area-path { fill: rgba(37, 99, 235, 0.18); opacity: 1; }

    .data-point-group {
      cursor: pointer;
      .point-halo { fill: #2563eb; fill-opacity: 0; transition: fill-opacity 0.15s ease, r 0.15s ease; }
      .point-outer.primary { fill: #fff; stroke: #2563eb; stroke-width: 2.2; }
      .point-inner.primary { fill: #2563eb; }
      .point-outer.secondary { fill: #fff; stroke: #d97706; stroke-width: 2; }
      &:hover, &.selected { .point-halo { fill-opacity: 0.18; r: 14; } }
    }

    .bars-layer {
      animation: barFadeIn 250ms ease-out;
    }
    @keyframes barFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .bar-column-group {
      cursor: pointer;
      .bar-hitbox { pointer-events: all; }
      .bar-hover-bg {
        fill: oklch(0.58 0.16 256 / 0.08);
        opacity: 0;
        transition: opacity 0.15s ease;
        pointer-events: none;
      }
      &:hover .bar-hover-bg { opacity: 1; }
      .bar-front {
        fill: #2563eb;
        transition: fill 0.15s ease, filter 0.15s ease;
      }
      &:hover .bar-front {
        fill: #1d4ed8;
        filter: brightness(1.1) drop-shadow(0 2px 6px rgba(37, 99, 235, 0.4));
      }
      &.selected .bar-front {
        fill: #1e40af;
        stroke: #93c5fd;
        stroke-width: 1.5;
        filter: drop-shadow(0 0 6px rgba(37, 99, 235, 0.5));
      }
    }

    /* ── 3D Interactive Animated Bar Chart Styles ── */
    .bar-3d-group {
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.22s ease;
      cursor: pointer;
      &:hover {
        transform: translateY(-5px);
        filter: drop-shadow(0 8px 16px rgba(37, 99, 235, 0.35));
      }
    }
    .bar-front-3d {
      transition: opacity 0.2s ease, filter 0.2s ease;
      animation: barRise3D 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
      transform-origin: bottom;
    }
    .bar-top-3d {
      transition: opacity 0.2s ease, filter 0.2s ease;
      animation: barRise3D 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
      transform-origin: bottom;
    }
    .bar-side-3d {
      transition: opacity 0.2s ease, filter 0.2s ease;
      animation: barRise3D 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
      transform-origin: bottom;
    }
    .bar-ground-shadow {
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .bar-3d-group:hover .bar-ground-shadow {
      transform: scale(1.15);
      opacity: 0.85;
    }
    .bar-top-value-label {
      font-size: 11px;
      font-weight: 700;
      fill: var(--foreground, #0f172a);
      pointer-events: none;
      opacity: 0.92;
      transition: opacity 0.2s ease, fill 0.2s ease;
    }
    .bar-3d-group:hover .bar-top-value-label {
      fill: #2563eb;
      opacity: 1;
    }
    .rotated-x-label {
      font-size: 10.5px;
      font-weight: 500;
      fill: var(--text-secondary, #475569);
      transition: fill 0.2s ease, font-weight 0.2s ease;
    }
    .bar-3d-group:hover .rotated-x-label {
      fill: #2563eb;
      font-weight: 700;
    }
    @keyframes barRise3D {
      0% {
        opacity: 0;
        transform: scaleY(0.05);
      }
      100% {
        opacity: 1;
        transform: scaleY(1);
      }
    }
    .donut-slice {
      transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.22s ease;
      cursor: pointer;
      &:hover {
        transform: scale(1.04);
        filter: drop-shadow(0 4px 10px rgba(15, 23, 42, 0.25));
      }
    }
    .hist-count-label {
      font-size: 10px;
      font-weight: 600;
      fill: #0369a1;
      pointer-events: none;
    }
    .hist-x-label {
      font-size: 10.5px;
      font-weight: 500;
      fill: var(--text-secondary, #475569);
    }


    .chart-tooltip {
      position: absolute;
      transform: translate(-50%, -105%);
      pointer-events: none;
      z-index: 50;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      padding: 8px 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      min-width: 160px;
    }
    .tooltip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border-color);
    }
    .tooltip-month { font-size: 0.76rem; font-weight: 700; color: var(--foreground); }
    .tooltip-badge {
      font-size: 0.68rem;
      font-weight: 600;
      color: oklch(0.48 0.15 256);
      background: oklch(0.58 0.16 256 / 0.1);
      padding: 1px 6px;
      border-radius: var(--radius-pill);
    }
    .tooltip-series-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .tooltip-series-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.74rem;
    }
    .tooltip-series-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-right: 4px;
    }
    .tooltip-series-name {
      color: var(--muted-text);
      flex: 1;
      text-align: left;
    }
    .tooltip-series-val {
      font-weight: 700;
      color: var(--foreground);
      font-family: var(--font-mono);
      &.missing {
        color: var(--muted-text);
        font-style: italic;
        font-weight: normal;
      }
    }
    .tooltip-amount-row, .tooltip-count-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.76rem;
    }
    .tooltip-label { color: var(--muted-text); }
    .tooltip-amount { font-weight: 700; color: var(--foreground); font-family: var(--font-mono); }
    .tooltip-count { font-weight: 600; color: var(--text-secondary); font-family: var(--font-mono); }

    .month-focus-panel {
      margin-top: 12px;
      padding: 10px 14px;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .focus-left { display: flex; flex-direction: column; gap: 4px; }
    .focus-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--primary-accent);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pulse-indicator { width: 6px; height: 6px; border-radius: 50%; background: #2563eb; }
    .focus-month-title { font-size: 0.98rem; font-weight: 700; color: var(--foreground); margin: 0; }
    .focus-metrics-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 2px; }
    .metric-box { display: flex; flex-direction: column; }
    .metric-lbl { font-size: 0.7rem; color: var(--muted-text); font-weight: 500; }
    .metric-val {
      font-size: 0.9rem;
      font-weight: 700;
      font-family: var(--font-mono);
      &.primary { color: var(--foreground); }
      &.secondary { color: #d97706; }
      &.tertiary { color: #059669; }
    }
    .focus-right { display: flex; align-items: center; }
    .reset-selection-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: var(--radius-base);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover { border-color: var(--primary-accent); color: var(--primary-accent); }
    }

    /* Scenario-Adaptive Entity Comparison Filter Bar */
    .entity-filter-bar {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 9px 12px;
      margin: 10px 0 12px;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
    }
    .entity-filter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .entity-filter-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--muted-text);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .entity-filter-hint {
      font-size: 0.7rem;
      color: var(--muted-text);
      opacity: 0.85;
    }
    .entity-filter-pills-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .entity-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--radius-pill);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--foreground);
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        border-color: var(--primary-accent);
        transform: translateY(-1px);
      }
      &.active {
        background: var(--primary-accent);
        color: #ffffff;
        border-color: var(--primary-accent);
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        .entity-color-dot {
          box-shadow: 0 0 0 1.5px #ffffff;
        }
      }
      &.all-pill {
        font-weight: 700;
      }
    }
    .entity-color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* Side-by-Side Comparison Analysis Table */
    .comparison-analysis-card {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 14px 16px;
      margin-top: 14px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 10px;
      animation: fadeIn 200ms ease;
    }
    .comparison-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .comp-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .comp-icon-box {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: oklch(0.58 0.16 256 / 0.1);
      border: 1px solid oklch(0.58 0.16 256 / 0.25);
      color: var(--primary-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .comp-title {
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0;
    }
    .head-to-head-callout {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--primary-accent);
      margin: 2px 0 0;
    }
    .comp-count-pill {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--muted-text);
      background: var(--secondary-surface);
      padding: 2px 8px;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-color);
    }
    .comp-table-container {
      overflow-x: auto;
      border-radius: var(--radius-base);
    }
    .comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      th {
        padding: 7px 10px;
        background: var(--secondary-surface);
        color: var(--muted-text);
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border-bottom: 1px solid var(--border-color);
      }
      td {
        padding: 8px 10px;
        border-bottom: 1px solid var(--border-color);
        color: var(--foreground);
      }
      tr:last-child td {
        border-bottom: none;
      }
      tr.leader-row td {
        background: oklch(0.58 0.16 256 / 0.03);
      }
    }
    .comp-entity-col {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .comp-color-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .comp-entity-name {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--foreground);
    }
    .comp-leader-badge {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      background: #dcfce7;
      color: #15803d;
      margin-left: 4px;
    }
    .comp-share-cell {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: flex-end;
    }
    .comp-share-bar {
      height: 6px;
      border-radius: 3px;
      max-width: 60px;
      min-width: 4px;
    }
    .comp-baseline-tag {
      color: var(--muted-text);
      font-style: italic;
    }
    .comp-delta-val {
      font-weight: 600;
      &.negative { color: #dc2626; }
      &.positive { color: #16a34a; }
    }
    .comp-eval-chip {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: var(--radius-pill);
      background: var(--secondary-surface);
      color: var(--muted-text);
      &.best { background: #dcfce7; color: #15803d; }
      &.warn { background: #fee2e2; color: #b91c1c; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class TrendChartComponent {
  readonly trendData = input.required<TrendSeries>();
  readonly userQuery = input<string>('');

  readonly paletteShades = PALETTE_SHADES;

  getEntityColor(idx: number): string {
    return EXECUTIVE_PALETTE[idx % EXECUTIVE_PALETTE.length];
  }

  readonly dimensionLabel = computed<string>(() => {
    const custom = this.trendData().dimensionLabel;
    if (custom) return custom;
    const labels = this.trendData().points.map(p => p.month);
    return inferDimensionFromLabels(labels, this.userQuery());
  });

  readonly isComparisonScenario = computed<boolean>(() => {
    const td = this.trendData();
    if (td.categoryType === 'category') return true;
    const q = (this.userQuery() || '').toLowerCase();
    if (/\b(compare|comparison|versus|vs|between|difference|vendor|supplier|product|plant|warehouse|customer|brand)\b/i.test(q)) {
      return true;
    }
    const hasDates = td.points.some(p => p.sortKey > 0);
    return !hasDates || td.points.length <= 8;
  });

  readonly allEntities = computed(() => {
    return this.trendData().points.map((p, idx) => ({
      id: p.month,
      label: p.shortMonth || p.month,
      pointIndex: p.pointIndex !== undefined ? p.pointIndex : idx,
      color: this.getEntityColor(p.pointIndex !== undefined ? p.pointIndex : idx)
    }));
  });

  readonly selectedEntityIds = signal<string[]>([]);

  isEntitySelected(id: string): boolean {
    const sel = this.selectedEntityIds();
    return sel.length === 0 || sel.includes(id);
  }

  toggleEntityFilter(id: string): void {
    const current = this.selectedEntityIds();
    if (current.length === 0) {
      this.selectedEntityIds.set([id]);
      return;
    }
    if (current.includes(id)) {
      const next = current.filter(x => x !== id);
      this.selectedEntityIds.set(next);
    } else {
      this.selectedEntityIds.set([...current, id]);
    }
  }

  selectAllEntities(): void {
    this.selectedEntityIds.set([]);
  }

  readonly isConfirmed = signal<boolean | null>(null);
  readonly isClarified = signal<boolean>(false);

  readonly selectedType = signal<ChartType>('line');
  readonly activePreset = signal<'all' | 'latest12' | 'latest24' | 'currentYear' | 'prevYear' | 'custom' | null>(null);

  readonly selectedFromIdx = signal<number>(-1);
  readonly selectedToIdx = signal<number>(-1);

  readonly isFromPickerOpen = signal<boolean>(false);
  readonly isToPickerOpen = signal<boolean>(false);
  readonly isDownloadMenuOpen = signal<boolean>(false);

  readonly selectedMonth = signal<string | null>(null);
  readonly hoveredPoint = signal<{ point: TrendDataPoint; x: number; y: number } | null>(null);
  readonly hoveredSeries = signal<string | null>(null);
  readonly hoveredDonut = signal<DonutSlice | null>(null);
  readonly zoomLevel = signal<number>(1.0);

  readonly tooltipX = signal<number>(0);
  readonly tooltipY = signal<number>(0);

  readonly hiddenSeriesIds = signal<Set<string>>(new Set());

  readonly isMultiSeries = computed<boolean>(() => {
    return (this.trendData().seriesList?.length || 0) >= 2;
  });

  readonly activeSeriesList = computed<DataSeries[]>(() => {
    const list = this.trendData().seriesList || [];
    const hidden = this.hiddenSeriesIds();
    return list.filter(s => !hidden.has(s.id));
  });

  readonly chartCard = viewChild<ElementRef<HTMLDivElement>>('chartCard');
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly chartSvg = viewChild<ElementRef<SVGSVGElement>>('chartSvg');

  readonly Math = Math;

  readonly gridLeft = 65;
  readonly plotTop = 30;
  readonly baseY = 226;

  readonly queryAnalysis = computed<UserQueryAnalysis>(() => {
    return analyzeUserQuery(this.userQuery(), this.trendData().points);
  });

  readonly suitableTypes = computed<ChartTypeMeta[]>(() => {
    return getSuitableChartTypes(this.trendData(), this.userQuery()).suitableTypes;
  });

  private _hasInitialized = false;

  constructor() {
    effect(() => {
      const data = this.trendData();
      if (!data?.points?.length) return;
      if (this._hasInitialized) return;

      const analysis = this.queryAnalysis();
      const suitability = getSuitableChartTypes(data, this.userQuery());

      // Set recommended default chart type only on first initialization
      this.selectedType.set(suitability.defaultType);

      // If user specified an explicit date range:
      if (analysis.explicitRangeFound && analysis.matchedFromIndex !== undefined && analysis.matchedToIndex !== undefined) {
        this.selectedFromIdx.set(analysis.matchedFromIndex);
        this.selectedToIdx.set(analysis.matchedToIndex);
        this.activePreset.set('custom');
        this.isClarified.set(true);
        this.isConfirmed.set(true);
        this._hasInitialized = true;
        return;
      }

      // If dataset <= 12 points, no ambiguity:
      if (!analysis.isAmbiguous) {
        this.selectedFromIdx.set(data.points[0].pointIndex);
        this.selectedToIdx.set(data.points[data.points.length - 1].pointIndex);
        this.activePreset.set('all');
        this.isClarified.set(true);
        this.isConfirmed.set(true);
        this._hasInitialized = true;
        return;
      }

      // Otherwise ambiguous -> initialize default indices to full range
      this.selectedFromIdx.set(data.points[0].pointIndex);
      this.selectedToIdx.set(data.points[data.points.length - 1].pointIndex);
      this.activePreset.set('all');
      this._hasInitialized = true;
    });
  }

  // ─── Initial Clarification Handlers ────────────────────────────────────────

  chooseInitialOption(choice: 'all' | 'latest12' | 'latest24' | 'custom'): void {
    const pts = this.trendData().points;
    if (!pts.length) return;

    if (choice === 'all') {
      this.selectedFromIdx.set(pts[0].pointIndex);
      this.selectedToIdx.set(pts[pts.length - 1].pointIndex);
      this.activePreset.set('all');
    } else if (choice === 'latest12') {
      const startIdx = Math.max(0, pts.length - 12);
      this.selectedFromIdx.set(pts[startIdx].pointIndex);
      this.selectedToIdx.set(pts[pts.length - 1].pointIndex);
      this.activePreset.set('latest12');
    } else if (choice === 'latest24') {
      const startIdx = Math.max(0, pts.length - 24);
      this.selectedFromIdx.set(pts[startIdx].pointIndex);
      this.selectedToIdx.set(pts[pts.length - 1].pointIndex);
      this.activePreset.set('latest24');
    } else if (choice === 'custom') {
      this.selectedFromIdx.set(pts[0].pointIndex);
      this.selectedToIdx.set(pts[pts.length - 1].pointIndex);
      this.activePreset.set('custom');
      this.isFromPickerOpen.set(true);
    }

    this.isClarified.set(true);
    this.isConfirmed.set(true);
  }

  reopenChart(): void {
    this.isConfirmed.set(true);
    this.isClarified.set(true);
  }

  // ─── Date Range & Calendar Data ────────────────────────────────────────────

  readonly availableYears = computed<number[]>(() => {
    const pts = this.trendData().points;
    const yrs = Array.from(new Set(pts.map(p => p.year).filter((y): y is number => typeof y === 'number'))).sort((a, b) => a - b);
    return yrs;
  });

  readonly latestYear = computed<number | null>(() => {
    const yrs = this.availableYears();
    return yrs.length > 0 ? yrs[yrs.length - 1] : null;
  });

  readonly previousYear = computed<number | null>(() => {
    const yrs = this.availableYears();
    return yrs.length > 1 ? yrs[yrs.length - 2] : null;
  });

  getMonthsForYear(year: number): MonthOption[] {
    const allPts = this.trendData().points;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const shortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthNames.map((mName, mIdx) => {
      const sortKey = year * 100 + (mIdx + 1);
      const existing = allPts.find(p => p.year === year && p.monthIndex === mIdx);
      return {
        pointIndex: existing ? existing.pointIndex : -1,
        month: `${mName} ${year}`,
        shortMonth: `${shortNames[mIdx]} '${String(year).slice(2)}`,
        sortKey,
        year,
        monthIndex: mIdx,
        amount: existing ? existing.amount : 0,
        isAvailable: !!existing
      };
    });
  }

  toggleFromPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.isToPickerOpen.set(false);
    this.isFromPickerOpen.update(v => !v);
  }

  toggleToPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.isFromPickerOpen.set(false);
    this.isToPickerOpen.update(v => !v);
  }

  closePopoversOnBackdrop(event: MouseEvent): void {
    this.isFromPickerOpen.set(false);
    this.isToPickerOpen.set(false);
    this.isDownloadMenuOpen.set(false);
  }

  selectFromMonth(pointIndex: number): void {
    if (pointIndex < 0) return;
    this.selectedFromIdx.set(pointIndex);
    this.activePreset.set('custom');
    this.isFromPickerOpen.set(false);

    // If To is earlier than From, push To forward
    const all = this.trendData().points;
    const fromPt = all.find(p => p.pointIndex === pointIndex);
    const toPt = all.find(p => p.pointIndex === this.selectedToIdx());
    if (fromPt && toPt && fromPt.sortKey > toPt.sortKey) {
      this.selectedToIdx.set(pointIndex);
    }
  }

  selectToMonth(pointIndex: number): void {
    if (pointIndex < 0) return;
    this.selectedToIdx.set(pointIndex);
    this.activePreset.set('custom');
    this.isToPickerOpen.set(false);

    // If From is later than To, pull From back
    const all = this.trendData().points;
    const toPt = all.find(p => p.pointIndex === pointIndex);
    const fromPt = all.find(p => p.pointIndex === this.selectedFromIdx());
    if (fromPt && toPt && fromPt.sortKey > toPt.sortKey) {
      this.selectedFromIdx.set(pointIndex);
    }
  }

  // ─── Active Filtered Dataset (True inclusive date range filtering) ──────────

  readonly activePoints = computed<TrendDataPoint[]>(() => {
    const all = this.trendData().points;
    if (!all || all.length === 0) return [];

    if (this.isComparisonScenario()) {
      const selected = this.selectedEntityIds();
      if (selected.length > 0) {
        return all.filter(p => selected.includes(p.month));
      }
      return all;
    }

    const fromIdx = this.selectedFromIdx();
    const toIdx = this.selectedToIdx();

    if (fromIdx < 0 || toIdx < 0) return all;

    const fromPt = all.find(p => p.pointIndex === fromIdx);
    const toPt = all.find(p => p.pointIndex === toIdx);

    if (!fromPt || !toPt) return all;

    const minKey = Math.min(fromPt.sortKey, toPt.sortKey);
    const maxKey = Math.max(fromPt.sortKey, toPt.sortKey);

    const filtered = all.filter(p => p.sortKey >= minKey && p.sortKey <= maxKey);
    return filtered.sort((a, b) => a.sortKey - b.sortKey);
  });

  readonly comparisonTableRows = computed<ComparisonTableRow[]>(() => {
    const points = this.activePoints();
    if (!points || points.length < 2) return [];

    const total = points.reduce((acc, p) => acc + Math.abs(p.amount), 0);
    const sorted = [...points].sort((a, b) => b.amount - a.amount);
    const leader = sorted[0];

    return points.map(p => {
      const isLeader = p.pointIndex === leader.pointIndex;
      const sharePct = total > 0 ? Math.round((Math.abs(p.amount) / total) * 1000) / 10 : 0;
      const diffFromLeader = p.amount - leader.amount;
      const diffFormatted = isLeader ? 'Baseline' : this._formatDiffAmount(diffFromLeader);
      const diffPercentFormatted = isLeader
        ? '0%'
        : (leader.amount !== 0
            ? `${diffFromLeader > 0 ? '+' : ''}${((diffFromLeader / leader.amount) * 100).toFixed(1)}%`
            : '0%');

      let evaluation = 'Lagging';
      if (isLeader) {
        evaluation = 'Top Performer';
      } else if (leader.amount > 0 && p.amount >= leader.amount * 0.8) {
        evaluation = 'Competitive';
      }

      return {
        entityName: p.month,
        color: this.getEntityColor(p.pointIndex),
        amount: p.amount,
        rawAmount: p.rawAmount || this.formatCompactCurrency(p.amount),
        sharePct,
        diffFromLeader,
        diffFormatted,
        diffPercentFormatted,
        isLeader,
        evaluation
      };
    });
  });

  readonly headToHeadSummary = computed<string | null>(() => {
    const rows = this.comparisonTableRows();
    if (rows.length < 2) return null;

    const dim = this.dimensionLabel();
    const sorted = [...rows].sort((a, b) => b.amount - a.amount);
    const leader = sorted[0];
    const runnerUp = sorted[1];

    if (rows.length === 2) {
      const diff = leader.amount - runnerUp.amount;
      const diffPct = runnerUp.amount > 0 ? ((diff / runnerUp.amount) * 100).toFixed(1) : '0';
      return `${leader.entityName} leads ${runnerUp.entityName} by ${this._formatDiffAmount(diff)} (+${diffPct}% higher)`;
    }

    return `${leader.entityName} is the leading ${dim.toLowerCase()} with ${leader.sharePct}% share, outpacing ${runnerUp.entityName} by ${this._formatDiffAmount(leader.amount - runnerUp.amount)}`;
  });

  readonly selectedFromPoint = computed<TrendDataPoint | null>(() => {
    const all = this.trendData().points;
    const idx = this.selectedFromIdx();
    return all.find(p => p.pointIndex === idx) || all[0] || null;
  });

  readonly selectedToPoint = computed<TrendDataPoint | null>(() => {
    const all = this.trendData().points;
    const idx = this.selectedToIdx();
    return all.find(p => p.pointIndex === idx) || all[all.length - 1] || null;
  });

  readonly isRangeCustomized = computed<boolean>(() => {
    const all = this.trendData().points;
    if (all.length <= 1) return false;
    return this.selectedFromIdx() !== all[0].pointIndex || this.selectedToIdx() !== all[all.length - 1].pointIndex;
  });

  readonly activeDateRangeLabel = computed<string>(() => {
    const pts = this.activePoints();
    if (!pts.length) return '';
    return `${pts[0].shortMonth} – ${pts[pts.length - 1].shortMonth}`;
  });

  readonly activeMaxAmount = computed<number>(() => {
    const pts = this.activePoints();
    if (!pts.length) return 0;
    const isStacked = this.selectedType() === 'stacked-bar';
    const activeSeries = this.activeSeriesList();

    if (isStacked && activeSeries.length > 1) {
      return pts.reduce((maxSum, pt) => {
        let periodSum = 0;
        for (const s of activeSeries) {
          const ev = pt.entityValues?.[s.name];
          if (ev && !ev.isMissing) {
            periodSum += ev.amount;
          }
        }
        return Math.max(maxSum, periodSum);
      }, 0);
    }

    if (this.isMultiSeries() && activeSeries.length > 0) {
      return pts.reduce((maxVal, pt) => {
        let ptMax = 0;
        for (const s of activeSeries) {
          const ev = pt.entityValues?.[s.name];
          if (ev && !ev.isMissing) {
            ptMax = Math.max(ptMax, ev.amount);
          }
        }
        return Math.max(maxVal, ptMax);
      }, 0);
    }

    return pts.reduce((m, p) => Math.max(m, p.amount), 0);
  });

  readonly activeMaxCount = computed<number>(() => {
    const pts = this.activePoints();
    return pts.reduce((m, p) => Math.max(m, p.invoiceCountNum || 0), 0);
  });

  readonly activePeakPoint = computed<TrendDataPoint>(() => {
    const pts = this.activePoints();
    if (!pts.length) return this.trendData().peakPoint;
    return pts.reduce((peak, p) => (p.amount > peak.amount ? p : peak), pts[0]);
  });

  readonly activeTotalAmount = computed<number>(() => {
    return this.activePoints().reduce((s, p) => s + p.amount, 0);
  });

  // ─── Preset Handlers ───

  setPreset(preset: 'all' | 'latest12' | 'latest24' | 'currentYear' | 'prevYear'): void {
    const pts = this.trendData().points;
    if (!pts.length) return;

    this.activePreset.set(preset);
    this.selectedMonth.set(null);
    this.isFromPickerOpen.set(false);
    this.isToPickerOpen.set(false);

    if (preset === 'all') {
      this.selectedFromIdx.set(pts[0].pointIndex);
      this.selectedToIdx.set(pts[pts.length - 1].pointIndex);
    } else if (preset === 'latest12') {
      const startIdx = Math.max(0, pts.length - 12);
      this.selectedFromIdx.set(pts[startIdx].pointIndex);
      this.selectedToIdx.set(pts[pts.length - 1].pointIndex);
    } else if (preset === 'latest24') {
      const startIdx = Math.max(0, pts.length - 24);
      this.selectedFromIdx.set(pts[startIdx].pointIndex);
      this.selectedToIdx.set(pts[pts.length - 1].pointIndex);
    } else if (preset === 'currentYear') {
      const yr = this.latestYear();
      if (yr) {
        const yrPts = pts.filter(p => p.year === yr);
        if (yrPts.length > 0) {
          this.selectedFromIdx.set(yrPts[0].pointIndex);
          this.selectedToIdx.set(yrPts[yrPts.length - 1].pointIndex);
        }
      }
    } else if (preset === 'prevYear') {
      const yr = this.previousYear();
      if (yr) {
        const yrPts = pts.filter(p => p.year === yr);
        if (yrPts.length > 0) {
          this.selectedFromIdx.set(yrPts[0].pointIndex);
          this.selectedToIdx.set(yrPts[yrPts.length - 1].pointIndex);
        }
      }
    }
  }

  // ─── Chart Catalog Selection ───

  selectType(type: ChartType): void {
    this.selectedType.set(type);
  }

  isMultiSeriesVisible(): boolean {
    if (this.isMultiSeries()) return true;
    const t = this.selectedType();
    return t === 'multi-line' || t === 'grouped-bar' || t === 'stacked-bar';
  }

  // ─── Dynamic Viewport Sizing (Zero data slicing) ───

  readonly viewportSvgWidth = computed<number>(() => {
    const t = this.selectedType();
    if (t === 'donut') return 680;
    if (t === 'histogram') return Math.round(Math.max(680, this.histogramBins().length * 140) * this.zoomLevel());
    const count = this.activePoints().length;
    const minWidth = 680;
    const slotW = count <= 8 ? 72 : (count <= 16 ? 54 : (count <= 28 ? 44 : 38));
    const baseW = Math.max(minWidth, this.gridLeft + count * slotW + 50);
    return Math.round(baseW * this.zoomLevel());
  });

  readonly gridRight = computed<number>(() => {
    return this.viewportSvgWidth() - 30;
  });

  // ─── Y-Axis Ticks (Numeric/currency ONLY) ───

  readonly yTicks = computed<Tick[]>(() => {
    const data = this.trendData();
    const maxVal = this.activeMaxAmount();
    if (maxVal <= 0) return [];
    const ceiling = this._calculateCeiling(maxVal);
    const steps = 4;
    const availH = this.baseY - this.plotTop;
    const sym = this._getSanitizedCurrencySymbol(data.currencySymbol);

    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = (ceiling / steps) * i;
      return {
        value: val,
        label: this._formatTickValue(val, sym),
        y: Math.round(this.baseY - (val / ceiling) * availH)
      };
    });
  });

  // ─── Geometry Coordinates ───

  readonly slotWidth = computed<number>(() => {
    const count = this.activePoints().length;
    if (count === 0) return 40;
    const availW = this.gridRight() - this.gridLeft - 20;
    return availW / count;
  });

  readonly calculatedPoints = computed(() => {
    const pts = this.activePoints();
    const count = pts.length;
    if (count === 0) return [];
    const ceiling = this._calculateCeiling(this.activeMaxAmount());
    const countCeiling = this._calculateCeiling(this.activeMaxCount() || 100);
    const availW = this.gridRight() - this.gridLeft - 20;
    const availH = this.baseY - this.plotTop;
    const slotW = availW / count;
    const barW = Math.min(Math.max(slotW * 0.62, 26), 68);

    return pts.map((pt, i) => {
      const slotCenter = this.gridLeft + 10 + i * slotW + slotW / 2;
      const x = slotCenter - barW / 2;
      const h = ceiling > 0 ? (pt.amount / ceiling) * availH : 0;
      const countH = countCeiling > 0 ? ((pt.invoiceCountNum || 0) / countCeiling) * availH : 0;
      const roundedH = Math.max(Math.round(h), 2);
      const roundedY = Math.round(this.baseY - roundedH);
      return {
        point: pt,
        x: Math.round(x),
        y: roundedY,
        height: roundedH,
        countY: Math.round(this.baseY - countH),
        barWidth: Math.round(barW),
        slotCenter: Math.round(slotCenter)
      };
    });
  });

  readonly linePathD = computed(() => {
    const pts = this.calculatedPoints();
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].slotCenter} ${pts[0].y}`;
    let d = `M ${pts[0].slotCenter} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const c = pts[i], n = pts[i + 1];
      const cx = c.slotCenter + (n.slotCenter - c.slotCenter) / 2;
      d += ` C ${cx} ${c.y}, ${cx} ${n.y}, ${n.slotCenter} ${n.y}`;
    }
    return d;
  });

  readonly countLinePathD = computed(() => {
    const pts = this.calculatedPoints();
    if (!pts.length) return '';
    const validPts = pts.filter(p => p.countY !== undefined);
    if (!validPts.length) return '';
    let d = `M ${validPts[0].slotCenter} ${validPts[0].countY}`;
    for (let i = 0; i < validPts.length - 1; i++) {
      const c = validPts[i], n = validPts[i + 1];
      const cx = c.slotCenter + (n.slotCenter - c.slotCenter) / 2;
      d += ` C ${cx} ${c.countY}, ${cx} ${n.countY}, ${n.slotCenter} ${n.countY}`;
    }
    return d;
  });

  readonly areaPathD = computed(() => {
    const pts = this.calculatedPoints();
    if (!pts.length) return '';
    const first = pts[0], last = pts[pts.length - 1];
    return `${this.linePathD()} L ${last.slotCenter} ${this.baseY} L ${first.slotCenter} ${this.baseY} Z`;
  });

  // ─── Specialized Renderers Data ───

  readonly histogramBins = computed<HistogramBin[]>(() => {
    return calculateHistogramBins(this.activePoints(), this._getSanitizedCurrencySymbol(this.trendData().currencySymbol), 4);
  });

  readonly waterfallSteps = computed<WaterfallStep[]>(() => {
    return calculateWaterfallData(this.activePoints(), this._getSanitizedCurrencySymbol(this.trendData().currencySymbol));
  });

  readonly donutSlices = computed<DonutSlice[]>(() => {
    if (this.isMultiSeries() && this.activeSeriesList().length >= 2) {
      const active = this.activeSeriesList();
      const entityTotals = active.map(s => ({
        series: s,
        total: this.getSeriesTotal(s)
      }));
      const grandTotal = entityTotals.reduce((acc, curr) => acc + curr.total, 0);
      if (grandTotal <= 0) return [];

      let currentAngle = 0;
      const cx = 140, cy = 135, r = 100, innerR = 58;
      return entityTotals.map((item) => {
        const pct = (item.total / grandTotal) * 100;
        const angle = (item.total / grandTotal) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        const rad1 = ((startAngle - 90) * Math.PI) / 180;
        const rad2 = ((endAngle - 90) * Math.PI) / 180;

        const x1 = cx + r * Math.cos(rad1);
        const y1 = cy + r * Math.sin(rad1);
        const x2 = cx + r * Math.cos(rad2);
        const y2 = cy + r * Math.sin(rad2);

        const ix1 = cx + innerR * Math.cos(rad2);
        const iy1 = cy + innerR * Math.sin(rad2);
        const ix2 = cx + innerR * Math.cos(rad1);
        const iy2 = cy + innerR * Math.sin(rad1);

        const largeArc = angle > 180 ? 1 : 0;
        const pathD = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

        return {
          label: item.series.name,
          shortLabel: item.series.name.length > 12 ? item.series.name.slice(0, 10) + '…' : item.series.name,
          amount: item.total,
          percentage: Math.round(pct),
          color: item.series.color,
          startAngle,
          endAngle,
          pathD
        };
      });
    }
    return calculateDonutSlices(this.activePoints());
  });

  readonly scatterPoints = computed(() => {
    const pts = this.activePoints();
    const maxAmount = this._calculateCeiling(this.activeMaxAmount());
    const maxCount = this._calculateCeiling(this.activeMaxCount() || 100);
    const availW = this.gridRight() - this.gridLeft - 30;
    const availH = this.baseY - this.plotTop;

    return pts.map(pt => {
      const countVal = pt.invoiceCountNum || pt.pointIndex * 10;
      const x = this.gridLeft + 15 + (countVal / maxCount) * availW;
      const y = this.baseY - (pt.amount / maxAmount) * availH;
      return {
        point: pt,
        x: Math.round(x),
        y: Math.round(y),
        r: Math.round(Math.min(Math.max(pt.amount / (maxAmount * 0.1), 4), 14))
      };
    });
  });

  getHistBinX(index: number): number {
    const availW = this.gridRight() - this.gridLeft - 20;
    const binW = this.getHistBinWidth();
    const count = this.histogramBins().length;
    const gap = (availW - count * binW) / (count + 1);
    return Math.round(this.gridLeft + 10 + gap + index * (binW + gap));
  }

  getHistBinY(count: number): number {
    const maxCount = Math.max(...this.histogramBins().map(b => b.count), 1);
    const availH = this.baseY - this.plotTop - 20;
    return Math.round(this.baseY - (count / maxCount) * availH);
  }

  getHistBinWidth(): number {
    const count = this.histogramBins().length;
    const availW = this.gridRight() - this.gridLeft - 30;
    return Math.round(Math.min(Math.max((availW / (count + 1)) * 0.72, 54), 105));
  }

  getWaterfallX(index: number): number {
    const count = this.waterfallSteps().length;
    const availW = this.gridRight() - this.gridLeft - 20;
    const slotW = availW / count;
    const barW = this.getWaterfallWidth();
    return Math.round(this.gridLeft + 10 + index * slotW + (slotW - barW) / 2);
  }

  getWaterfallY(step: WaterfallStep): number {
    const maxAmount = this._calculateCeiling(this.activeMaxAmount());
    const availH = this.baseY - this.plotTop;
    const upperVal = Math.max(step.startValue, step.endValue);
    return Math.round(this.baseY - (upperVal / maxAmount) * availH);
  }

  getWaterfallHeight(step: WaterfallStep): number {
    const maxAmount = this._calculateCeiling(this.activeMaxAmount());
    const availH = this.baseY - this.plotTop;
    const diff = Math.abs(step.endValue - step.startValue);
    return Math.max(Math.round((diff / maxAmount) * availH), 3);
  }

  getWaterfallWidth(): number {
    const count = this.waterfallSteps().length;
    const availW = this.gridRight() - this.gridLeft - 20;
    return Math.round(Math.min(Math.max((availW / count) * 0.6, 12), 42));
  }

  // ─── 3D Isometric Geometry Helpers ───

  getBar3dDepthX(barWidth: number): number {
    return Math.round(Math.min(Math.max(barWidth * 0.26, 6), 14));
  }

  getBar3dDepthY(barWidth: number): number {
    return Math.round(Math.min(Math.max(barWidth * 0.16, 4), 9));
  }

  getBar3dTopPoints(x: number, y: number, width: number): string {
    const dx = this.getBar3dDepthX(width);
    const dy = this.getBar3dDepthY(width);
    return `${x},${y} ${x + dx},${y - dy} ${x + width + dx},${y - dy} ${x + width},${y}`;
  }

  getBar3dSidePoints(x: number, y: number, width: number, height: number): string {
    const dx = this.getBar3dDepthX(width);
    const dy = this.getBar3dDepthY(width);
    const bottom = y + height;
    return `${x + width},${y} ${x + width + dx},${y - dy} ${x + width + dx},${bottom - dy} ${x + width},${bottom}`;
  }

  isRotatedXLabel(count: number): boolean {
    if (this.trendData().categoryType === 'category') return true;
    return count > 7;
  }

  shouldRenderXLabel(index: number, total: number): boolean {
    if (total <= 14) return true;
    if (total <= 24) return index % 2 === 0 || index === total - 1;
    if (total <= 36) return index % 3 === 0 || index === total - 1;
    return index % 4 === 0 || index === total - 1;
  }

  readonly selectedPoint = computed<TrendDataPoint | null>(() => {
    const m = this.selectedMonth();
    return m ? (this.activePoints().find(p => p.month === m) || null) : null;
  });

  toggleMonthSelection(point: TrendDataPoint): void {
    this.selectedMonth.set(this.selectedMonth() === point.month ? null : point.month);
  }

  clearMonthSelection(): void {
    this.selectedMonth.set(null);
  }

  toggleSeriesVisibility(seriesId: string): void {
    this.hiddenSeriesIds.update(set => {
      const next = new Set(set);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        const all = this.trendData().seriesList || [];
        if (next.size < all.length - 1) {
          next.add(seriesId);
        }
      }
      return next;
    });
  }

  getSeriesTotal(series: DataSeries): number {
    const pts = this.activePoints();
    return pts.reduce((sum, p) => {
      const ent = p.entityValues?.[series.name];
      if (ent && !ent.isMissing) return sum + ent.amount;
      return sum;
    }, 0);
  }

  multiLinePathD(series: DataSeries): string {
    const pts = this.calculatedPoints();
    if (!pts.length) return '';
    const validPts = pts.filter(p => {
      const ev = p.point.entityValues?.[series.name];
      return ev && !ev.isMissing;
    });
    if (!validPts.length) return '';
    const ceiling = this._calculateCeiling(this.activeMaxAmount());
    const availH = this.baseY - this.plotTop;

    const coords = validPts.map(p => {
      const ev = p.point.entityValues![series.name];
      const h = ceiling > 0 ? (ev.amount / ceiling) * availH : 0;
      return {
        x: p.slotCenter,
        y: Math.round(this.baseY - Math.max(h, 2))
      };
    });

    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const c = coords[i], n = coords[i + 1];
      const cx = c.x + (n.x - c.x) / 2;
      d += ` C ${cx} ${c.y}, ${cx} ${n.y}, ${n.x} ${n.y}`;
    }
    return d;
  }

  multiAreaPathD(series: DataSeries): string {
    const pts = this.calculatedPoints();
    if (!pts.length) return '';
    const validPts = pts.filter(p => {
      const ev = p.point.entityValues?.[series.name];
      return ev && !ev.isMissing;
    });
    if (validPts.length < 2) return '';
    const ceiling = this._calculateCeiling(this.activeMaxAmount());
    const availH = this.baseY - this.plotTop;
    const coords = validPts.map(p => {
      const ev = p.point.entityValues![series.name];
      const h = ceiling > 0 ? (ev.amount / ceiling) * availH : 0;
      return {
        x: p.slotCenter,
        y: Math.round(this.baseY - Math.max(h, 2))
      };
    });
    let lineD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const c = coords[i], n = coords[i + 1];
      const cx = c.x + (n.x - c.x) / 2;
      lineD += ` C ${cx} ${c.y}, ${cx} ${n.y}, ${n.x} ${n.y}`;
    }
    const first = coords[0], last = coords[coords.length - 1];
    return `${lineD} L ${last.x} ${this.baseY} L ${first.x} ${this.baseY} Z`;
  }

  getEntityPointY(item: any, series: DataSeries): number | null {
    const ev = item.point.entityValues?.[series.name];
    if (!ev || ev.isMissing) return null;
    const ceiling = this._calculateCeiling(this.activeMaxAmount());
    const availH = this.baseY - this.plotTop;
    const h = ceiling > 0 ? (ev.amount / ceiling) * availH : 0;
    return Math.round(this.baseY - Math.max(h, 2));
  }

  getEntityBar(item: any, series: DataSeries, sIdx: number, activeCount: number): { x: number; y: number; width: number; height: number } | null {
    const ev = item.point.entityValues?.[series.name];
    if (!ev || ev.isMissing) return null;
    const ceiling = this._calculateCeiling(this.activeMaxAmount());
    const availH = this.baseY - this.plotTop;
    const h = ceiling > 0 ? (ev.amount / ceiling) * availH : 0;
    const roundedH = Math.max(Math.round(h), 2);
    const roundedY = Math.round(this.baseY - roundedH);

    const clusterW = Math.min(this.slotWidth() * 0.88, 160);
    const barW = Math.max(Math.floor(clusterW / (activeCount || 1)) - 2, 8);
    const startX = item.slotCenter - ((activeCount || 1) * barW) / 2;
    const barX = startX + sIdx * barW;

    return {
      x: Math.round(barX),
      y: roundedY,
      width: Math.round(barW - 1),
      height: roundedH
    };
  }

  getStackedSegments(item: any, activeList: DataSeries[]): Array<{ seriesId: string; y: number; height: number; color: string }> {
    const ceiling = this._calculateCeiling(this.activeMaxAmount());
    const availH = this.baseY - this.plotTop;
    const segments: Array<{ seriesId: string; y: number; height: number; color: string }> = [];
    let currentY = this.baseY;

    for (const series of activeList) {
      const ev = item.point.entityValues?.[series.name];
      if (!ev || ev.isMissing || ev.amount <= 0) continue;
      const h = ceiling > 0 ? (ev.amount / ceiling) * availH : 0;
      const roundedH = Math.max(Math.round(h), 2);
      const segY = currentY - roundedH;
      segments.push({
        seriesId: series.id,
        y: segY,
        height: roundedH,
        color: series.color
      });
      currentY = segY;
    }
    return segments;
  }

  isPointMissing(point: TrendDataPoint, series: DataSeries): boolean {
    const ev = point.entityValues?.[series.name];
    return !ev || Boolean(ev.isMissing);
  }

  getPointEntityValue(point: TrendDataPoint, series: DataSeries): string {
    const ev = point.entityValues?.[series.name];
    if (!ev || ev.isMissing) return 'No record';
    const sym = this._getSanitizedCurrencySymbol(this.trendData().currencySymbol);
    return ev.rawAmount.startsWith(sym) ? ev.rawAmount : `${sym}${ev.rawAmount}`;
  }

  getAlphaColor(hex: string, alpha: number): string {
    if (!hex || !hex.startsWith('#')) return `rgba(37, 99, 235, ${alpha})`;
    let c = hex.slice(1);
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ─── Zoom Controls ───

  zoomIn(): void {
    this.zoomLevel.set(parseFloat(Math.min(this.zoomLevel() + 0.20, 2.5).toFixed(2)));
  }

  zoomOut(): void {
    this.zoomLevel.set(parseFloat(Math.max(this.zoomLevel() - 0.20, 0.8).toFixed(2)));
  }

  resetZoom(): void {
    this.zoomLevel.set(1.0);
  }

  onWheel(event: WheelEvent): void {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.12 : -0.12;
    this.zoomLevel.set(parseFloat(Math.min(Math.max(this.zoomLevel() + delta, 0.8), 2.5).toFixed(2)));
  }

  // ─── Hover / Tooltip ───

  onElementHover(item: { point: TrendDataPoint; x: number; y: number }, event: MouseEvent): void {
    const vEl = this.viewport()?.nativeElement;
    if (!vEl) return;
    const rect = vEl.getBoundingClientRect();
    this.hoveredPoint.set(item);
    const posX = event.clientX - rect.left + vEl.scrollLeft;
    const posY = event.clientY - rect.top;
    const maxW = this.viewportSvgWidth();
    this.tooltipX.set(Math.max(85, Math.min(posX, maxW - 85)));
    this.tooltipY.set(Math.max(10, posY - 12));
  }

  onElementLeave(): void {
    this.hoveredPoint.set(null);
  }

  // ─── Download / Export Chart ───

  toggleDownloadMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isDownloadMenuOpen.update(v => !v);
  }

  exportChart(format: 'png' | 'svg'): void {
    const svgEl = this.chartSvg()?.nativeElement;
    if (!svgEl) return;

    this.isDownloadMenuOpen.set(false);

    try {
      const width = this.viewportSvgWidth();
      const height = 290;

      const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute('width', String(width));
      clonedSvg.setAttribute('height', String(height));
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', '#ffffff');
      clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = `
        text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .grid-line { stroke: #e2e8f0; stroke-width: 1; stroke-dasharray: 4 4; }
        .baseline { stroke: #cbd5e1; stroke-width: 1.5; }
        .axis-label { font-size: 10px; fill: #64748b; font-family: monospace; }
        .x-axis-label { font-size: 10px; fill: #475569; font-weight: 600; }
        .clean-trend-line.primary { stroke: #2563eb; stroke-width: 3; fill: none; }
        .clean-trend-line.secondary { stroke: #d97706; stroke-width: 2.2; fill: none; }
        .area-top-line { stroke: #1d4ed8; stroke-width: 2.5; fill: none; }
        .point-outer { fill: #ffffff; stroke: #2563eb; stroke-width: 2.2; }
        .point-inner { fill: #2563eb; }
      `;
      clonedSvg.insertBefore(styleEl, bgRect.nextSibling);

      const pts = this.activePoints();
      const fromShort = pts.length > 0 ? pts[0].shortMonth.replace(/[^a-zA-Z0-9]/g, '') : 'start';
      const toShort = pts.length > 0 ? pts[pts.length - 1].shortMonth.replace(/[^a-zA-Z0-9]/g, '') : 'end';
      const filename = `cfo_chart_${this.selectedType()}_${fromShort}_to_${toShort}`;

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);

      if (format === 'svg') {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        this._triggerDownload(URL.createObjectURL(blob), `${filename}.svg`);
      } else {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = 2;
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(scale, scale);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(pngBlob => {
              if (pngBlob) {
                this._triggerDownload(URL.createObjectURL(pngBlob), `${filename}.png`);
              }
              URL.revokeObjectURL(url);
            }, 'image/png');
          } else {
            URL.revokeObjectURL(url);
          }
        };
        img.src = url;
      }
    } catch (err) {
      console.error('Chart export error:', err);
    }
  }

  private _triggerDownload(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── Metric & Currency Formatting ───

  formatCompactCurrency(val: number): string {
    const sym = this._getSanitizedCurrencySymbol(this.trendData().currencySymbol);
    if (val >= 1e9) return `${sym}${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${sym}${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${sym}${(val / 1e3).toFixed(1)}K`;
    return `${sym}${Math.round(val)}`;
  }

  formatPercentOfMax(val: number): string {
    const max = this.activeMaxAmount();
    return max > 0 ? `${Math.round((val / max) * 100)}%` : '100%';
  }

  getShareOfTotal(val: number): string {
    const tot = this.activeTotalAmount();
    return tot > 0 ? `${((val / tot) * 100).toFixed(1)}%` : '0%';
  }

  private _getSanitizedCurrencySymbol(sym?: string): string {
    if (!sym) return '$';
    const trimmed = sym.trim();
    if (trimmed === '$' || trimmed === '€' || trimmed === '₹' || trimmed === '£' || trimmed === '¥') {
      return trimmed;
    }
    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(trimmed)) {
      return '$';
    }
    if (/^[A-Za-z]{3}$/.test(trimmed)) {
      return trimmed + ' ';
    }
    return '$';
  }

  private _calculateCeiling(maxVal: number): number {
    if (maxVal <= 0) return 100;
    const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
    let c = Math.ceil((maxVal / mag) * 1.12);
    if (c % 2 !== 0 && c < 10) c += 1;
    return c * mag;
  }

  private _formatTickValue(val: number, sym: string): string {
    const s = this._getSanitizedCurrencySymbol(sym);
    if (val === 0) return `${s}0`;
    if (val >= 1e9) return `${s}${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) {
      const v = val / 1e6;
      return `${s}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
    }
    if (val >= 1e3) {
      const v = val / 1e3;
      return `${s}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`;
    }
    return `${s}${Math.round(val)}`;
  }

  private _formatDiffAmount(val: number): string {
    const sym = this._getSanitizedCurrencySymbol(this.trendData().currencySymbol);
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '+';
    if (absVal >= 1e9) return `${sign}${sym}${(absVal / 1e9).toFixed(1)}B`;
    if (absVal >= 1e6) return `${sign}${sym}${(absVal / 1e6).toFixed(1)}M`;
    if (absVal >= 1e3) return `${sign}${sym}${(absVal / 1e3).toFixed(1)}K`;
    return `${sign}${sym}${Math.round(absVal)}`;
  }
}
