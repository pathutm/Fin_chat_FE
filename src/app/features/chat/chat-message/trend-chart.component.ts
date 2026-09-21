import { Component, input, signal, computed, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrendSeries, TrendDataPoint, YearPeriodOption } from '../../../core/utils/trend-parser.util';

export type ChartType = '3d-bar' | 'line' | 'area';

interface Tick {
  value: number;
  label: string;
  y: number;
}

/**
 * A lightweight descriptor for a month dropdown entry.
 * Uses pointIndex (always unique) as the option value — never sortKey (which may be 0 for all).
 */
interface MonthOption {
  pointIndex: number;    // stable unique ID — used as <option value>
  month: string;         // e.g. "January 2026"
  shortMonth: string;    // e.g. "Jan '26"
  sortKey: number;       // for range comparisons (may be 0)
}

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ── 1. GRAPH CONFIRMATION PROMPT ── -->
    @if (isConfirmed() === null) {
      <div class="trend-prompt-card">
        <div class="prompt-left">
          <div class="prompt-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M3 3v18h18"/>
              <path d="M18 9l-5 5-4-4-3 3"/>
            </svg>
          </div>
          <div class="prompt-text-group">
            <span class="prompt-title">Trend Visualization Available</span>
            <span class="prompt-desc">
              Found {{ trendData().points.length }} monthly data points
              ({{ trendData().points[0].month }} – {{ trendData().points[trendData().points.length - 1].month }}).
              Would you like to view the interactive chart?
            </span>
          </div>
        </div>
        <div class="prompt-actions">
          <button class="prompt-btn confirm-btn" (click)="confirmChart(true)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Yes, Show Chart</span>
          </button>
          <button class="prompt-btn decline-btn" (click)="confirmChart(false)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            <span>No</span>
          </button>
        </div>
      </div>
    } @else if (isConfirmed() === false) {
      <div class="trend-declined-card">
        <div class="declined-info">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>Trend chart hidden</span>
        </div>
        <button class="reopen-chart-btn" (click)="confirmChart(true)">Show Chart</button>
      </div>
    } @else {
      <!-- ── 2. FULL INTERACTIVE TREND CHART ── -->
      <div class="trend-card" #chartCard>
        <!-- Header -->
        <div class="chart-header">
          <div class="header-left">
            <div class="metric-title-wrap">
              <div class="chart-icon-box">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <div>
                <h4 class="metric-title">{{ trendData().title }}</h4>
                <div class="metric-meta-row">
                  <span class="meta-pill">{{ activePoints().length }} Months Displayed</span>
                  <span class="meta-pill highlight">Peak: {{ activePeakPoint().month }}</span>
                  @if (trendData().hasInvoiceCount) {
                    <span class="meta-pill count-pill">Includes Invoices</span>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="header-right">
            <!-- Zoom Controls (button + mouse-wheel) -->
            <div class="control-group zoom-group" title="Zoom (or use mouse wheel over chart)">
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

            <!-- Chart Type Selector -->
            <div class="control-group chart-type-group" role="tablist" aria-label="Chart Type">
              <button class="chart-tab-btn" [class.active]="selectedType() === '3d-bar'" (click)="selectType('3d-bar')" role="tab" title="3D Bar Chart">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 20h16M4 20V12l4-2v10M12 20V6l4-2v16M20 20V9l-4-2" />
                </svg>
                <span>3D Bar</span>
              </button>
              <button class="chart-tab-btn" [class.active]="selectedType() === 'line'" (click)="selectType('line')" role="tab" title="Line Chart">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span>Line</span>
              </button>
              <button class="chart-tab-btn" [class.active]="selectedType() === 'area'" (click)="selectType('area')" role="tab" title="Area Chart">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 20h18M3 20l4-9 6 4 8-10v15H3z" />
                </svg>
                <span>Area</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ── 3. FILTER BAR: Year Period + Dynamic From/To Month ── -->
        <div class="filters-bar">
          <!-- Year Period -->
          @if (periodOptions().length > 1) {
            <div class="filter-item">
              <span class="filter-label">Year:</span>
              <div class="select-pill-wrap">
                <svg class="select-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <select class="filter-select" [value]="selectedPeriodId()" (change)="onPeriodChange($event)" aria-label="Year period">
                  @for (opt of periodOptions(); track opt.id) {
                    <option [value]="opt.id">{{ opt.label }}</option>
                  }
                </select>
                <svg class="select-chevron" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          }

          <!-- From Month — sourced from COMPLETE period months, tracked by pointIndex -->
          @if (availablePeriodMonths().length > 1) {
            <div class="filter-item">
              <span class="filter-label">From:</span>
              <div class="select-pill-wrap">
                <select
                  class="filter-select"
                  [value]="selectedFromIdx()"
                  (change)="onFromMonthChange($event)"
                  aria-label="From month"
                >
                  @for (m of fromMonthOptions(); track m.pointIndex) {
                    <option [value]="m.pointIndex">{{ m.month }}</option>
                  }
                </select>
                <svg class="select-chevron" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>

            <!-- To Month — sourced from COMPLETE period months, tracked by pointIndex -->
            <div class="filter-item">
              <span class="filter-label">To:</span>
              <div class="select-pill-wrap">
                <select
                  class="filter-select"
                  [value]="selectedToIdx()"
                  (change)="onToMonthChange($event)"
                  aria-label="To month"
                >
                  @for (m of toMonthOptions(); track m.pointIndex) {
                    <option [value]="m.pointIndex">{{ m.month }}</option>
                  }
                </select>
                <svg class="select-chevron" viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          }

          @if (isRangeCustomized()) {
            <button class="reset-range-btn" (click)="resetToFullPeriod()" title="Reset to full period">
              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>Reset Range</span>
            </button>
          }
        </div>

        <!-- ── 4. SCROLLABLE CHART VIEWPORT WITH MOUSE-WHEEL ZOOM ── -->
        <div
          class="chart-viewport"
          #viewport
          (wheel)="onWheel($event)"
          tabindex="0"
          aria-label="Chart Viewport"
        >
          <div class="svg-container" [style.min-width.px]="svgWidth() * zoomLevel()">
            <svg
              class="trend-svg"
              [attr.viewBox]="'0 0 ' + svgWidth() + ' 290'"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="barFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="oklch(0.64 0.17 256)"/>
                  <stop offset="60%" stop-color="oklch(0.58 0.16 256)"/>
                  <stop offset="100%" stop-color="oklch(0.48 0.15 260)"/>
                </linearGradient>
                <linearGradient id="barFrontSelectedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="oklch(0.45 0.13 265)"/>
                  <stop offset="100%" stop-color="oklch(0.32 0.11 265)"/>
                </linearGradient>
                <linearGradient id="barTopGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="oklch(0.72 0.14 256)"/>
                  <stop offset="100%" stop-color="oklch(0.82 0.10 256)"/>
                </linearGradient>
                <linearGradient id="barTopSelectedGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="oklch(0.55 0.12 265)"/>
                  <stop offset="100%" stop-color="oklch(0.68 0.10 265)"/>
                </linearGradient>
                <linearGradient id="barSideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="oklch(0.46 0.14 260)"/>
                  <stop offset="100%" stop-color="oklch(0.38 0.12 262)"/>
                </linearGradient>
                <linearGradient id="areaTrendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="oklch(0.58 0.16 256)" stop-opacity="0.48"/>
                  <stop offset="45%" stop-color="oklch(0.58 0.16 256)" stop-opacity="0.24"/>
                  <stop offset="85%" stop-color="oklch(0.58 0.16 256)" stop-opacity="0.08"/>
                  <stop offset="100%" stop-color="oklch(0.58 0.16 256)" stop-opacity="0.02"/>
                </linearGradient>
              </defs>

              <!-- Grid & Y-Axis -->
              <g class="chart-grid">
                @for (tick of yTicks(); track tick.value) {
                  <line class="grid-line" [attr.x1]="gridLeft" [attr.y1]="tick.y" [attr.x2]="gridRight()" [attr.y2]="tick.y"/>
                  <text class="axis-label y-axis-label" [attr.x]="gridLeft - 10" [attr.y]="tick.y + 4" text-anchor="end">{{ tick.label }}</text>
                }
                <line class="baseline" [attr.x1]="gridLeft" [attr.y1]="baseY" [attr.x2]="gridRight()" [attr.y2]="baseY"/>
              </g>

              <!-- 3D Bar Chart -->
              @if (selectedType() === '3d-bar') {
                <g class="bars-layer">
                  @for (item of calculatedPoints(); track item.point.pointIndex) {
                    <g
                      class="bar-column-group"
                      [class.selected]="selectedMonth() === item.point.month"
                      [class.dimmed]="selectedMonth() !== null && selectedMonth() !== item.point.month"
                      (click)="toggleMonthSelection(item.point)"
                      (mouseenter)="onElementHover(item, $event)"
                      (mouseleave)="onElementLeave()"
                    >
                      <polygon class="bar-side" [attr.points]="getSideFacetPoints(item)" fill="url(#barSideGrad)"/>
                      <rect class="bar-front" [attr.x]="item.x" [attr.y]="item.y"
                        [attr.width]="item.barWidth" [attr.height]="Math.max(baseY - item.y, 2)"
                        [attr.fill]="selectedMonth() === item.point.month ? 'url(#barFrontSelectedGrad)' : 'url(#barFrontGrad)'" rx="2"/>
                      <polygon class="bar-top" [attr.points]="getTopCapPoints(item)"
                        [attr.fill]="selectedMonth() === item.point.month ? 'url(#barTopSelectedGrad)' : 'url(#barTopGrad)'"
                        stroke="rgba(255,255,255,0.6)" stroke-width="0.8"/>
                      @if (selectedMonth() === item.point.month || hoveredPoint()?.point?.month === item.point.month) {
                        <g class="bar-value-pill" [attr.transform]="'translate(' + (item.x + item.barWidth / 2 + 3) + ',' + (item.y - 18) + ')'">
                          <rect x="-42" y="-10" width="84" height="20" rx="4" class="pill-bg"/>
                          <text x="0" y="4" text-anchor="middle" class="pill-text">{{ formatCompactCurrency(item.point.amount) }}</text>
                        </g>
                      }
                    </g>
                  }
                </g>
              }

              <!-- Line Chart (Clean, no fill) -->
              @if (selectedType() === 'line') {
                <g class="line-layer">
                  <path class="clean-trend-line" [attr.d]="linePathD()" fill="none"/>
                  @for (item of calculatedPoints(); track item.point.pointIndex) {
                    <g
                      class="data-point-group"
                      [class.selected]="selectedMonth() === item.point.month"
                      [class.dimmed]="selectedMonth() !== null && selectedMonth() !== item.point.month"
                      (click)="toggleMonthSelection(item.point)"
                      (mouseenter)="onElementHover(item, $event)"
                      (mouseleave)="onElementLeave()"
                    >
                      <circle class="point-halo" [attr.cx]="item.x + item.barWidth / 2" [attr.cy]="item.y" r="12"/>
                      <circle class="point-outer" [attr.cx]="item.x + item.barWidth / 2" [attr.cy]="item.y" r="5"/>
                      <circle class="point-inner" [attr.cx]="item.x + item.barWidth / 2" [attr.cy]="item.y" r="2.5"/>
                    </g>
                  }
                </g>
              }

              <!-- Area Chart (filled gradient + boundary line) -->
              @if (selectedType() === 'area') {
                <g class="area-layer">
                  <path class="trend-area-path" [attr.d]="areaPathD()" fill="url(#areaTrendGrad)"/>
                  <path class="area-top-line" [attr.d]="linePathD()" fill="none"/>
                  @for (item of calculatedPoints(); track item.point.pointIndex) {
                    <g
                      class="data-point-group"
                      [class.selected]="selectedMonth() === item.point.month"
                      [class.dimmed]="selectedMonth() !== null && selectedMonth() !== item.point.month"
                      (click)="toggleMonthSelection(item.point)"
                      (mouseenter)="onElementHover(item, $event)"
                      (mouseleave)="onElementLeave()"
                    >
                      <circle class="point-halo" [attr.cx]="item.x + item.barWidth / 2" [attr.cy]="item.y" r="12"/>
                      <circle class="point-outer" [attr.cx]="item.x + item.barWidth / 2" [attr.cy]="item.y" r="5"/>
                      <circle class="point-inner" [attr.cx]="item.x + item.barWidth / 2" [attr.cy]="item.y" r="2.5"/>
                    </g>
                  }
                </g>
              }

              <!-- X-Axis Labels -->
              <g class="x-axis-layer">
                @for (item of calculatedPoints(); track item.point.pointIndex) {
                  <g
                    class="x-label-group"
                    [class.selected]="selectedMonth() === item.point.month"
                    (click)="toggleMonthSelection(item.point)"
                    cursor="pointer"
                  >
                    <text class="axis-label x-axis-label"
                      [attr.x]="item.x + item.barWidth / 2 + 3"
                      [attr.y]="baseY + 20"
                      text-anchor="middle">
                      {{ item.point.shortMonth }}
                    </text>
                    @if (selectedMonth() === item.point.month) {
                      <rect [attr.x]="item.x + item.barWidth / 2 - 10 + 3" [attr.y]="baseY + 26"
                        width="20" height="2.5" rx="1" class="label-active-indicator"/>
                    }
                  </g>
                }
              </g>
            </svg>
          </div>

          <!-- Floating Tooltip -->
          @if (hoveredPoint()) {
            <div class="chart-tooltip" [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
              <div class="tooltip-header">
                <span class="tooltip-month">{{ hoveredPoint()!.point.month }}</span>
                <span class="tooltip-badge">{{ formatPercentOfMax(hoveredPoint()!.point.amount) }} of peak</span>
              </div>
              <div class="tooltip-amount-row">
                <span class="tooltip-label">Invoice Total</span>
                <span class="tooltip-amount">{{ hoveredPoint()!.point.rawAmount }}</span>
              </div>
              @if (hoveredPoint()!.point.invoiceCount) {
                <div class="tooltip-count-row">
                  <span class="tooltip-label">Volume</span>
                  <span class="tooltip-count">{{ hoveredPoint()!.point.invoiceCount }}</span>
                </div>
              }
            </div>
          }
        </div>

        <!-- ── 5. MONTH FOCUS CARD ── -->
        @if (selectedPoint()) {
          <div class="month-focus-panel">
            <div class="focus-left">
              <div class="focus-badge">
                <span class="pulse-indicator"></span>
                Selected Month
              </div>
              <h4 class="focus-month-title">{{ selectedPoint()!.month }}</h4>
              <div class="focus-metrics-row">
                <div class="metric-box">
                  <span class="metric-lbl">Total Invoice Amount</span>
                  <span class="metric-val primary">{{ selectedPoint()!.rawAmount }}</span>
                </div>
                @if (selectedPoint()!.invoiceCount) {
                  <div class="metric-box">
                    <span class="metric-lbl">Invoice Count</span>
                    <span class="metric-val secondary">{{ selectedPoint()!.invoiceCount }}</span>
                  </div>
                }
                <div class="metric-box">
                  <span class="metric-lbl">Share of Active Range</span>
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
    :host { display: block; width: 100%; margin-top: 14px; }

    /* ── Confirmation Prompt ── */
    .trend-prompt-card {
      background: var(--card-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-card); padding: 14px 18px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      animation: fadeIn 200ms ease;
    }
    .prompt-left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 240px; }
    .prompt-icon {
      width: 32px; height: 32px; border-radius: var(--radius-base);
      background: oklch(0.58 0.16 256 / 0.1); border: 1px solid oklch(0.58 0.16 256 / 0.25);
      color: var(--primary-accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .prompt-text-group { display: flex; flex-direction: column; gap: 2px; }
    .prompt-title { font-size: 0.88rem; font-weight: 700; color: var(--foreground); }
    .prompt-desc { font-size: 0.78rem; color: var(--muted-text); line-height: 1.4; }
    .prompt-actions { display: flex; align-items: center; gap: 8px; }
    .prompt-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: var(--radius-base);
      font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;
      &.confirm-btn {
        background: var(--primary-accent); color: #fff;
        border: 1px solid transparent; box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        &:hover { opacity: 0.92; }
      }
      &.decline-btn {
        background: var(--secondary-surface); border: 1px solid var(--border-color); color: var(--muted-text);
        &:hover { background: var(--card-surface); color: var(--foreground); }
      }
    }

    /* ── Declined Banner ── */
    .trend-declined-card {
      background: var(--secondary-surface); border: 1px dashed var(--border-color);
      border-radius: var(--radius-base); padding: 8px 14px;
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .declined-info { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: var(--muted-text); }
    .reopen-chart-btn {
      background: transparent; border: 1px solid var(--border-color);
      border-radius: 4px; padding: 3px 8px; font-size: 0.74rem; font-weight: 600;
      color: var(--primary-accent); cursor: pointer;
      &:hover { background: var(--card-surface); }
    }

    /* ── Trend Card ── */
    .trend-card {
      background: var(--card-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-card); padding: 16px 20px 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04); position: relative; animation: fadeIn 250ms ease;
    }

    /* ── Header ── */
    .chart-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap; margin-bottom: 10px; padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .metric-title-wrap { display: flex; align-items: flex-start; gap: 10px; }
    .chart-icon-box {
      width: 28px; height: 28px; border-radius: var(--radius-base);
      background: var(--secondary-surface); border: 1px solid var(--border-color);
      color: var(--primary-accent); display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 2px;
    }
    .metric-title { font-size: 0.92rem; font-weight: 700; color: var(--foreground); margin: 0 0 4px 0; letter-spacing: -0.01em; }
    .metric-meta-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .meta-pill {
      font-size: 0.72rem; font-weight: 500; padding: 2px 8px;
      border-radius: var(--radius-pill); background: var(--secondary-surface);
      border: 1px solid var(--border-color); color: var(--text-secondary);
      &.highlight {
        background: oklch(0.58 0.16 256 / 0.1); border-color: oklch(0.58 0.16 256 / 0.25);
        color: oklch(0.48 0.15 256); font-weight: 600;
      }
      &.count-pill { color: var(--muted-text); }
    }
    .header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

    /* ── Filters Bar ── */
    .filters-bar {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      margin-bottom: 12px; padding: 6px 10px;
      background: var(--secondary-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
    }
    .filter-item { display: inline-flex; align-items: center; gap: 5px; }
    .filter-label { font-size: 0.74rem; font-weight: 600; color: var(--muted-text); }
    .select-pill-wrap {
      position: relative; display: inline-flex; align-items: center;
      background: var(--card-surface); border: 1px solid var(--border-color);
      border-radius: 4px; padding: 0 6px; height: 26px; gap: 4px; transition: all 0.15s ease;
      &:hover, &:focus-within { border-color: var(--primary-accent); }
    }
    .select-icon { color: var(--primary-accent); flex-shrink: 0; }
    .filter-select {
      appearance: none; -webkit-appearance: none; background: transparent;
      border: none; outline: none; color: var(--foreground);
      font-size: 0.74rem; font-weight: 600; cursor: pointer;
      padding: 0 14px 0 2px; font-family: var(--font-sans);
    }
    .select-chevron { position: absolute; right: 5px; pointer-events: none; color: var(--muted-text); }
    .reset-range-btn {
      display: inline-flex; align-items: center; gap: 4px;
      background: transparent; border: 1px dashed var(--border-color);
      border-radius: 4px; padding: 3px 7px; font-size: 0.72rem; font-weight: 600;
      color: var(--text-secondary); cursor: pointer; margin-left: auto; transition: all 0.15s ease;
      &:hover { border-color: var(--primary-accent); color: var(--primary-accent); background: var(--card-surface); }
    }

    /* ── Controls ── */
    .control-group {
      display: inline-flex; align-items: center; background: var(--secondary-surface);
      border: 1px solid var(--border-color); border-radius: var(--radius-base); padding: 2px; gap: 2px;
    }
    .zoom-group .ctrl-btn {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 4px 8px; border-radius: 4px; background: transparent; border: none;
      color: var(--muted-text); font-size: 0.74rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;
      &:hover:not(:disabled) { background: var(--card-surface); color: var(--foreground); }
      &:disabled { opacity: 0.35; cursor: not-allowed; }
      &.reset-btn { min-width: 40px; font-family: var(--font-mono); font-variant-numeric: tabular-nums; &.active { color: var(--primary-accent); } }
    }
    .chart-type-group .chart-tab-btn {
      display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px;
      border-radius: 4px; background: transparent; border: none;
      color: var(--muted-text); font-size: 0.76rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;
      &:hover:not(.active) { color: var(--foreground); }
      &.active { background: var(--card-surface); color: var(--primary-accent); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    }

    /* ── Chart Viewport (Horizontal Scroll + Mouse Zoom) ── */
    .chart-viewport {
      position: relative; width: 100%; overflow-x: auto; overflow-y: hidden;
      cursor: crosshair; border-radius: var(--radius-base); outline: none;
      scrollbar-width: thin; scrollbar-color: var(--border-color) transparent;
      &::-webkit-scrollbar { height: 5px; }
      &::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
    }
    .svg-container { width: 100%; transition: min-width 0.12s ease; }
    .trend-svg { width: 100%; height: 280px; display: block; }

    /* ── Grid & Axes ── */
    .grid-line { stroke: var(--border-color); stroke-width: 1; stroke-dasharray: 4 4; }
    .baseline { stroke: oklch(0.8 0.015 260); stroke-width: 1.5; }
    .axis-label { font-size: 10.5px; font-weight: 500; fill: var(--muted-text); user-select: none; font-family: var(--font-mono); }
    .x-axis-label { font-size: 10.5px; font-weight: 600; font-family: var(--font-sans); transition: fill 0.15s ease; }
    .x-label-group {
      &:hover .x-axis-label, &.selected .x-axis-label { fill: var(--primary-accent); font-weight: 700; }
    }
    .label-active-indicator { fill: var(--primary-accent); }

    /* ── 3D Bar ── */
    .bar-column-group {
      cursor: pointer; transition: opacity 0.15s ease;
      &.dimmed { opacity: 0.35; }
      &:hover:not(.dimmed) .bar-front { filter: brightness(1.06); }
      &.selected { opacity: 1; .bar-front { stroke: var(--primary-accent); stroke-width: 1.5; } }
    }
    .bar-front, .bar-top, .bar-side { transition: all 0.15s ease; }
    .bar-value-pill {
      pointer-events: none;
      .pill-bg { fill: var(--card-surface); stroke: var(--border-color); stroke-width: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.08)); }
      .pill-text { font-size: 10px; font-weight: 700; fill: var(--foreground); font-family: var(--font-mono); }
    }

    /* ── Line Chart (clean, no fill) ── */
    .clean-trend-line { stroke: oklch(0.58 0.16 256); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }

    /* ── Area Chart (filled gradient) ── */
    .trend-area-path { opacity: 0.95; }
    .area-top-line { stroke: oklch(0.52 0.17 256); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }

    /* ── Data Points (Line & Area) ── */
    .data-point-group {
      cursor: pointer; transition: opacity 0.15s ease;
      &.dimmed { opacity: 0.35; }
      .point-halo { fill: oklch(0.58 0.16 256 / 0.18); opacity: 0; transition: opacity 0.15s ease, r 0.15s ease; }
      .point-outer { fill: #fff; stroke: oklch(0.58 0.16 256); stroke-width: 2.5; transition: all 0.15s ease; }
      .point-inner { fill: oklch(0.58 0.16 256); transition: all 0.15s ease; }
      &:hover, &.selected {
        .point-halo { opacity: 1; r: 14; }
        .point-outer { stroke: var(--primary-accent); r: 6.5; }
        .point-inner { fill: var(--primary-accent); }
      }
    }

    /* ── Tooltip ── */
    .chart-tooltip {
      position: absolute; transform: translate(-50%, -105%); pointer-events: none;
      z-index: 50; background: var(--card-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-base); padding: 8px 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08); min-width: 160px;
    }
    .tooltip-header {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid var(--border-color);
    }
    .tooltip-month { font-size: 0.76rem; font-weight: 700; color: var(--foreground); }
    .tooltip-badge {
      font-size: 0.68rem; font-weight: 600; color: oklch(0.48 0.15 256);
      background: oklch(0.58 0.16 256 / 0.1); padding: 1px 6px; border-radius: var(--radius-pill);
    }
    .tooltip-amount-row, .tooltip-count-row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 0.76rem;
    }
    .tooltip-label { color: var(--muted-text); }
    .tooltip-amount { font-weight: 700; color: var(--foreground); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
    .tooltip-count { font-weight: 600; color: var(--text-secondary); font-family: var(--font-mono); }

    /* ── Focus Panel ── */
    .month-focus-panel {
      margin-top: 12px; padding: 10px 14px; background: var(--secondary-surface);
      border: 1px solid var(--border-color); border-radius: var(--radius-base);
      display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    }
    .focus-left { display: flex; flex-direction: column; gap: 4px; }
    .focus-badge {
      display: inline-flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 600;
      color: var(--primary-accent); text-transform: uppercase; letter-spacing: 0.04em;
    }
    .pulse-indicator { width: 6px; height: 6px; border-radius: 50%; background: oklch(0.58 0.16 256); }
    .focus-month-title { font-size: 0.98rem; font-weight: 700; color: var(--foreground); margin: 0; }
    .focus-metrics-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 2px; }
    .metric-box { display: flex; flex-direction: column; }
    .metric-lbl { font-size: 0.7rem; color: var(--muted-text); font-weight: 500; }
    .metric-val {
      font-size: 0.9rem; font-weight: 700; font-family: var(--font-mono); font-variant-numeric: tabular-nums;
      &.primary { color: var(--foreground); }
      &.secondary { color: var(--text-secondary); }
      &.tertiary { color: oklch(0.48 0.15 256); }
    }
    .focus-right { display: flex; align-items: center; }
    .reset-selection-btn {
      display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px;
      border-radius: var(--radius-base); background: var(--card-surface);
      border: 1px solid var(--border-color); color: var(--text-secondary);
      font-size: 0.76rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;
      &:hover { border-color: var(--primary-accent); color: var(--primary-accent); }
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class TrendChartComponent {
  readonly trendData = input.required<TrendSeries>();

  // null = pending confirmation, true = show, false = hidden
  readonly isConfirmed = signal<boolean | null>(null);

  readonly selectedType = signal<ChartType>('3d-bar');
  readonly selectedPeriodId = signal<string>('');

  /**
   * From/To are tracked by pointIndex (always unique — unlike sortKey which can be 0 for all).
   * -1 means "not yet set".
   */
  readonly selectedFromIdx = signal<number>(-1);
  readonly selectedToIdx   = signal<number>(-1);

  readonly selectedMonth = signal<string | null>(null);
  readonly hoveredPoint = signal<{ point: TrendDataPoint; x: number; y: number } | null>(null);
  readonly zoomLevel = signal<number>(1.0);
  readonly tooltipX = signal<number>(0);
  readonly tooltipY = signal<number>(0);

  readonly chartCard = viewChild<ElementRef<HTMLDivElement>>('chartCard');
  readonly viewport  = viewChild<ElementRef<HTMLDivElement>>('viewport');

  readonly Math = Math;

  readonly gridLeft = 65;
  readonly plotTop  = 36;
  readonly baseY    = 236;
  readonly depthDx  = 6;
  readonly depthDy  = -5;

  constructor() {
    // Sync period & from/to whenever trendData arrives or period changes
    effect(() => {
      const data = this.trendData();
      if (!data?.periodOptions?.length) return;

      const currentId = this.selectedPeriodId();
      const isValid = data.periodOptions.some(o => o.id === currentId);
      if (!isValid) {
        const defaultId = data.defaultPeriodId || data.periodOptions[0].id;
        this.selectedPeriodId.set(defaultId);
        this._syncFromToForPeriod(defaultId, data);
      }
    });
  }

  confirmChart(show: boolean): void { this.isConfirmed.set(show); }

  // ─── Period options ───────────────────────────────────────────────────────

  readonly periodOptions = computed<YearPeriodOption[]>(() => this.trendData().periodOptions || []);

  readonly activePeriodOption = computed<YearPeriodOption | null>(() => {
    const opts = this.periodOptions();
    const pid  = this.selectedPeriodId();
    return opts.find(o => o.id === pid) || opts[0] || null;
  });

  // ─── ALL months within the selected year period (never filtered by from/to) ──

  readonly availablePeriodMonths = computed<TrendDataPoint[]>(() => {
    const data = this.trendData();
    const opt  = this.activePeriodOption();
    if (!opt) return data.points;

    if (opt.id === 'all') return data.points;

    // Use minPointIndex / maxPointIndex from the period option (positional, always reliable)
    return data.points.slice(opt.minPointIndex, opt.maxPointIndex + 1);
  });

  // ─── From/To dropdown options ─────────────────────────────────────────────

  /**
   * From options = available period months from the starting year (year1) of the range.
   * Tracked by pointIndex (unique integer) — never by sortKey.
   */
  readonly fromMonthOptions = computed<MonthOption[]>(() => {
    const periodPts = this.availablePeriodMonths();
    const opt = this.activePeriodOption();
    if (!opt || !opt.years || opt.years.length < 2) {
      return periodPts.map(p => ({
        pointIndex: p.pointIndex,
        month: p.month,
        shortMonth: p.shortMonth,
        sortKey: p.sortKey
      }));
    }
    const year1 = opt.years[0];
    const year1Pts = periodPts.filter(p => p.year === year1);
    const pts = year1Pts.length > 0 ? year1Pts : periodPts;
    return pts.map(p => ({
      pointIndex: p.pointIndex,
      month: p.month,
      shortMonth: p.shortMonth,
      sortKey: p.sortKey
    }));
  });

  /**
   * To options = available period months from the ending year (year2) of the range.
   * Filters out months earlier than selectedFromIdx.
   */
  readonly toMonthOptions = computed<MonthOption[]>(() => {
    const periodPts = this.availablePeriodMonths();
    const opt = this.activePeriodOption();
    const fromIdx = this.selectedFromIdx();

    let pts = periodPts;
    if (opt && opt.years && opt.years.length >= 2) {
      const year2 = opt.years[opt.years.length - 1];
      const year2Pts = periodPts.filter(p => p.year === year2);
      if (year2Pts.length > 0) {
        pts = year2Pts;
      }
    }

    return pts
      .filter(p => fromIdx < 0 || p.pointIndex >= fromIdx)
      .map(p => ({
        pointIndex: p.pointIndex,
        month: p.month,
        shortMonth: p.shortMonth,
        sortKey: p.sortKey
      }));
  });

  // ─── Active points = period months filtered by From → To ─────────────────

  readonly activePoints = computed<TrendDataPoint[]>(() => {
    const periodPts = this.availablePeriodMonths();
    if (!periodPts.length) return [];

    const fromIdx = this.selectedFromIdx();
    const toIdx   = this.selectedToIdx();

    // If indices not yet set, show all period points
    if (fromIdx < 0 || toIdx < 0) return periodPts;

    // Filter by pointIndex range (inclusive both ends)
    return periodPts.filter(p => p.pointIndex >= fromIdx && p.pointIndex <= toIdx);
  });

  readonly isRangeCustomized = computed<boolean>(() => {
    const pts = this.availablePeriodMonths();
    if (pts.length <= 1) return false;
    return this.selectedFromIdx() !== pts[0].pointIndex || this.selectedToIdx() !== pts[pts.length - 1].pointIndex;
  });

  readonly activeMaxAmount = computed<number>(() => {
    const pts = this.activePoints();
    if (!pts.length) return 0;
    return pts.reduce((m, p) => Math.max(m, p.amount), 0);
  });

  readonly activePeakPoint = computed<TrendDataPoint>(() => {
    const pts = this.activePoints();
    if (!pts.length) return this.trendData().peakPoint;
    return pts.reduce((peak, p) => p.amount > peak.amount ? p : peak, pts[0]);
  });

  readonly activeTotalAmount = computed<number>(() =>
    this.activePoints().reduce((s, p) => s + p.amount, 0)
  );

  /** SVG width scales with point count so labels never overlap */
  readonly svgWidth = computed<number>(() =>
    Math.max(680, this.activePoints().length * 54)
  );

  readonly gridRight = computed<number>(() => this.svgWidth() - 25);

  readonly yTicks = computed<Tick[]>(() => {
    const data = this.trendData();
    const maxVal = this.activeMaxAmount();
    if (maxVal <= 0) return [];
    const ceiling = this._calculateCeiling(maxVal);
    const steps = 4;
    const availH = this.baseY - this.plotTop;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = (ceiling / steps) * i;
      return { value: val, label: this._formatTickValue(val, data.currencySymbol), y: Math.round(this.baseY - (val / ceiling) * availH) };
    });
  });

  readonly calculatedPoints = computed(() => {
    const pts   = this.activePoints();
    const count = pts.length;
    if (count === 0) return [];
    const ceiling = this._calculateCeiling(this.activeMaxAmount());
    const availW  = this.gridRight() - this.gridLeft - 20;
    const availH  = this.baseY - this.plotTop;
    const slotW   = availW / count;
    const barW    = Math.min(Math.max(slotW * 0.48, 10), 42);

    return pts.map((pt, i) => {
      const slotCenter = this.gridLeft + 10 + i * slotW + slotW / 2;
      const x = slotCenter - barW / 2;
      const h = ceiling > 0 ? (pt.amount / ceiling) * availH : 0;
      return { point: pt, x: Math.round(x), y: Math.round(this.baseY - h), barWidth: Math.round(barW), slotCenter: Math.round(slotCenter) };
    });
  });

  readonly selectedPoint = computed<TrendDataPoint | null>(() => {
    const m = this.selectedMonth();
    return m ? (this.activePoints().find(p => p.month === m) || null) : null;
  });

  readonly linePathD = computed(() => {
    const pts = this.calculatedPoints();
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].x + pts[0].barWidth / 2} ${pts[0].y}`;
    const coords = pts.map(p => ({ x: p.x + p.barWidth / 2, y: p.y }));
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const c = coords[i], n = coords[i + 1];
      const cx = c.x + (n.x - c.x) / 2;
      d += ` C ${cx} ${c.y}, ${cx} ${n.y}, ${n.x} ${n.y}`;
    }
    return d;
  });

  readonly areaPathD = computed(() => {
    const pts = this.calculatedPoints();
    if (!pts.length) return '';
    const first = pts[0], last = pts[pts.length - 1];
    return `${this.linePathD()} L ${last.x + last.barWidth / 2} ${this.baseY} L ${first.x + first.barWidth / 2} ${this.baseY} Z`;
  });

  // ─── Event handlers ───────────────────────────────────────────────────────

  onPeriodChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedPeriodId.set(val);
    this.selectedMonth.set(null);
    this._syncFromToForPeriod(val, this.trendData());
  }

  onFromMonthChange(event: Event): void {
    const idx = parseInt((event.target as HTMLSelectElement).value, 10);
    this.selectedFromIdx.set(idx);
    this.selectedMonth.set(null);
    // If To < From, advance To to match
    if (this.selectedToIdx() < idx) this.selectedToIdx.set(idx);
  }

  onToMonthChange(event: Event): void {
    const idx = parseInt((event.target as HTMLSelectElement).value, 10);
    this.selectedToIdx.set(idx);
    this.selectedMonth.set(null);
    // If From > To, pull From back
    if (this.selectedFromIdx() > idx) this.selectedFromIdx.set(idx);
  }

  resetToFullPeriod(): void {
    this._syncFromToForPeriod(this.selectedPeriodId(), this.trendData());
    this.selectedMonth.set(null);
  }

  /**
   * Set From/To to the full range of the selected period using the COMPLETE trendData.points.
   * This is the single authoritative method for resetting from/to state.
   */
  private _syncFromToForPeriod(periodId: string, data: TrendSeries): void {
    if (!data?.points?.length) return;

    const opt = (data.periodOptions || []).find(o => o.id === periodId);
    let pts: TrendDataPoint[];

    if (!opt || opt.id === 'all') {
      pts = data.points;
    } else {
      pts = data.points.slice(opt.minPointIndex, opt.maxPointIndex + 1);
    }

    if (pts.length > 0) {
      if (opt && opt.years && opt.years.length >= 2) {
        const year1 = opt.years[0];
        const year2 = opt.years[opt.years.length - 1];
        const year1Pts = pts.filter(p => p.year === year1);
        const year2Pts = pts.filter(p => p.year === year2);

        const firstPt = year1Pts.length > 0 ? year1Pts[0] : pts[0];
        const lastPt  = year2Pts.length > 0 ? year2Pts[year2Pts.length - 1] : pts[pts.length - 1];

        this.selectedFromIdx.set(firstPt.pointIndex);
        this.selectedToIdx.set(lastPt.pointIndex);
      } else {
        this.selectedFromIdx.set(pts[0].pointIndex);
        this.selectedToIdx.set(pts[pts.length - 1].pointIndex);
      }
    }
  }

  selectType(type: ChartType): void { this.selectedType.set(type); }

  toggleMonthSelection(point: TrendDataPoint): void {
    this.selectedMonth.set(this.selectedMonth() === point.month ? null : point.month);
  }

  clearMonthSelection(): void { this.selectedMonth.set(null); }
  zoomIn(): void  { this.zoomLevel.set(parseFloat(Math.min(this.zoomLevel() + 0.20, 2.5).toFixed(2))); }
  zoomOut(): void { this.zoomLevel.set(parseFloat(Math.max(this.zoomLevel() - 0.20, 0.8).toFixed(2))); }
  resetZoom(): void { this.zoomLevel.set(1.0); }

  onWheel(event: WheelEvent): void {
    // Allow horizontal trackpad/shift-scroll for panning
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.12 : -0.12;
    this.zoomLevel.set(parseFloat(Math.min(Math.max(this.zoomLevel() + delta, 0.8), 2.5).toFixed(2)));
  }

  onElementHover(item: { point: TrendDataPoint; x: number; y: number; barWidth: number }, event: MouseEvent): void {
    const vEl = this.viewport()?.nativeElement;
    if (!vEl) return;
    const rect = vEl.getBoundingClientRect();
    this.hoveredPoint.set(item);
    this.tooltipX.set(Math.max(85, Math.min(event.clientX - rect.left, rect.width - 85)));
    this.tooltipY.set(Math.max(10, event.clientY - rect.top - 12));
  }

  onElementLeave(): void { this.hoveredPoint.set(null); }

  getTopCapPoints(item: { x: number; y: number; barWidth: number }): string {
    return `${item.x},${item.y} ${item.x + this.depthDx},${item.y + this.depthDy} ${item.x + item.barWidth + this.depthDx},${item.y + this.depthDy} ${item.x + item.barWidth},${item.y}`;
  }

  getSideFacetPoints(item: { x: number; y: number; barWidth: number }): string {
    return `${item.x + item.barWidth},${item.y} ${item.x + item.barWidth + this.depthDx},${item.y + this.depthDy} ${item.x + item.barWidth + this.depthDx},${this.baseY + this.depthDy} ${item.x + item.barWidth},${this.baseY}`;
  }

  formatCompactCurrency(val: number): string {
    const sym = this.trendData().currencySymbol || '$';
    if (val >= 1e9) return `${sym}${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${sym}${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${sym}${(val / 1e3).toFixed(1)}K`;
    return `${sym}${val.toFixed(0)}`;
  }

  formatPercentOfMax(val: number): string {
    const max = this.activeMaxAmount();
    return max > 0 ? `${Math.round((val / max) * 100)}%` : '100%';
  }

  getShareOfTotal(val: number): string {
    const tot = this.activeTotalAmount();
    return tot > 0 ? `${((val / tot) * 100).toFixed(1)}%` : '0%';
  }

  private _calculateCeiling(maxVal: number): number {
    if (maxVal <= 0) return 100;
    const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
    let c = Math.ceil((maxVal / mag) * 1.12);
    if (c % 2 !== 0 && c < 10) c += 1;
    return c * mag;
  }

  private _formatTickValue(val: number, sym: string): string {
    if (val === 0) return `${sym}0`;
    if (val >= 1e9) return `${sym}${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) { const v = val / 1e6; return `${sym}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`; }
    if (val >= 1e3) return `${sym}${(val / 1e3).toFixed(0)}K`;
    return `${sym}${val.toFixed(0)}`;
  }
}
