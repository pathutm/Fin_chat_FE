import { Component, input, signal, computed, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrendSeries, TrendDataPoint } from '../../../core/utils/trend-parser.util';

export type ChartType = '3d-bar' | 'line' | 'area';

interface Tick {
  value: number;
  label: string;
  y: number;
}

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="trend-card" #chartCard>
      <!-- Header Bar with Title, Overview Badges & Controls -->
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
                <span class="meta-pill">{{ trendData().points.length }} Months</span>
                <span class="meta-pill highlight">Peak: {{ trendData().peakPoint.month }}</span>
                @if (trendData().hasInvoiceCount) {
                  <span class="meta-pill count-pill">Includes Invoices</span>
                }
              </div>
            </div>
          </div>
        </div>

        <div class="header-right">
          <!-- Zoom Controls -->
          <div class="control-group zoom-group" title="Zoom Visualization">
            <button
              class="ctrl-btn"
              [disabled]="zoomLevel() <= 0.8"
              (click)="zoomOut()"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              class="ctrl-btn reset-btn"
              [class.active]="zoomLevel() !== 1.0"
              (click)="resetZoom()"
              title="Reset zoom"
              aria-label="Reset zoom"
            >
              {{ Math.round(zoomLevel() * 100) }}%
            </button>
            <button
              class="ctrl-btn"
              [disabled]="zoomLevel() >= 2.2"
              (click)="zoomIn()"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <!-- Chart Type Selector -->
          <div class="control-group chart-type-group" role="tablist" aria-label="Chart Type Selector">
            <button
              class="chart-tab-btn"
              [class.active]="selectedType() === '3d-bar'"
              (click)="selectType('3d-bar')"
              role="tab"
              [attr.aria-selected]="selectedType() === '3d-bar'"
              title="Switch to 3D Bar Chart"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 20h16M4 20V12l4-2v10M12 20V6l4-2v16M20 20V9l-4-2" />
              </svg>
              <span>3D Bar</span>
            </button>

            <button
              class="chart-tab-btn"
              [class.active]="selectedType() === 'line'"
              (click)="selectType('line')"
              role="tab"
              [attr.aria-selected]="selectedType() === 'line'"
              title="Switch to Line Chart"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span>Line</span>
            </button>

            <button
              class="chart-tab-btn"
              [class.active]="selectedType() === 'area'"
              (click)="selectType('area')"
              role="tab"
              [attr.aria-selected]="selectedType() === 'area'"
              title="Switch to Area Chart"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 20h18M3 20l4-9 6 4 8-10v15H3z" />
              </svg>
              <span>Area</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Chart Stage (Scrollable when zoomed) -->
      <div
        class="chart-viewport"
        #viewport
        (wheel)="onWheel($event)"
      >
        <div class="svg-container" [style.transform]="'scale(' + zoomLevel() + ')'" [style.transform-origin]="'center top'">
          <svg
            class="trend-svg"
            viewBox="0 0 680 300"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <!-- 3D Bar Front: Blue oklch(0.58 0.16 256) (Chart Token 1) -->
              <linearGradient id="barFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="oklch(0.64 0.17 256)"/>
                <stop offset="60%" stop-color="oklch(0.58 0.16 256)"/>
                <stop offset="100%" stop-color="oklch(0.48 0.15 260)"/>
              </linearGradient>

              <!-- 3D Bar Front Selected: Deep Indigo-Navy Accent oklch(0.32 0.11 265) -->
              <linearGradient id="barFrontSelectedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="oklch(0.45 0.13 265)"/>
                <stop offset="100%" stop-color="oklch(0.32 0.11 265)"/>
              </linearGradient>

              <!-- 3D Bar Top Cap (Lighter top facet) -->
              <linearGradient id="barTopGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="oklch(0.72 0.14 256)"/>
                <stop offset="100%" stop-color="oklch(0.82 0.10 256)"/>
              </linearGradient>

              <!-- 3D Bar Top Cap Selected -->
              <linearGradient id="barTopSelectedGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="oklch(0.55 0.12 265)"/>
                <stop offset="100%" stop-color="oklch(0.68 0.10 265)"/>
              </linearGradient>

              <!-- 3D Bar Right Facet (Shaded Depth) -->
              <linearGradient id="barSideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="oklch(0.46 0.14 260)"/>
                <stop offset="100%" stop-color="oklch(0.38 0.12 262)"/>
              </linearGradient>

              <!-- Area Gradient: Blue with subtle opacity -->
              <linearGradient id="areaTrendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="oklch(0.58 0.16 256)" stop-opacity="0.35"/>
                <stop offset="60%" stop-color="oklch(0.58 0.16 256)" stop-opacity="0.10"/>
                <stop offset="100%" stop-color="oklch(0.58 0.16 256)" stop-opacity="0"/>
              </linearGradient>
            </defs>

            <!-- Background Grid & Y-Axis Scale Ticks -->
            <g class="chart-grid">
              @for (tick of yTicks(); track tick.value) {
                <line
                  class="grid-line"
                  [attr.x1]="gridLeft"
                  [attr.y1]="tick.y"
                  [attr.x2]="gridRight"
                  [attr.y2]="tick.y"
                />
                <text
                  class="axis-label y-axis-label"
                  [attr.x]="gridLeft - 10"
                  [attr.y]="tick.y + 4"
                  text-anchor="end"
                >
                  {{ tick.label }}
                </text>
              }
              <!-- Baseline zero axis -->
              <line
                class="baseline"
                [attr.x1]="gridLeft"
                [attr.y1]="baseY"
                [attr.x2]="gridRight"
                [attr.y2]="baseY"
              />
            </g>

            <!-- ── CHART TYPE 1: 3D-STYLE BAR CHART ── -->
            @if (selectedType() === '3d-bar') {
              <g class="bars-layer">
                @for (item of calculatedPoints(); track item.point.month; let i = $index) {
                  <g
                    class="bar-column-group"
                    [class.selected]="selectedMonth() === item.point.month"
                    [class.dimmed]="selectedMonth() !== null && selectedMonth() !== item.point.month"
                    (click)="toggleMonthSelection(item.point)"
                    (mouseenter)="onElementHover(item, $event)"
                    (mouseleave)="onElementLeave()"
                  >
                    <!-- Right Facet (3D Perspective Extrusion) -->
                    <polygon
                      class="bar-side"
                      [attr.points]="getSideFacetPoints(item)"
                      fill="url(#barSideGrad)"
                    />

                    <!-- Front Face -->
                    <rect
                      class="bar-front"
                      [attr.x]="item.x"
                      [attr.y]="item.y"
                      [attr.width]="item.barWidth"
                      [attr.height]="baseY - item.y"
                      [attr.fill]="selectedMonth() === item.point.month ? 'url(#barFrontSelectedGrad)' : 'url(#barFrontGrad)'"
                      rx="2"
                    />

                    <!-- Top Cap (Isometric Rhombus Roof) -->
                    <polygon
                      class="bar-top"
                      [attr.points]="getTopCapPoints(item)"
                      [attr.fill]="selectedMonth() === item.point.month ? 'url(#barTopSelectedGrad)' : 'url(#barTopGrad)'"
                      stroke="rgba(255,255,255,0.6)"
                      stroke-width="0.8"
                    />

                    <!-- Value Badge above bar when selected or hovered -->
                    @if (selectedMonth() === item.point.month || hoveredPoint()?.point?.month === item.point.month) {
                      <g class="bar-value-pill" [attr.transform]="'translate(' + (item.x + item.barWidth / 2 + 5) + ',' + (item.y - 18) + ')'">
                        <rect
                          x="-42"
                          y="-10"
                          width="84"
                          height="20"
                          rx="4"
                          class="pill-bg"
                        />
                        <text
                          x="0"
                          y="4"
                          text-anchor="middle"
                          class="pill-text"
                        >
                          {{ formatCompactCurrency(item.point.amount) }}
                        </text>
                      </g>
                    }
                  </g>
                }
              </g>
            }

            <!-- ── CHART TYPE 2: LINE CHART ── -->
            @if (selectedType() === 'line') {
              <g class="line-layer">
                <!-- Smooth spline curve -->
                <path
                  class="trend-line-path"
                  [attr.d]="linePathD()"
                  fill="none"
                />

                <!-- Data points -->
                @for (item of calculatedPoints(); track item.point.month) {
                  <g
                    class="data-point-group"
                    [class.selected]="selectedMonth() === item.point.month"
                    [class.dimmed]="selectedMonth() !== null && selectedMonth() !== item.point.month"
                    (click)="toggleMonthSelection(item.point)"
                    (mouseenter)="onElementHover(item, $event)"
                    (mouseleave)="onElementLeave()"
                  >
                    <!-- Outer ring halo -->
                    <circle
                      class="point-halo"
                      [attr.cx]="item.x + item.barWidth / 2"
                      [attr.cy]="item.y"
                      r="12"
                    />
                    <!-- Outer colored ring -->
                    <circle
                      class="point-outer"
                      [attr.cx]="item.x + item.barWidth / 2"
                      [attr.cy]="item.y"
                      r="5.5"
                    />
                    <!-- Inner center dot -->
                    <circle
                      class="point-inner"
                      [attr.cx]="item.x + item.barWidth / 2"
                      [attr.cy]="item.y"
                      r="3"
                    />
                  </g>
                }
              </g>
            }

            <!-- ── CHART TYPE 3: AREA CHART ── -->
            @if (selectedType() === 'area') {
              <g class="area-layer">
                <!-- Shaded Area -->
                <path
                  class="trend-area-path"
                  [attr.d]="areaPathD()"
                  fill="url(#areaTrendGrad)"
                />

                <!-- Top outline line -->
                <path
                  class="trend-line-path"
                  [attr.d]="linePathD()"
                  fill="none"
                />

                <!-- Data points -->
                @for (item of calculatedPoints(); track item.point.month) {
                  <g
                    class="data-point-group"
                    [class.selected]="selectedMonth() === item.point.month"
                    [class.dimmed]="selectedMonth() !== null && selectedMonth() !== item.point.month"
                    (click)="toggleMonthSelection(item.point)"
                    (mouseenter)="onElementHover(item, $event)"
                    (mouseleave)="onElementLeave()"
                  >
                    <circle
                      class="point-halo"
                      [attr.cx]="item.x + item.barWidth / 2"
                      [attr.cy]="item.y"
                      r="12"
                    />
                    <circle
                      class="point-outer"
                      [attr.cx]="item.x + item.barWidth / 2"
                      [attr.cy]="item.y"
                      r="5"
                    />
                    <circle
                      class="point-inner"
                      [attr.cx]="item.x + item.barWidth / 2"
                      [attr.cy]="item.y"
                      r="2.5"
                    />
                  </g>
                }
              </g>
            }

            <!-- X-Axis Labels (Months) -->
            <g class="x-axis-layer">
              @for (item of calculatedPoints(); track item.point.month) {
                <g
                  class="x-label-group"
                  [class.selected]="selectedMonth() === item.point.month"
                  (click)="toggleMonthSelection(item.point)"
                  cursor="pointer"
                >
                  <text
                    class="axis-label x-axis-label"
                    [attr.x]="item.x + item.barWidth / 2 + 5"
                    [attr.y]="baseY + 22"
                    text-anchor="middle"
                  >
                    {{ item.point.shortMonth }}
                  </text>
                  <!-- Active indicator bar under month label -->
                  @if (selectedMonth() === item.point.month) {
                    <rect
                      [attr.x]="item.x + item.barWidth / 2 - 10 + 5"
                      [attr.y]="baseY + 28"
                      width="20"
                      height="2"
                      rx="1"
                      class="label-active-indicator"
                    />
                  }
                </g>
              }
            </g>
          </svg>
        </div>

        <!-- Floating Tooltip -->
        @if (hoveredPoint()) {
          <div
            class="chart-tooltip"
            [style.left.px]="tooltipX()"
            [style.top.px]="tooltipY()"
          >
            <div class="tooltip-header">
              <span class="tooltip-month">{{ hoveredPoint()!.point.month }}</span>
              <span class="tooltip-badge">
                {{ formatPercentOfMax(hoveredPoint()!.point.amount) }} of peak
              </span>
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

      <!-- ── MONTH SELECTION & DETAILED FOCUS CARD ── -->
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
                <span class="metric-lbl">Share of Total</span>
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
              <span>All Months</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin-top: 14px;
    }

    /* ── Main Trend Container ── */
    .trend-card {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      padding: 16px 20px 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      position: relative;
    }

    /* ── Header ── */
    .chart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-color);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .metric-title-wrap {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

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

    .metric-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0 0 4px 0;
      letter-spacing: -0.01em;
    }

    .metric-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

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

      &.count-pill {
        color: var(--muted-text);
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ── Controls & Switchers ── */
    .control-group {
      display: inline-flex;
      align-items: center;
      background: var(--secondary-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      padding: 2px;
      gap: 2px;
    }

    .zoom-group {
      .ctrl-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        border-radius: 4px;
        background: transparent;
        border: none;
        color: var(--muted-text);
        font-size: 0.74rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover:not(:disabled) {
          background: var(--card-surface);
          color: var(--foreground);
        }

        &:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        &.reset-btn {
          min-width: 40px;
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;

          &.active {
            color: var(--primary-accent);
          }
        }
      }
    }

    .chart-type-group {
      .chart-tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 4px;
        background: transparent;
        border: none;
        color: var(--muted-text);
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover:not(.active) {
          color: var(--foreground);
        }

        &.active {
          background: var(--card-surface);
          color: var(--primary-accent);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
        }
      }
    }

    /* ── SVG Viewport ── */
    .chart-viewport {
      position: relative;
      width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      cursor: crosshair;
      border-radius: var(--radius-base);
    }

    .svg-container {
      width: 100%;
      transition: transform 0.15s ease;
    }

    .trend-svg {
      width: 100%;
      height: auto;
      display: block;
      min-width: 500px;
      max-height: 280px;
    }

    /* ── Grid & Axes ── */
    .grid-line {
      stroke: var(--border-color);
      stroke-width: 1;
      stroke-dasharray: 4 4;
    }

    .baseline {
      stroke: oklch(0.8 0.015 260);
      stroke-width: 1.5;
    }

    .axis-label {
      font-size: 10.5px;
      font-weight: 500;
      fill: var(--muted-text);
      user-select: none;
      font-family: var(--font-mono);
    }

    .x-axis-label {
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-sans);
      transition: fill 0.15s ease;
    }

    .x-label-group {
      &:hover .x-axis-label,
      &.selected .x-axis-label {
        fill: var(--primary-accent);
        font-weight: 700;
      }
    }

    .label-active-indicator {
      fill: var(--primary-accent);
    }

    /* ── 3D Bar Elements ── */
    .bar-column-group {
      cursor: pointer;
      transition: opacity 0.15s ease;

      &.dimmed {
        opacity: 0.35;
      }

      &:hover:not(.dimmed) {
        .bar-front {
          filter: brightness(1.05);
        }
      }

      &.selected {
        opacity: 1;
        .bar-front {
          stroke: var(--primary-accent);
          stroke-width: 1.5;
        }
      }
    }

    .bar-front, .bar-top, .bar-side {
      transition: all 0.15s ease;
    }

    .bar-value-pill {
      pointer-events: none;
      .pill-bg {
        fill: var(--card-surface);
        stroke: var(--border-color);
        stroke-width: 1;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.06));
      }
      .pill-text {
        font-size: 10px;
        font-weight: 700;
        fill: var(--foreground);
        font-family: var(--font-mono);
      }
    }

    /* ── Line Chart Elements ── */
    .trend-line-path {
      stroke: oklch(0.58 0.16 256); /* Chart Token 1: Blue */
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .data-point-group {
      cursor: pointer;
      transition: opacity 0.15s ease;

      &.dimmed {
        opacity: 0.35;
      }

      .point-halo {
        fill: oklch(0.58 0.16 256 / 0.15);
        opacity: 0;
        transition: opacity 0.15s ease, r 0.15s ease;
      }

      .point-outer {
        fill: #ffffff;
        stroke: oklch(0.58 0.16 256);
        stroke-width: 2.5;
        transition: all 0.15s ease;
      }

      .point-inner {
        fill: oklch(0.58 0.16 256);
        transition: all 0.15s ease;
      }

      &:hover, &.selected {
        .point-halo {
          opacity: 1;
          r: 14;
        }
        .point-outer {
          stroke: var(--primary-accent);
          r: 7;
        }
        .point-inner {
          fill: var(--primary-accent);
        }
      }
    }

    /* ── Tooltip ── */
    .chart-tooltip {
      position: absolute;
      transform: translate(-50%, -105%);
      pointer-events: none;
      z-index: 50;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-base);
      padding: 8px 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
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

    .tooltip-month {
      font-size: 0.76rem;
      font-weight: 700;
      color: var(--foreground);
    }

    .tooltip-badge {
      font-size: 0.68rem;
      font-weight: 600;
      color: oklch(0.48 0.15 256);
      background: oklch(0.58 0.16 256 / 0.1);
      padding: 1px 6px;
      border-radius: var(--radius-pill);
    }

    .tooltip-amount-row, .tooltip-count-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.76rem;
    }

    .tooltip-label {
      color: var(--muted-text);
    }

    .tooltip-amount {
      font-weight: 700;
      color: var(--foreground);
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }

    .tooltip-count {
      font-weight: 600;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    /* ── Focus Card (Month Clicked) ── */
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

    .focus-left {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

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

    .pulse-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: oklch(0.58 0.16 256);
    }

    .focus-month-title {
      font-size: 0.98rem;
      font-weight: 700;
      color: var(--foreground);
      margin: 0;
    }

    .focus-metrics-row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 2px;
    }

    .metric-box {
      display: flex;
      flex-direction: column;
    }

    .metric-lbl {
      font-size: 0.7rem;
      color: var(--muted-text);
      font-weight: 500;
    }

    .metric-val {
      font-size: 0.9rem;
      font-weight: 700;
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;

      &.primary {
        color: var(--foreground);
      }
      &.secondary {
        color: var(--text-secondary);
      }
      &.tertiary {
        color: oklch(0.48 0.15 256);
      }
    }

    .focus-right {
      display: flex;
      align-items: center;
    }

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

      &:hover {
        background: var(--card-surface);
        border-color: var(--primary-accent);
        color: var(--primary-accent);
      }
    }
  `]
})
export class TrendChartComponent {
  readonly trendData = input.required<TrendSeries>();

  readonly selectedType = signal<ChartType>('3d-bar');
  readonly selectedMonth = signal<string | null>(null);
  readonly hoveredPoint = signal<{ point: TrendDataPoint; x: number; y: number } | null>(null);
  readonly zoomLevel = signal<number>(1.0);

  readonly tooltipX = signal<number>(0);
  readonly tooltipY = signal<number>(0);

  readonly chartCard = viewChild<ElementRef<HTMLDivElement>>('chartCard');
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');

  readonly Math = Math;

  // Layout boundaries
  readonly gridLeft = 65;
  readonly gridRight = 655;
  readonly plotTop = 38;
  readonly baseY = 245;

  // 3D Isometric projection extrusion parameters
  readonly depthDx = 8;
  readonly depthDy = -6;

  readonly yTicks = computed<Tick[]>(() => {
    const data = this.trendData();
    const maxVal = data.maxAmount;
    if (maxVal <= 0) return [];

    const ceiling = this.calculateCeiling(maxVal);
    const steps = 4;
    const ticks: Tick[] = [];
    const availableHeight = this.baseY - this.plotTop;

    for (let i = 0; i <= steps; i++) {
      const val = (ceiling / steps) * i;
      const y = this.baseY - (val / ceiling) * availableHeight;
      ticks.push({
        value: val,
        label: this.formatTickValue(val, data.currencySymbol),
        y: Math.round(y)
      });
    }
    return ticks;
  });

  readonly calculatedPoints = computed(() => {
    const data = this.trendData();
    const count = data.points.length;
    if (count === 0) return [];

    const ceiling = this.calculateCeiling(data.maxAmount);
    const availableWidth = this.gridRight - this.gridLeft - 30;
    const availableHeight = this.baseY - this.plotTop;

    const slotWidth = availableWidth / count;
    const barWidth = Math.min(Math.max(slotWidth * 0.52, 22), 48);

    return data.points.map((pt, i) => {
      const slotCenter = this.gridLeft + 20 + i * slotWidth + slotWidth / 2;
      const x = slotCenter - barWidth / 2;
      const h = ceiling > 0 ? (pt.amount / ceiling) * availableHeight : 0;
      const y = Math.round(this.baseY - h);

      return {
        point: pt,
        x: Math.round(x),
        y,
        barWidth: Math.round(barWidth),
        slotCenter: Math.round(slotCenter)
      };
    });
  });

  readonly selectedPoint = computed<TrendDataPoint | null>(() => {
    const m = this.selectedMonth();
    if (!m) return null;
    return this.trendData().points.find(p => p.month === m) || null;
  });

  readonly linePathD = computed(() => {
    const pts = this.calculatedPoints();
    if (pts.length === 0) return '';
    if (pts.length === 1) {
      const p0 = pts[0];
      return `M ${p0.x + p0.barWidth / 2} ${p0.y}`;
    }

    const coords = pts.map(p => ({ x: p.x + p.barWidth / 2, y: p.y }));
    let d = `M ${coords[0].x} ${coords[0].y}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cx1 = curr.x + (next.x - curr.x) / 2;
      const cy1 = curr.y;
      const cx2 = curr.x + (next.x - curr.x) / 2;
      const cy2 = next.y;
      d += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${next.x} ${next.y}`;
    }
    return d;
  });

  readonly areaPathD = computed(() => {
    const pts = this.calculatedPoints();
    if (pts.length === 0) return '';
    const lineD = this.linePathD();
    const first = pts[0];
    const last = pts[pts.length - 1];
    const firstX = first.x + first.barWidth / 2;
    const lastX = last.x + last.barWidth / 2;

    return `${lineD} L ${lastX} ${this.baseY} L ${firstX} ${this.baseY} Z`;
  });

  selectType(type: ChartType): void {
    this.selectedType.set(type);
  }

  toggleMonthSelection(point: TrendDataPoint): void {
    if (this.selectedMonth() === point.month) {
      this.selectedMonth.set(null);
    } else {
      this.selectedMonth.set(point.month);
    }
  }

  clearMonthSelection(): void {
    this.selectedMonth.set(null);
  }

  zoomIn(): void {
    const next = Math.min(this.zoomLevel() + 0.25, 2.2);
    this.zoomLevel.set(parseFloat(next.toFixed(2)));
  }

  zoomOut(): void {
    const next = Math.max(this.zoomLevel() - 0.25, 0.8);
    this.zoomLevel.set(parseFloat(next.toFixed(2)));
  }

  resetZoom(): void {
    this.zoomLevel.set(1.0);
  }

  onWheel(event: WheelEvent): void {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (event.deltaY < 0) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
    }
  }

  onElementHover(item: { point: TrendDataPoint; x: number; y: number; barWidth: number }, event: MouseEvent): void {
    const viewportEl = this.viewport()?.nativeElement;
    if (!viewportEl) return;
    const rect = viewportEl.getBoundingClientRect();
    const posX = event.clientX - rect.left;
    const posY = event.clientY - rect.top;

    this.hoveredPoint.set(item);
    this.tooltipX.set(Math.max(85, Math.min(posX, rect.width - 85)));
    this.tooltipY.set(Math.max(10, posY - 12));
  }

  onElementLeave(): void {
    this.hoveredPoint.set(null);
  }

  getTopCapPoints(item: { x: number; y: number; barWidth: number }): string {
    const p1 = `${item.x},${item.y}`;
    const p2 = `${item.x + this.depthDx},${item.y + this.depthDy}`;
    const p3 = `${item.x + item.barWidth + this.depthDx},${item.y + this.depthDy}`;
    const p4 = `${item.x + item.barWidth},${item.y}`;
    return `${p1} ${p2} ${p3} ${p4}`;
  }

  getSideFacetPoints(item: { x: number; y: number; barWidth: number }): string {
    const p1 = `${item.x + item.barWidth},${item.y}`;
    const p2 = `${item.x + item.barWidth + this.depthDx},${item.y + this.depthDy}`;
    const p3 = `${item.x + item.barWidth + this.depthDx},${this.baseY + this.depthDy}`;
    const p4 = `${item.x + item.barWidth},${this.baseY}`;
    return `${p1} ${p2} ${p3} ${p4}`;
  }

  formatCompactCurrency(val: number): string {
    const sym = this.trendData().currencySymbol || '$';
    if (val >= 1_000_000_000) {
      return `${sym}${(val / 1_000_000_000).toFixed(1)}B`;
    }
    if (val >= 1_000_000) {
      return `${sym}${(val / 1_000_000).toFixed(1)}M`;
    }
    if (val >= 1_000) {
      return `${sym}${(val / 1_000).toFixed(1)}K`;
    }
    return `${sym}${val.toFixed(0)}`;
  }

  formatPercentOfMax(val: number): string {
    const max = this.trendData().maxAmount;
    if (!max || max <= 0) return '100%';
    const pct = Math.round((val / max) * 100);
    return `${pct}%`;
  }

  getShareOfTotal(val: number): string {
    const tot = this.trendData().totalAmount;
    if (!tot || tot <= 0) return '0%';
    return `${((val / tot) * 100).toFixed(1)}%`;
  }

  private calculateCeiling(maxVal: number): number {
    if (maxVal <= 0) return 100;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const leading = maxVal / magnitude;
    let ceilingLeading = Math.ceil(leading * 1.12);
    if (ceilingLeading % 2 !== 0 && ceilingLeading < 10) {
      ceilingLeading += 1;
    }
    return ceilingLeading * magnitude;
  }

  private formatTickValue(val: number, symbol: string): string {
    if (val === 0) return `${symbol}0`;
    if (val >= 1_000_000_000) {
      return `${symbol}${(val / 1_000_000_000).toFixed(1)}B`;
    }
    if (val >= 1_000_000) {
      const v = val / 1_000_000;
      return `${symbol}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
    }
    if (val >= 1_000) {
      return `${symbol}${(val / 1_000).toFixed(0)}K`;
    }
    return `${symbol}${val.toFixed(0)}`;
  }
}
