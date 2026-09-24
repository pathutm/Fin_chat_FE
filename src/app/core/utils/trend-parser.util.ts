export const EXECUTIVE_PALETTE = [
  '#2563eb', // Executive Blue
  '#0d9488', // Emerald / Teal
  '#d97706', // Amber / Gold
  '#7c3aed', // Purple / Violet
  '#e11d48', // Rose / Crimson
  '#0284c7', // Sky Blue
  '#16a34a', // Forest Green
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#64748b'  // Slate
];

export interface DataSeries {
  id: string;
  name: string;
  color: string;
  points: TrendDataPoint[];
  unit?: string;
  unitType?: 'currency' | 'number' | 'percent';
}

export interface TrendDataPoint {
  month: string;              // e.g. "January 2026" or "March 2023" or category name
  shortMonth: string;         // e.g. "Jan '26" or "Mar '23" or "Hardware"
  rawAmount: string;          // e.g. "$31,073,919.57" (exact string preserved from response)
  amount: number;             // numeric for chart plotting e.g. 31073919.57
  currencySymbol: string;     // e.g. "$" or "₹" or "€"
  invoiceCount?: string;      // secondary metric raw string e.g. "1,245" or "1,245 orders"
  invoiceCountNum?: number;   // numeric secondary metric
  percentOfMax?: number;      // 0 to 100 relative to peak
  year?: number;              // e.g. 2023, 2026
  monthIndex?: number;        // 0-11
  sortKey: number;            // e.g. 202303 for chronological ordering. Always assigned (1-indexed by position if year unknown)
  pointIndex: number;         // original index in parsed order — always stable and unique
  entityValues?: { [entityName: string]: { amount: number; rawAmount: string; count?: number; isMissing?: boolean } };
  isMissing?: boolean;
  metricLabel?: string;
  secondaryMetricLabel?: string;
  granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface YearPeriodOption {
  id: string;                 // e.g. "2025-2026", "2023-2024", "all"
  label: string;              // e.g. "2025–2026", "2023–2024", "All (42 Months)"
  years: number[];            // e.g. [2025, 2026]
  pointCount: number;
  minPointIndex: number;      // inclusive: start index in full points array
  maxPointIndex: number;      // inclusive: end index in full points array
}

export interface TrendSeries {
  title: string;
  points: TrendDataPoint[];   // full sorted dataset, never filtered
  currencySymbol: string;
  maxAmount: number;
  minAmount: number;
  totalAmount: number;
  totalAmountFormatted: string;
  peakPoint: TrendDataPoint;
  lowestPoint: TrendDataPoint;
  hasInvoiceCount: boolean;
  periodOptions: YearPeriodOption[];
  defaultPeriodId: string;
  seriesList?: DataSeries[];
  isMultiEntity?: boolean;
  isMultiMetric?: boolean;
  entityNames?: string[];
  granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  categoryType?: 'time' | 'category';
  metricUnit?: string;
  metricLabel?: string;
  secondaryMetricLabel?: string;
  dimensionLabel?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBRS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DATE_REGEX = new RegExp(
  `\\b(?:(?:${MONTH_NAMES.join('|')}|${MONTH_ABBRS.join('|')})\\s*['']?(?:20\\d\\d|19\\d\\d|\\d\\d)?|(?:20\\d\\d|19\\d\\d)[-/.](?:0?[1-9]|1[0-2])(?:[-/.](?:0?[1-9]|[12]\\d|3[01]))?|(?:0?[1-9]|1[0-2])[-/.](?:20\\d\\d|19\\d\\d)|(?:20\\d\\d)(?:0[1-9]|1[0-2])|Q[1-4]\\s*['']?(?:20\\d\\d|\\d\\d)?|Week\\s*\\d{1,2}\\s*(?:20\\d\\d)?|W\\d{1,2}\\s*['']?(?:20\\d\\d|\\d\\d)?|(?:20\\d\\d))\\b`,
  'i'
);

const MONTH_REGEX = DATE_REGEX;

/**
 * Clean up currency string and extract numerical value, supporting multipliers (M, B, K).
 */
function parseNumericAmount(raw: string): number | null {
  if (!raw) return null;
  const match = raw.match(/[-+]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[-+]?[0-9]+(?:\.[0-9]+)?/);
  if (!match) return null;
  let num = parseFloat(match[0].replace(/,/g, ''));
  if (isNaN(num)) return null;

  // Check for unit suffixes after the number (e.g. M, B, K, Million, Billion)
  const afterNum = raw.slice(raw.indexOf(match[0]) + match[0].length).trim();
  if (/^b(?:illion)?\b/i.test(afterNum)) {
    num *= 1e9;
  } else if (/^m(?:illion)?\b/i.test(afterNum)) {
    num *= 1e6;
  } else if (/^k(?:\b|(?=[^a-z]))/i.test(afterNum)) {
    num *= 1e3;
  }
  return num;
}

/**
 * Extract currency symbol or prefix (returns ONLY valid currency symbols: $, ₹, €, £, ¥).
 * Never returns words or month abbreviations.
 */
export function extractCurrencySymbol(raw: string): string {
  if (!raw) return '$';
  if (raw.includes('$')) return '$';
  if (raw.includes('₹') || /\bINR\b/i.test(raw)) return '$';
  if (raw.includes('€') || /\bEUR\b/i.test(raw)) return '€';
  if (raw.includes('£') || /\bGBP\b/i.test(raw)) return '£';
  if (raw.includes('¥') || /\b(?:JPY|CNY)\b/i.test(raw)) return '¥';
  return '$';
}

interface ParsedDateInfo {
  year?: number;
  monthIndex?: number;
  displayMonth: string;
  shortMonth: string;
  sortKey: number;
  granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

/**
 * Parse date label into structured year, month index, and clean display labels.
 * Supports Daily, Weekly, Monthly, Quarterly, Yearly, or clean fallback for categories.
 */
export function parseDateInfo(label: string, fallbackYear?: number): ParsedDateInfo {
  if (!label) {
    return { displayMonth: '', shortMonth: '', sortKey: 0 };
  }

  const clean = label.replace(/[*_`]/g, '').trim();

  const monthNamesStr = MONTH_NAMES.join('|');
  const monthAbbrsStr = MONTH_ABBRS.join('|');
  const monthPatternStr = `(?:${monthNamesStr}|${monthAbbrsStr})`;

  // 1. Full Date Month First: "April 14, 2023", "April 1, 2023", "Apr 14, 2023", "Apr 14 '23"
  const fullDateMonthFirst = clean.match(
    new RegExp(`^(${monthPatternStr})[.]?\\s+([0-3]?\\d)[,.]?\\s+['’]?(\\d{4}|\\d{2})$`, 'i')
  );
  if (fullDateMonthFirst) {
    const mStr = fullDateMonthFirst[1].toLowerCase();
    const day = parseInt(fullDateMonthFirst[2], 10);
    const yRaw = fullDateMonthFirst[3];
    const year = yRaw.length === 2 ? 2000 + parseInt(yRaw, 10) : parseInt(yRaw, 10);
    let mIdx = MONTH_NAMES.findIndex(n => n.toLowerCase().startsWith(mStr.slice(0, 3)));
    if (mIdx === -1) mIdx = MONTH_ABBRS.findIndex(a => a.toLowerCase().startsWith(mStr.slice(0, 3)));
    if (mIdx >= 0 && day >= 1 && day <= 31 && year >= 1990 && year <= 2099) {
      const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
      const fullM = MONTH_NAMES[mIdx];
      return {
        year, monthIndex: mIdx,
        displayMonth: `${day} ${fullM} ${year}`,
        shortMonth: `${day} ${shortM} '${String(year).slice(2)}`,
        sortKey: year * 10000 + (mIdx + 1) * 100 + day,
        granularity: 'daily'
      };
    }
  }

  // 2. Full Date Day First: "14 April 2023", "14 Apr 2023", "14-Apr-2023", "14th April 2023"
  const fullDateDayFirst = clean.match(
    new RegExp(`^([0-3]?\\d)(?:st|nd|rd|th)?\\s*[-/.,]?\\s*(${monthPatternStr})[.]?\\s*[-/.,']?\\s*(\\d{4}|\\d{2})$`, 'i')
  );
  if (fullDateDayFirst) {
    const day = parseInt(fullDateDayFirst[1], 10);
    const mStr = fullDateDayFirst[2].toLowerCase();
    const yRaw = fullDateDayFirst[3];
    const year = yRaw.length === 2 ? 2000 + parseInt(yRaw, 10) : parseInt(yRaw, 10);
    let mIdx = MONTH_NAMES.findIndex(n => n.toLowerCase().startsWith(mStr.slice(0, 3)));
    if (mIdx === -1) mIdx = MONTH_ABBRS.findIndex(a => a.toLowerCase().startsWith(mStr.slice(0, 3)));
    if (mIdx >= 0 && day >= 1 && day <= 31 && year >= 1990 && year <= 2099) {
      const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
      const fullM = MONTH_NAMES[mIdx];
      return {
        year, monthIndex: mIdx,
        displayMonth: `${day} ${fullM} ${year}`,
        shortMonth: `${day} ${shortM} '${String(year).slice(2)}`,
        sortKey: year * 10000 + (mIdx + 1) * 100 + day,
        granularity: 'daily'
      };
    }
  }

  // 3. Daily ISO: YYYY-MM-DD
  const dailyIsoMatch = clean.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])$/);
  if (dailyIsoMatch) {
    const year = parseInt(dailyIsoMatch[1], 10);
    const mNum = parseInt(dailyIsoMatch[2], 10);
    const day = parseInt(dailyIsoMatch[3], 10);
    const mIdx = mNum - 1;
    const shortM = MONTH_ABBRS[mIdx]?.slice(0, 3) || `M${mNum}`;
    return {
      year, monthIndex: mIdx,
      displayMonth: `${day} ${MONTH_NAMES[mIdx] || shortM} ${year}`,
      shortMonth: `${day} ${shortM} '${String(year).slice(2)}`,
      sortKey: year * 10000 + mNum * 100 + day,
      granularity: 'daily'
    };
  }

  // 4. Quarterly: Q1 2024, Q1 '24, 2024 Q3, 2024-Q2
  const qMatch = clean.match(/^(?:(?:Q([1-4])\s*[-/.,']?\s*(\d{2,4})?)|(?:(\d{4})\s*[-/.,]?\s*Q([1-4])))$/i);
  if (qMatch) {
    const qNum = parseInt(qMatch[1] || qMatch[4], 10);
    const rawY = qMatch[2] || qMatch[3];
    let year = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY, 10) : parseInt(rawY, 10)) : (fallbackYear || 2024);
    return {
      year,
      monthIndex: (qNum - 1) * 3,
      displayMonth: `Q${qNum} ${year}`,
      shortMonth: `Q${qNum} '${String(year).slice(2)}`,
      sortKey: year * 100 + qNum * 25,
      granularity: 'quarterly'
    };
  }

  // 5. Weekly: W01 2024, Week 1 2024, 2024-W05
  const wMatch = clean.match(/^(?:(?:(?:W|Week)\s*([0-5]?\d)\s*[-/.,']?\s*(\d{2,4})?)|(?:(\d{4})\s*[-/.,]?\s*W([0-5]?\d)))$/i);
  if (wMatch) {
    const wNum = parseInt(wMatch[1] || wMatch[4], 10);
    const rawY = wMatch[2] || wMatch[3];
    let year = rawY ? (rawY.length === 2 ? 2000 + parseInt(rawY, 10) : parseInt(rawY, 10)) : (fallbackYear || 2024);
    return {
      year,
      displayMonth: `Week ${wNum}, ${year}`,
      shortMonth: `W${String(wNum).padStart(2, '0')} '${String(year).slice(2)}`,
      sortKey: year * 10000 + wNum * 100,
      granularity: 'weekly'
    };
  }

  // 6. ISO Monthly: YYYY-MM, YYYY/MM, YYYY.MM
  const isoMatch = clean.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const mNum = parseInt(isoMatch[2], 10);
    const mIdx = mNum - 1;
    const shortM = MONTH_ABBRS[mIdx]?.slice(0, 3) || `M${mNum}`;
    const fullM = MONTH_NAMES[mIdx] || shortM;
    return {
      year, monthIndex: mIdx,
      displayMonth: `${fullM} ${year}`,
      shortMonth: `${shortM} '${String(year).slice(2)}`,
      sortKey: year * 100 + mNum,
      granularity: 'monthly'
    };
  }

  // 7. 6-digit numeric YYYYMM e.g. "202303"
  const yyyymmMatch = clean.match(/^(\d{4})(0[1-9]|1[0-2])$/);
  if (yyyymmMatch) {
    const year = parseInt(yyyymmMatch[1], 10);
    const mNum = parseInt(yyyymmMatch[2], 10);
    const mIdx = mNum - 1;
    const shortM = MONTH_ABBRS[mIdx]?.slice(0, 3) || `M${mNum}`;
    const fullM = MONTH_NAMES[mIdx] || shortM;
    return {
      year, monthIndex: mIdx,
      displayMonth: `${fullM} ${year}`,
      shortMonth: `${shortM} '${String(year).slice(2)}`,
      sortKey: year * 100 + mNum,
      granularity: 'monthly'
    };
  }

  // 8. MM-YYYY or MM/YYYY
  const mmyyyyMatch = clean.match(/^(0?[1-9]|1[0-2])[-/.](\d{4})$/);
  if (mmyyyyMatch) {
    const mNum = parseInt(mmyyyyMatch[1], 10);
    const year = parseInt(mmyyyyMatch[2], 10);
    const mIdx = mNum - 1;
    const shortM = MONTH_ABBRS[mIdx]?.slice(0, 3) || `M${mNum}`;
    const fullM = MONTH_NAMES[mIdx] || shortM;
    return {
      year, monthIndex: mIdx,
      displayMonth: `${fullM} ${year}`,
      shortMonth: `${shortM} '${String(year).slice(2)}`,
      sortKey: year * 100 + mNum,
      granularity: 'monthly'
    };
  }

  // 9. Year first: "YYYY Month" e.g. "2025 January", "2025-Jan", "2025/Sep"
  const yearFirstMatch = clean.match(
    new RegExp(`^(\\d{4})\\s*[-/.,]?\\s*(${monthPatternStr})`, 'i')
  );
  if (yearFirstMatch) {
    const year = parseInt(yearFirstMatch[1], 10);
    const namePart = yearFirstMatch[2].toLowerCase();
    let mIdx = MONTH_NAMES.findIndex(n => n.toLowerCase().startsWith(namePart.slice(0, 3)));
    if (mIdx === -1) {
      mIdx = MONTH_ABBRS.findIndex(a => a.toLowerCase().startsWith(namePart.slice(0, 3)));
    }
    if (mIdx >= 0) {
      const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
      const fullM = MONTH_NAMES[mIdx];
      return {
        year, monthIndex: mIdx,
        displayMonth: `${fullM} ${year}`,
        shortMonth: `${shortM} '${String(year).slice(2)}`,
        sortKey: year * 100 + (mIdx + 1),
        granularity: 'monthly'
      };
    }
  }

  // 10. Month first with 4-digit or 2-digit Year: "January 2026", "Jan '26", "Jan-2026", "Sep, 2026"
  const monthFirstMatch = clean.match(
    new RegExp(`^(${monthPatternStr})[.]?\\s*[-/.,'’]?\\s*(\\d{4}|\\d{2})$`, 'i')
  );
  if (monthFirstMatch) {
    const namePart = monthFirstMatch[1].toLowerCase();
    const yStr = monthFirstMatch[2];
    const year = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);
    let mIdx = MONTH_NAMES.findIndex(n => n.toLowerCase().startsWith(namePart.slice(0, 3)));
    if (mIdx === -1) {
      mIdx = MONTH_ABBRS.findIndex(a => a.toLowerCase().startsWith(namePart.slice(0, 3)));
    }
    if (mIdx >= 0 && year >= 1990 && year <= 2099) {
      const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
      const fullM = MONTH_NAMES[mIdx];
      return {
        year, monthIndex: mIdx,
        displayMonth: `${fullM} ${year}`,
        shortMonth: `${shortM} '${String(year).slice(2)}`,
        sortKey: year * 100 + (mIdx + 1),
        granularity: 'monthly'
      };
    }
  }

  // 11. Pure Year e.g. "2024", "FY2024", "FY 2025"
  const pureYearMatch = clean.match(/^(?:FY\s*)?(20\d\d)$/i);
  if (pureYearMatch) {
    const year = parseInt(pureYearMatch[1], 10);
    return {
      year,
      displayMonth: `${year}`,
      shortMonth: `${year}`,
      sortKey: year * 100,
      granularity: 'yearly'
    };
  }

  // 12. Pure Month Name (e.g. "January", "Sep") with optional fallbackYear
  const pureMonthMatch = clean.match(new RegExp(`^(${monthPatternStr})[.]?$`, 'i'));
  if (pureMonthMatch) {
    const namePart = pureMonthMatch[1].toLowerCase();
    let mIdx = MONTH_NAMES.findIndex(n => n.toLowerCase().startsWith(namePart.slice(0, 3)));
    if (mIdx === -1) {
      mIdx = MONTH_ABBRS.findIndex(a => a.toLowerCase().startsWith(namePart.slice(0, 3)));
    }
    if (mIdx >= 0) {
      const year = fallbackYear && fallbackYear >= 1990 && fallbackYear <= 2099 ? fallbackYear : undefined;
      const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
      const fullM = MONTH_NAMES[mIdx];
      return {
        year, monthIndex: mIdx,
        displayMonth: year ? `${fullM} ${year}` : fullM,
        shortMonth: year ? `${shortM} '${String(year).slice(2)}` : shortM,
        sortKey: year ? year * 100 + (mIdx + 1) : 0,
        granularity: 'monthly'
      };
    }
  }

  // Fallback for custom categorical labels (e.g. "Hardware", "Consulting", "Enterprise")
  return {
    displayMonth: clean,
    shortMonth: clean.length > 14 ? clean.slice(0, 12) + '…' : clean,
    sortKey: 0
  };
}

/**
 * Generate ONLY consecutive 2-year window period options (e.g. "2023–2024", "2024–2025", "2025–2026").
 *
 * Rules:
 *  - Must be consecutive 2-year ranges: [y, y + 1]
 *  - NO skipped ranges like "2023–2025"
 *  - NO individual-year options ("2023", "2024", ...)
 *  - NO "All" option
 */
export function generatePeriodOptions(points: TrendDataPoint[]): YearPeriodOption[] {
  if (!points || points.length === 0) {
    return [];
  }

  // Extract unique sorted years from points that have a valid year
  const knownYears = Array.from(
    new Set(
      points
        .map(p => p.year)
        .filter((y): y is number => typeof y === 'number' && !isNaN(y) && y >= 1990 && y <= 2099)
    )
  ).sort((a, b) => a - b);

  if (knownYears.length === 0) {
    return [{
      id: 'chunk-1',
      label: `All (${points.length})`,
      years: [],
      pointCount: points.length,
      minPointIndex: 0,
      maxPointIndex: points.length - 1
    }];
  }

  const minYear = knownYears[0];
  const maxYear = knownYears[knownYears.length - 1];
  const options: YearPeriodOption[] = [];

  if (minYear === maxYear) {
    const rangePts = points.filter(p => p.year === minYear);
    const minIdx = rangePts.length > 0 ? Math.min(...rangePts.map(p => p.pointIndex)) : 0;
    const maxIdx = rangePts.length > 0 ? Math.max(...rangePts.map(p => p.pointIndex)) : points.length - 1;
    options.push({
      id: `${minYear}`,
      label: `${minYear}`,
      years: [minYear],
      pointCount: rangePts.length > 0 ? rangePts.length : points.length,
      minPointIndex: minIdx,
      maxPointIndex: maxIdx
    });
  } else {
    // Generate ONLY consecutive 2-year ranges: 2023–2024, 2024–2025, 2025–2026
    for (let y = minYear; y < maxYear; y++) {
      const y1 = y;
      const y2 = y + 1;
      const rangePts = points.filter(p => p.year === y1 || p.year === y2);
      if (rangePts.length > 0) {
        const minIdx = Math.min(...rangePts.map(p => p.pointIndex));
        const maxIdx = Math.max(...rangePts.map(p => p.pointIndex));
        options.push({
          id: `${y1}-${y2}`,
          label: `${y1}–${y2}`,
          years: [y1, y2],
          pointCount: rangePts.length,
          minPointIndex: minIdx,
          maxPointIndex: maxIdx
        });
      }
    }
  }

  if (options.length === 0) {
    options.push({
      id: `${minYear}-${minYear + 1}`,
      label: `${minYear}–${minYear + 1}`,
      years: [minYear, minYear + 1],
      pointCount: points.length,
      minPointIndex: 0,
      maxPointIndex: points.length - 1
    });
  }

  return options;
}

export type ChartType =
  | 'line'
  | 'multi-line'
  | 'area'
  | 'bar'
  | 'grouped-bar'
  | 'stacked-bar'
  | 'scatter'
  | 'histogram'
  | 'donut'
  | 'waterfall';

export interface ChartTypeMeta {
  type: ChartType;
  label: string;
  category: 'trend' | 'comparison' | 'distribution' | 'relationship' | 'composition' | 'analytics';
  description: string;
}

export interface HistogramBin {
  binIndex: number;
  label: string;
  minAmount: number;
  maxAmount: number;
  count: number;
  percent: number;
  points: TrendDataPoint[];
}

export interface WaterfallStep {
  label: string;
  shortLabel: string;
  amount: number;
  startValue: number;
  endValue: number;
  isTotal: boolean;
  isPositive: boolean;
  changeFormatted: string;
}

export interface DonutSlice {
  label: string;
  shortLabel: string;
  amount: number;
  percentage: number;
  color: string;
  startAngle: number;
  endAngle: number;
  pathD: string;
}

export interface UserQueryAnalysis {
  isAmbiguous: boolean;
  preferredChartType?: ChartType;
  explicitRangeFound: boolean;
  matchedFromIndex?: number;
  matchedToIndex?: number;
  description?: string;
}

/**
 * Returns the set of valid, meaningful chart types for the provided dataset and query context.
 * Strict validation: only show chart options supported by the data!
 */
export function getSuitableChartTypes(
  series: TrendSeries,
  query?: string
): { suitableTypes: ChartTypeMeta[]; defaultType: ChartType } {
  const pts = series.points || [];
  const analysis = analyzeUserQuery(query, pts);
  const suitable: ChartTypeMeta[] = [];
  const isMulti = !!(series.isMultiEntity && series.seriesList && series.seriesList.length >= 2);
  const hasChronology = pts.length >= 2 && pts.some(p => p.sortKey > 0);
  const isCategoryOnly = series.categoryType === 'category' || !hasChronology;

  // 1. Line: Valid for all datasets with >= 2 points (time trajectory or entity profile)
  if (pts.length >= 2) {
    suitable.push({
      type: 'line',
      label: isMulti ? 'Multi-Line' : 'Line',
      category: 'trend',
      description: isMulti ? 'Comparative trajectory of all entities' : (hasChronology ? 'Continuous trend trajectory over time' : 'Comparative trend profile across entities')
    });
  }

  // 1b. Area: Valid for chronological time series
  if (hasChronology) {
    suitable.push({
      type: 'area',
      label: 'Area',
      category: 'trend',
      description: 'Volume and cumulative momentum'
    });
  }

  // 2. Bar: Valid for all comparisons (time series or category)
  suitable.push({
    type: 'bar',
    label: isMulti ? 'Grouped Bar' : 'Bar',
    category: 'comparison',
    description: isMulti ? 'Direct periodic comparison across entities' : 'Discrete periodic comparison'
  });

  // 3. Stacked Bar: Valid when multiple entities/metrics exist
  if (isMulti) {
    suitable.push({
      type: 'stacked-bar',
      label: 'Stacked Bar',
      category: 'composition',
      description: 'Component contribution stacked to periodic total'
    });
  }

  // 4. Donut: Valid when composition/breakdown across 2 to 12 entities or periods
  if (isMulti || (pts.length >= 2 && pts.length <= 12)) {
    suitable.push({
      type: 'donut',
      label: 'Donut',
      category: 'composition',
      description: 'Proportional share and categorical composition'
    });
  }

  // 5. Waterfall: Valid for variance walks across periods or comparative variance steps between entities (2 to 24 points)
  if (pts.length >= 2 && pts.length <= 24) {
    suitable.push({
      type: 'waterfall',
      label: 'Waterfall',
      category: 'analytics',
      description: hasChronology ? 'Period-over-period incremental net variance walk' : 'Step-down comparative variance walk across entities'
    });
  }

  // 6. Scatter: Valid when 2 meaningful numeric dimensions exist (amount & volume, or 2 metrics)
  if (series.hasInvoiceCount && pts.length >= 3) {
    suitable.push({
      type: 'scatter',
      label: 'Scatter',
      category: 'relationship',
      description: 'Correlation between invoice volume and amount'
    });
  }

  // 7. Histogram: Valid when numeric distribution has variance across at least 3 points
  if (pts.length >= 3 && series.maxAmount > series.minAmount) {
    suitable.push({
      type: 'histogram',
      label: 'Histogram',
      category: 'distribution',
      description: 'Value frequency distribution across amount brackets'
    });
  }

  // Determine defaultType dynamically based on analytical intent of query and data structure:
  let defaultType: ChartType = 'line';
  const cleanQ = (query || '').toLowerCase();

  if (analysis.preferredChartType && suitable.some(s => s.type === analysis.preferredChartType)) {
    defaultType = analysis.preferredChartType;
  } else if (/\b(?:distribution|histogram|spread|frequency|brackets?)\b/i.test(cleanQ) && suitable.some(s => s.type === 'histogram')) {
    defaultType = 'histogram';
  } else if (/\b(?:correlation|relationship|scatter|volume\s*vs\s*amount)\b/i.test(cleanQ) && suitable.some(s => s.type === 'scatter')) {
    defaultType = 'scatter';
  } else if (/\b(?:composition|breakdown|share|proportion|percentage|pie|donut)\b/i.test(cleanQ) && suitable.some(s => s.type === 'donut')) {
    defaultType = 'donut';
  } else if (/\b(?:waterfall|variance|bridge|walk|change\s*over\s*time)\b/i.test(cleanQ) && suitable.some(s => s.type === 'waterfall')) {
    defaultType = 'waterfall';
  } else if (/\b(?:stacked|stack)\b/i.test(cleanQ) && suitable.some(s => s.type === 'stacked-bar')) {
    defaultType = 'stacked-bar';
  } else if (/\b(?:compare|comparison|vs|versus|column|ranking|rank|top)\b/i.test(cleanQ) && suitable.some(s => s.type === 'bar')) {
    defaultType = 'bar';
  } else if (/\b(?:area|volume\s*trend|momentum)\b/i.test(cleanQ) && suitable.some(s => s.type === 'area')) {
    defaultType = 'area';
  } else if (isCategoryOnly && suitable.some(s => s.type === 'bar')) {
    defaultType = 'bar';
  } else if (isMulti && suitable.some(s => s.type === 'line')) {
    defaultType = 'line';
  } else if (suitable.some(s => s.type === 'line')) {
    defaultType = 'line';
  } else if (suitable.length > 0) {
    defaultType = suitable[0].type;
  }

  return { suitableTypes: suitable, defaultType };
}

/**
 * Calculates histogram bins for amount distribution.
 */
export function calculateHistogramBins(
  points: TrendDataPoint[],
  currencySymbol = '$',
  binCount = 4
): HistogramBin[] {
  if (!points || points.length === 0) return [];
  const amounts = points.map(p => p.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);

  if (min === max) {
    return [{
      binIndex: 0,
      label: `${currencySymbol}${Math.round(min).toLocaleString()}`,
      minAmount: min,
      maxAmount: max,
      count: points.length,
      percent: 100,
      points
    }];
  }

  // Choose 3 to 5 bins max to prevent X-axis congestion
  const countBins = Math.min(binCount || 4, points.length <= 4 ? 3 : (points.length <= 15 ? 4 : 5));
  const range = max - min;
  const binWidth = range / countBins;
  const bins: HistogramBin[] = Array.from({ length: countBins }, (_, i) => {
    const bMin = min + i * binWidth;
    const bMax = i === countBins - 1 ? max : min + (i + 1) * binWidth;
    const formatB = (v: number) => {
      if (v >= 1e7) return `${currencySymbol}${(v / 1e7).toFixed(1)}Cr`;
      if (v >= 1e6) return `${currencySymbol}${(v / 1e6).toFixed(1)}M`;
      if (v >= 1e3) return `${currencySymbol}${(v / 1e3).toFixed(0)}K`;
      return `${currencySymbol}${Math.round(v)}`;
    };
    return {
      binIndex: i,
      label: `${formatB(bMin)}–${formatB(bMax)}`,
      minAmount: bMin,
      maxAmount: bMax,
      count: 0,
      percent: 0,
      points: []
    };
  });

  for (const pt of points) {
    let assigned = false;
    for (let i = 0; i < bins.length; i++) {
      const isLast = i === bins.length - 1;
      if (pt.amount >= bins[i].minAmount && (isLast ? pt.amount <= bins[i].maxAmount : pt.amount < bins[i].maxAmount)) {
        bins[i].count++;
        bins[i].points.push(pt);
        assigned = true;
        break;
      }
    }
    if (!assigned && bins.length > 0) {
      bins[bins.length - 1].count++;
      bins[bins.length - 1].points.push(pt);
    }
  }

  const total = points.length;
  for (const b of bins) {
    b.percent = total > 0 ? Math.round((b.count / total) * 100) : 0;
  }

  return bins;
}

/**
 * Format waterfall amounts adaptively based on magnitude and currency symbol.
 */
function formatWaterfallAmount(val: number, symbol: string): string {
  const isPercent = symbol === '%';
  const abs = Math.abs(val);
  if (isPercent) {
    return `${val.toFixed(1)}%`;
  }
  if (abs >= 1e9) {
    return `${symbol}${(val / 1e9).toFixed(1)}B`;
  }
  if (abs >= 1e6) {
    return `${symbol}${(val / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) {
    return `${symbol}${(val / 1e3).toFixed(1)}K`;
  }
  return `${symbol}${val.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
}

/**
 * Calculates incremental variance steps for Waterfall chart across time periods or comparative entities.
 */
export function calculateWaterfallData(
  points: TrendDataPoint[],
  currencySymbol = '$'
): WaterfallStep[] {
  if (!points || points.length === 0) return [];
  const steps: WaterfallStep[] = [];

  // Step 1: Base / Starting Point
  const first = points[0];
  steps.push({
    label: first.month,
    shortLabel: first.shortMonth,
    amount: first.amount,
    startValue: 0,
    endValue: first.amount,
    isTotal: true,
    isPositive: true,
    changeFormatted: formatWaterfallAmount(first.amount, currencySymbol)
  });

  let runningVal = first.amount;
  // Steps 2 to N: Step-over-step variance changes
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const diff = curr.amount - prev.amount;
    const startVal = runningVal;
    runningVal = curr.amount;

    const diffFormatted = diff >= 0
      ? `+${formatWaterfallAmount(diff, currencySymbol)}`
      : `-${formatWaterfallAmount(Math.abs(diff), currencySymbol)}`;

    steps.push({
      label: curr.month,
      shortLabel: curr.shortMonth,
      amount: Math.abs(diff),
      startValue: Math.min(startVal, runningVal),
      endValue: Math.max(startVal, runningVal),
      isTotal: false,
      isPositive: diff >= 0,
      changeFormatted: diffFormatted
    });
  }

  // Final Step: Net Total / Ending Entity
  const last = points[points.length - 1];
  if (points.length > 1) {
    steps.push({
      label: `Net (${last.shortMonth})`,
      shortLabel: 'Net Total',
      amount: last.amount,
      startValue: 0,
      endValue: last.amount,
      isTotal: true,
      isPositive: true,
      changeFormatted: formatWaterfallAmount(last.amount, currencySymbol)
    });
  }

  return steps;
}

/**
 * Adaptively infer dimension label (Product, Vendor, Plant, Warehouse, Customer, Period, Category)
 * from entity labels and query text.
 */
export function inferDimensionFromLabels(labels: string[], query?: string): string {
  const cleanQ = (query || '').toLowerCase();

  // Check query first with plural awareness
  if (/\b(?:products?|items?|parts?|skus?|materials?)\b/i.test(cleanQ)) return 'Product';
  if (/\b(?:vendors?|suppliers?|contractors?|merchants?)\b/i.test(cleanQ)) return 'Vendor';
  if (/\b(?:warehouses?|whs?|depots?|storage)\b/i.test(cleanQ)) return 'Warehouse';
  if (/\b(?:plants?|factories|factory|facilities|facility|sites?)\b/i.test(cleanQ)) return 'Plant';
  if (/\b(?:customers?|clients?|accounts?|buyers?)\b/i.test(cleanQ)) return 'Customer';
  if (/\b(?:cost\s*cent(?:er|re)s?|departments?|divisions?)\b/i.test(cleanQ)) return 'Cost Centre';
  if (/\b(?:quarters?|quarterly|years?|yearly|months?|monthly|periods?)\b/i.test(cleanQ)) return 'Period';

  // Inspect sample labels
  const sample = labels.join(' ').toUpperCase();
  if (/\bPROD-|\bITEM-|\bSKU-/i.test(sample)) return 'Product';
  if (/\bVEND-|\bVEN-|\bSUPP-/i.test(sample)) return 'Vendor';
  if (/\bWH-|\bWAR-/i.test(sample)) return 'Warehouse';
  if (/\bPLANT-|\bFAC-/i.test(sample)) return 'Plant';
  if (/\bCUST-|\bCLIENT-/i.test(sample)) return 'Customer';
  if (/\bPO-/i.test(sample)) return 'Purchase Order';
  if (/\bINV-/i.test(sample)) return 'Invoice';
  if (/\b(?:INC|LTD|CORP|LLC|GMBH|CO|GROUP|SOLUTIONS|SUPPLIES|LOGISTICS)\b/i.test(sample)) return 'Vendor';

  return 'Entity';
}

/**
 * Calculates donut slices with SVG arc geometry.
 */
export function calculateDonutSlices(
  points: TrendDataPoint[],
  cx = 140,
  cy = 135,
  radius = 95,
  innerRadius = 55
): DonutSlice[] {
  if (!points || points.length === 0) return [];

  // Group top 6 + 'Others' if too many slices
  const total = points.reduce((s, p) => s + p.amount, 0);
  if (total <= 0) return [];

  const palette = [
    '#2563eb', '#3b82f6', '#0284c7', '#0d9488', '#10b981',
    '#f59e0b', '#f97316', '#8b5cf6', '#ec4899', '#64748b'
  ];

  let rawGroups: { label: string; shortLabel: string; amount: number }[] = [];
  if (points.length <= 8) {
    rawGroups = points.map(p => ({ label: p.month, shortLabel: p.shortMonth, amount: p.amount }));
  } else {
    const sorted = [...points].sort((a, b) => b.amount - a.amount);
    const top = sorted.slice(0, 7);
    const othersAmount = sorted.slice(7).reduce((s, p) => s + p.amount, 0);
    rawGroups = top.map(p => ({ label: p.month, shortLabel: p.shortMonth, amount: p.amount }));
    if (othersAmount > 0) {
      rawGroups.push({ label: 'Other Months', shortLabel: 'Others', amount: othersAmount });
    }
  }

  let currentAngle = -Math.PI / 2; // start from top (12 o clock)
  const slices: DonutSlice[] = [];

  rawGroups.forEach((g, i) => {
    const fraction = g.amount / total;
    const sliceAngle = fraction * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    // SVG donut arc calculation
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const x3 = cx + innerRadius * Math.cos(endAngle);
    const y3 = cy + innerRadius * Math.sin(endAngle);
    const x4 = cx + innerRadius * Math.cos(startAngle);
    const y4 = cy + innerRadius * Math.sin(startAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathD = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z'
    ].join(' ');

    slices.push({
      label: g.label,
      shortLabel: g.shortLabel,
      amount: g.amount,
      percentage: parseFloat((fraction * 100).toFixed(1)),
      color: palette[i % palette.length],
      startAngle,
      endAngle,
      pathD
    });
  });

  return slices;
}

/**
 * Analyzes the user query to detect if a specific chart type or date range was requested.
 */
export function analyzeUserQuery(query: string | undefined, points: TrendDataPoint[]): UserQueryAnalysis {
  if (!points || points.length === 0) {
    return { isAmbiguous: false, explicitRangeFound: false };
  }

  const cleanQuery = (query || '').trim().toLowerCase();

  // 1. Chart type detection
  let preferredChartType: ChartType | undefined;
  if (/\b(?:multi\s*line|both\s*lines?)\b/i.test(cleanQuery)) {
    preferredChartType = 'multi-line';
  } else if (/\b(?:grouped\s*bar|clustered\s*bar)\b/i.test(cleanQuery)) {
    preferredChartType = 'grouped-bar';
  } else if (/\b(?:stacked\s*bar|stacked\s*column)\b/i.test(cleanQuery)) {
    preferredChartType = 'stacked-bar';
  } else if (/\b(?:scatter\s*plot|scatter|correlation|relationship)\b/i.test(cleanQuery)) {
    preferredChartType = 'scatter';
  } else if (/\b(?:histogram|distribution|frequency\s*chart)\b/i.test(cleanQuery)) {
    preferredChartType = 'histogram';
  } else if (/\b(?:donut\s*chart|donut|pie\s*chart|pie)\b/i.test(cleanQuery)) {
    preferredChartType = 'donut';
  } else if (/\b(?:waterfall\s*chart|waterfall|variance\s*chart|bridge\s*chart)\b/i.test(cleanQuery)) {
    preferredChartType = 'waterfall';
  } else if (/\b(?:area\s*chart|as\s*(?:an\s*)?area|area\s*graph)\b/i.test(cleanQuery)) {
    preferredChartType = 'area';
  } else if (/\b(?:bar\s*chart|as\s*(?:a\s*)?bar|bar\s*graph|column\s*chart|compare\s*monthly)\b/i.test(cleanQuery)) {
    preferredChartType = 'bar';
  } else if (/\b(?:line\s*chart|as\s*(?:a\s*)?line|line\s*graph|trend\s*line)\b/i.test(cleanQuery)) {
    preferredChartType = 'line';
  } else if (/\b(?:growth|trend|trajectory|over\s*time)\b/i.test(cleanQuery)) {
    preferredChartType = 'line';
  }

  if (!cleanQuery) {
    return {
      isAmbiguous: points.length > 12,
      explicitRangeFound: false,
      preferredChartType
    };
  }

  // 2. Relative ranges
  // e.g. "latest 12 months", "last 12 months", "past 12 months", "past year", "last year"
  if (/\b(?:latest|last|past)\s*12\s*months?\b|\b(?:past|last)\s*year\b/i.test(cleanQuery)) {
    const fromIdx = Math.max(0, points.length - 12);
    return {
      isAmbiguous: false,
      explicitRangeFound: true,
      preferredChartType,
      matchedFromIndex: points[fromIdx].pointIndex,
      matchedToIndex: points[points.length - 1].pointIndex,
      description: 'Latest 12 months'
    };
  }

  // e.g. "latest 24 months", "last 24 months", "past 24 months", "past 2 years"
  if (/\b(?:latest|last|past)\s*24\s*months?\b|\b(?:past|last)\s*2\s*years?\b/i.test(cleanQuery)) {
    const fromIdx = Math.max(0, points.length - 24);
    return {
      isAmbiguous: false,
      explicitRangeFound: true,
      preferredChartType,
      matchedFromIndex: points[fromIdx].pointIndex,
      matchedToIndex: points[points.length - 1].pointIndex,
      description: 'Latest 24 months'
    };
  }

  // e.g. "all available data", "all data", "all time", "entire range", "full history"
  if (/\b(?:all\s*(?:available\s*)?data|all\s*time|entire\s*(?:range|data|dataset)|full\s*(?:trend|history|data))\b/i.test(cleanQuery)) {
    return {
      isAmbiguous: false,
      explicitRangeFound: true,
      preferredChartType,
      matchedFromIndex: points[0].pointIndex,
      matchedToIndex: points[points.length - 1].pointIndex,
      description: 'All available data'
    };
  }

  // 3. Month ranges: e.g. "from January 2025 to September 2026", "Jan 2025 to Sep 2026", "Sep 2025 - Sep 2026"
  const monthRangeMatch = cleanQuery.match(/(?:from\s+)?([a-z]{3,9}\.?\s*['']?\d{2,4})\s*(?:to|–|-|through|until)\s*([a-z]{3,9}\.?\s*['']?\d{2,4})/i);
  if (monthRangeMatch) {
    const d1 = parseDateInfo(monthRangeMatch[1]);
    const d2 = parseDateInfo(monthRangeMatch[2]);
    if (d1.sortKey > 0 && d2.sortKey > 0) {
      const minKey = Math.min(d1.sortKey, d2.sortKey);
      const maxKey = Math.max(d1.sortKey, d2.sortKey);
      const matchingPts = points.filter(p => p.sortKey >= minKey && p.sortKey <= maxKey);
      if (matchingPts.length > 0) {
        return {
          isAmbiguous: false,
          explicitRangeFound: true,
          preferredChartType,
          matchedFromIndex: matchingPts[0].pointIndex,
          matchedToIndex: matchingPts[matchingPts.length - 1].pointIndex,
          description: `${matchingPts[0].shortMonth} – ${matchingPts[matchingPts.length - 1].shortMonth}`
        };
      }
    }
  }

  // 4. Consecutive Year Ranges: e.g. "2024 to 2025", "2024-2025", "from 2023 to 2026"
  const yearRangeMatch = cleanQuery.match(/\b(20\d\d)\s*(?:to|–|-|through)\s*(20\d\d)\b/i);
  if (yearRangeMatch) {
    const y1 = parseInt(yearRangeMatch[1], 10);
    const y2 = parseInt(yearRangeMatch[2], 10);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const matchingPts = points.filter(p => p.year && p.year >= minY && p.year <= maxY);
    if (matchingPts.length > 0) {
      return {
        isAmbiguous: false,
        explicitRangeFound: true,
        preferredChartType,
        matchedFromIndex: matchingPts[0].pointIndex,
        matchedToIndex: matchingPts[matchingPts.length - 1].pointIndex,
        description: `${minY}–${maxY}`
      };
    }
  }

  // 5. Explicit Single Year: e.g. "for 2025", "in 2024", "2025 invoice trend"
  const singleYearMatch = cleanQuery.match(/\b(20\d\d)\b/);
  if (singleYearMatch) {
    const y = parseInt(singleYearMatch[1], 10);
    const matchingPts = points.filter(p => p.year === y);
    if (matchingPts.length > 0) {
      return {
        isAmbiguous: false,
        explicitRangeFound: true,
        preferredChartType,
        matchedFromIndex: matchingPts[0].pointIndex,
        matchedToIndex: matchingPts[matchingPts.length - 1].pointIndex,
        description: `${y}`
      };
    }
  }

  // No range was explicitly specified in the question:
  const hasChronology = points.some(p => p.sortKey > 0);
  const explicitRangeFound = false;
  return {
    isAmbiguous: hasChronology && points.length > 12 && !explicitRangeFound,
    explicitRangeFound,
    preferredChartType
  };
}

function generateMultiEntityTitle(userQuery?: string, entityNames?: string[], precedingHeading?: string): string {
  if (precedingHeading && entityNames && entityNames.every(e => precedingHeading.toLowerCase().includes(e.toLowerCase()))) {
    return precedingHeading;
  }
  const cleanQ = (userQuery || '').trim();
  const namesStr = entityNames && entityNames.length >= 2
    ? (entityNames.length === 2 ? `${entityNames[0]} vs ${entityNames[1]}` : entityNames.join(', '))
    : '';

  if (namesStr) {
    if (precedingHeading) {
      return `${precedingHeading} — ${namesStr}`;
    }
    if (cleanQ.toLowerCase().includes('revenue')) {
      return `Revenue Trend — ${namesStr}`;
    }
    if (cleanQ.toLowerCase().includes('spend') || cleanQ.toLowerCase().includes('expense')) {
      return `Spend Trend — ${namesStr}`;
    }
    if (cleanQ.toLowerCase().includes('cost')) {
      return `Cost Comparison — ${namesStr}`;
    }
    if (cleanQ.toLowerCase().includes('invoice')) {
      return `Invoice Trend — ${namesStr}`;
    }
    return `Comparison Analytics — ${namesStr}`;
  }

  return precedingHeading || 'Financial Analytics';
}

/**
 * Detect tabular or list-based trend data from assistant response text
 */
export function parseTrendData(content: string, userQuery?: string): TrendSeries | null {
  if (!content || typeof content !== 'string') return null;

  const tableResult = parseFromMarkdownTable(content, userQuery);
  if (tableResult && tableResult.points.length >= 2) return tableResult;

  const asciiResult = parseFromAsciiBars(content, userQuery);
  if (asciiResult && asciiResult.points.length >= 2) return asciiResult;

  const listResult = parseFromListOrArrows(content, userQuery);
  if (listResult && listResult.points.length >= 2) return listResult;

  const fallbackResult = parseFromAnyLine(content, userQuery);
  if (fallbackResult && fallbackResult.points.length >= 2) return fallbackResult;

  return null;
}

/**
 * Attempt to extract trend data from Markdown tables (supports single series, multi-entity pivoted, unpivoted, and multi-metric)
 */
function parseFromMarkdownTable(content: string, userQuery?: string): TrendSeries | null {
  const lines = content.split('\n');
  let inTable = false;
  let headerCols: string[] = [];
  const rawRows: string[][] = [];
  let precedingHeading = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#') || (line.startsWith('**') && line.endsWith('**') && (line.toLowerCase().includes('trend') || line.toLowerCase().includes('vs') || line.toLowerCase().includes('comparison')))) {
      precedingHeading = line.replace(/^[#* \t]+|[#* \t]+$/g, '');
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      const cols = line.slice(1, -1).split('|').map(c => c.trim());
      const isSeparator = cols.every(c => /^:?-+:?$/.test(c.replace(/\s+/g, '')));

      if (!inTable && !isSeparator) {
        if (cols.length >= 2) {
          inTable = true;
          headerCols = cols;
          continue;
        }
      } else if (inTable) {
        if (isSeparator) continue;
        if (cols.length >= 2) rawRows.push(cols);
      }
    } else if (inTable && rawRows.length > 0) {
      break;
    }
  }

  if (rawRows.length < 2 || headerCols.length < 2) return null;

  // 1. Identify Time / Dimension Column
  const dateCounts = headerCols.map((_, colIdx) =>
    rawRows.filter(r => r[colIdx] && (DATE_REGEX.test(r[colIdx].replace(/[*_`]/g, '').trim()) || /^[A-Za-z]{3,9}\s*['']?\d{2,4}/.test(r[colIdx].replace(/[*_`]/g, '').trim()))).length
  );
  let timeColIdx = dateCounts.findIndex(cnt => cnt >= Math.max(2, rawRows.length * 0.4));
  const hasDefiniteDates = timeColIdx !== -1;

  if (timeColIdx === -1) {
    timeColIdx = headerCols.findIndex(c => /month|date|period|time|year|quarter|week|day/i.test(c));
  }
  const hasTimeHeader = timeColIdx !== -1;

  // Check if column 0 is a serial number/rank (#, S.No, Rank, 1, 2, 3...)
  const isCol0Serial = /^(?:s\.?\s*no\.?|sl\.?\s*no\.?|#|rank|pos|row|idx|index|id)$/i.test(headerCols[0].trim()) ||
    (rawRows.length >= 2 && rawRows.every(r => /^\d{1,4}$/.test(r[0]?.replace(/[*_`]/g, '').trim() || '')));

  if (timeColIdx === -1) {
    // If column 0 is serial number (e.g. Rank 1, 2, 3...) and column 1 has labels, use column 1!
    timeColIdx = (isCol0Serial && headerCols.length >= 3) ? 1 : 0;
  }

  const nonTimeCols = headerCols.map((_, i) => i).filter(i => i !== timeColIdx && (!isCol0Serial || i !== 0));

  // 2. Check for Unpivoted Multi-Entity Table (e.g. Month | Product | Amount)
  // CRITICAL: Unpivoted multi-entity requires an ACTUAL temporal dimension!
  const hasValidTimeDimension = hasDefiniteDates || hasTimeHeader;
  const entityColIdx = hasValidTimeDimension ? nonTimeCols.find(c =>
    /entity|product|dimension|category|segment|customer|vendor|region|department|service/i.test(headerCols[c]) &&
    rawRows.some(r => r[c] && isNaN(Number(r[c].replace(/[$,₹€£¥ ]/g, ''))))
  ) : undefined;

  let detectedCurrency = '$';

  if (entityColIdx !== undefined) {
    const amountColIdx = nonTimeCols.find(c => c !== entityColIdx && rawRows.some(r => parseNumericAmount(r[c]) !== null)) ?? nonTimeCols[0];
    const countColIdx = nonTimeCols.find(c => c !== entityColIdx && c !== amountColIdx && /count|invoices|no\.|qty/i.test(headerCols[c]));

    const distinctEntities = Array.from(new Set(rawRows.map(r => r[entityColIdx]?.replace(/[*_`]/g, '').trim()).filter(Boolean)));
    if (distinctEntities.length >= 2) {
      // Unpivoted Multi-Entity
      const timeMap = new Map<string, { dateInfo: ParsedDateInfo; entityMap: Map<string, { amount: number; rawAmount: string; count?: number }> }>();

      for (const row of rawRows) {
        const timeCell = row[timeColIdx]?.replace(/[*_`]/g, '').trim() || '';
        const entCell = row[entityColIdx]?.replace(/[*_`]/g, '').trim() || '';
        const amtCell = row[amountColIdx] || '';
        const numAmt = parseNumericAmount(amtCell);
        if (!timeCell || !entCell || numAmt === null) continue;

        const curr = extractCurrencySymbol(amtCell);
        if (curr) detectedCurrency = curr;

        const dateInfo = parseDateInfo(timeCell);
        const key = dateInfo.sortKey > 0 ? String(dateInfo.sortKey) : dateInfo.displayMonth;

        if (!timeMap.has(key)) {
          timeMap.set(key, { dateInfo, entityMap: new Map() });
        }
        let cntNum: number | undefined;
        if (countColIdx !== undefined && row[countColIdx]) {
          cntNum = parseNumericAmount(row[countColIdx]) ?? undefined;
        }
        timeMap.get(key)!.entityMap.set(entCell, { amount: numAmt, rawAmount: amtCell.trim(), count: cntNum });
      }

      const sortedKeys = Array.from(timeMap.keys()).sort((a, b) => {
        const da = timeMap.get(a)!.dateInfo;
        const db = timeMap.get(b)!.dateInfo;
        return (da.sortKey || 0) - (db.sortKey || 0);
      });

      const points: TrendDataPoint[] = [];
      sortedKeys.forEach((k, idx) => {
        const entry = timeMap.get(k)!;
        const eMap = entry.entityMap;
        const entityValues: { [ent: string]: { amount: number; rawAmount: string; count?: number; isMissing?: boolean } } = {};
        let totalPeriodAmt = 0;

        distinctEntities.forEach(ent => {
          if (eMap.has(ent)) {
            const v = eMap.get(ent)!;
            entityValues[ent] = { amount: v.amount, rawAmount: v.rawAmount, count: v.count, isMissing: false };
            totalPeriodAmt += v.amount;
          } else {
            // Missing record: do not fabricate 0!
            entityValues[ent] = { amount: 0, rawAmount: 'No record', isMissing: true };
          }
        });

        points.push({
          month: entry.dateInfo.displayMonth,
          shortMonth: entry.dateInfo.shortMonth,
          rawAmount: `${detectedCurrency}${totalPeriodAmt.toLocaleString()}`,
          amount: totalPeriodAmt,
          currencySymbol: detectedCurrency,
          year: entry.dateInfo.year,
          monthIndex: entry.dateInfo.monthIndex,
          sortKey: entry.dateInfo.sortKey,
          pointIndex: idx,
          entityValues
        });
      });

      if (points.length >= 2) {
        const seriesList: DataSeries[] = distinctEntities.map((name, i) => ({
          id: `entity-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name,
          color: EXECUTIVE_PALETTE[i % EXECUTIVE_PALETTE.length],
          points: points.filter(p => !p.entityValues?.[name]?.isMissing).map(p => ({
            ...p,
            amount: p.entityValues![name].amount,
            rawAmount: p.entityValues![name].rawAmount
          }))
        }));

        const title = generateMultiEntityTitle(userQuery, distinctEntities, precedingHeading);
        const detectedGranularity = sortedKeys.length > 0 ? timeMap.get(sortedKeys[0])?.dateInfo.granularity : undefined;
        return buildTrendSeries(title, points, detectedCurrency, {
          seriesList,
          isMultiEntity: true,
          entityNames: distinctEntities,
          granularity: detectedGranularity || (points[0]?.sortKey ? 'monthly' : undefined),
          categoryType: points.some(p => p.sortKey > 0) ? 'time' : 'category'
        });
      }
    }
  }

  // 3. Check for Pivoted Multi-Series Table (e.g. Month | Product 1 | Product 2 | Product 3)
  const numericCols = (hasValidTimeDimension ? nonTimeCols : []).filter(c => {
    const colName = headerCols[c];
    const isAmountCol = /amount|spend|cost|revenue|value|total|price|sales|balance|sum/i.test(colName);
    if (!isAmountCol && /count|no\.|qty|quantity|percentage|percent|%|rate|ratio|score|margin|variance|days|sl\.?\s*no|rank/i.test(colName)) return false;
    if (rawRows.some(r => r[c]?.includes('%'))) return false;
    const validNums = rawRows.filter(r => parseNumericAmount(r[c]) !== null).length;
    return validNums >= Math.max(2, rawRows.length * 0.4);
  });

  if (numericCols.length >= 2) {
    // Pivoted Multi-Series!
    const entityNames = numericCols.map(c => headerCols[c].replace(/[*_`]/g, '').trim());
    const points: TrendDataPoint[] = [];
    let detectedGranularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | undefined;

    for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
      const row = rawRows[rIdx];
      const timeCell = row[timeColIdx]?.replace(/[*_`]/g, '').trim() || '';
      if (!timeCell) continue;

      const dateInfo = parseDateInfo(timeCell);
      if (!detectedGranularity && dateInfo.granularity) detectedGranularity = dateInfo.granularity;
      const entityValues: { [ent: string]: { amount: number; rawAmount: string; count?: number; isMissing?: boolean } } = {};
      let totalAmt = 0;
      let hasAnyVal = false;

      numericCols.forEach((colIdx, i) => {
        const name = entityNames[i];
        const cell = row[colIdx]?.trim();
        const num = parseNumericAmount(cell);

        if (cell && num !== null) {
          const curr = extractCurrencySymbol(cell);
          if (curr) detectedCurrency = curr;
          entityValues[name] = { amount: num, rawAmount: cell, isMissing: false };
          totalAmt += num;
          hasAnyVal = true;
        } else {
          // Missing record: do not fabricate zero!
          entityValues[name] = { amount: 0, rawAmount: 'No record', isMissing: true };
        }
      });

      if (!hasAnyVal) continue;

      points.push({
        month: dateInfo.displayMonth,
        shortMonth: dateInfo.shortMonth,
        rawAmount: `${detectedCurrency}${totalAmt.toLocaleString()}`,
        amount: totalAmt,
        currencySymbol: detectedCurrency,
        year: dateInfo.year,
        monthIndex: dateInfo.monthIndex,
        sortKey: dateInfo.sortKey,
        pointIndex: rIdx,
        entityValues
      });
    }

    if (points.length >= 2) {
      const seriesList: DataSeries[] = entityNames.map((name, i) => ({
        id: `entity-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        color: EXECUTIVE_PALETTE[i % EXECUTIVE_PALETTE.length],
        points: points.filter(p => !p.entityValues?.[name]?.isMissing).map(p => ({
          ...p,
          amount: p.entityValues![name].amount,
          rawAmount: p.entityValues![name].rawAmount
        }))
      }));

      const title = generateMultiEntityTitle(userQuery, entityNames, precedingHeading);
      return buildTrendSeries(title, points, detectedCurrency, {
        seriesList,
        isMultiEntity: true,
        entityNames,
        granularity: detectedGranularity || (points[0]?.sortKey ? 'monthly' : undefined),
        categoryType: points.some(p => p.sortKey > 0) ? 'time' : 'category'
      });
    }
  }

  // 4. Standard Single-Series Table
  const monthColIdx = timeColIdx;
  let amountColIdx = nonTimeCols.find(c => /amount|total|spend|revenue|cost|sales|value|price|variance|balance/i.test(headerCols[c])) ?? nonTimeCols[0];
  const countColIdx = nonTimeCols.find(c => c !== amountColIdx && /count|invoices|no\.|number|qty|quantity|orders/i.test(headerCols[c]));

  const dimensionLabel = headerCols[monthColIdx]?.replace(/[*_`]/g, '').trim() || 'Item';
  const metricLabel = headerCols[amountColIdx]?.replace(/[*_`]/g, '').trim() || 'Amount';
  const secondaryMetricLabel = countColIdx !== undefined ? headerCols[countColIdx]?.replace(/[*_`]/g, '').trim() : undefined;

  const points: TrendDataPoint[] = [];
  let detectedGranularity: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | undefined;

  for (const row of rawRows) {
    const monthCell = (monthColIdx >= 0 && monthColIdx < row.length) ? row[monthColIdx] : row[0];
    const amountCell = (amountColIdx >= 0 && amountColIdx < row.length) ? row[amountColIdx] : row[1];
    const countCell = (countColIdx !== undefined && countColIdx < row.length) ? row[countColIdx] : undefined;

    const monthClean = monthCell.replace(/[*_`]/g, '').trim();
    const numAmount = parseNumericAmount(amountCell);
    if (numAmount === null) continue;

    const curr = extractCurrencySymbol(amountCell);
    if (curr) detectedCurrency = curr;

    let invoiceCountStr: string | undefined = undefined;
    let invoiceCountNum: number | undefined = undefined;
    if (countCell) {
      invoiceCountStr = countCell.replace(/[*_`]/g, '').trim();
      const parsedNum = parseNumericAmount(invoiceCountStr);
      if (parsedNum !== null) invoiceCountNum = parsedNum;
    }

    const dateInfo = parseDateInfo(monthClean);
    if (!detectedGranularity && dateInfo.granularity) detectedGranularity = dateInfo.granularity;

    const finalSortKey = dateInfo.sortKey > 0 ? dateInfo.sortKey * 1000 + points.length : (points.length + 1);

    points.push({
      month: dateInfo.displayMonth,
      shortMonth: dateInfo.shortMonth,
      rawAmount: amountCell.replace(/[*_`]/g, '').trim(),
      amount: numAmount,
      currencySymbol: curr || detectedCurrency,
      invoiceCount: invoiceCountStr,
      invoiceCountNum: invoiceCountNum,
      year: dateInfo.year,
      monthIndex: dateInfo.monthIndex,
      sortKey: finalSortKey,
      pointIndex: points.length
    });
  }

  if (points.length < 2) return null;

  const hasChronology = points.some(p => p.sortKey > 0);
  const categoryType = hasChronology ? 'time' : 'category';
  let defaultTitle = precedingHeading;
  if (!defaultTitle && userQuery) {
    defaultTitle = userQuery.replace(/^[#* \t]+|[#* \t:?]+$/g, '').trim();
  }
  if (!defaultTitle) {
    defaultTitle = hasChronology ? `${metricLabel} Trend` : `${metricLabel} by ${dimensionLabel}`;
  }

  return buildTrendSeries(defaultTitle, points, detectedCurrency, {
    granularity: detectedGranularity || (hasChronology ? 'monthly' : undefined),
    categoryType,
    metricLabel,
    secondaryMetricLabel,
    dimensionLabel
  });
}

/**
 * Attempt to extract trend or comparison metrics from ASCII bar blocks
 * (e.g. VEND-0022  ████████████████████  81.56%  ✓ Best)
 */
function parseFromAsciiBars(content: string, userQuery?: string): TrendSeries | null {
  if (!content) return null;

  interface SectionFound {
    title: string;
    points: TrendDataPoint[];
    isPercentage: boolean;
    currency: string;
    unit?: string;
  }

  const sections: SectionFound[] = [];

  // 1. Check for HTML rows (e.g. from previously cached assistant responses)
  const htmlRowRegex = /<div class=["']perf-3d-row["']>[\s\S]*?<span class=["']perf-3d-label["']>([^<]+)<\/span>[\s\S]*?<span class=["']perf-3d-val["']>([^<]+)<\/span>/g;
  const htmlPoints: TrendDataPoint[] = [];
  let hm: RegExpExecArray | null;
  let htmlIsPercentage = false;
  let htmlCurrency = '$';

  while ((hm = htmlRowRegex.exec(content)) !== null) {
    const label = hm[1].trim();
    const rawVal = hm[2].trim();
    const num = parseNumericAmount(rawVal);
    if (num !== null) {
      if (rawVal.includes('%')) htmlIsPercentage = true;
      const curr = extractCurrencySymbol(rawVal);
      if (curr) htmlCurrency = curr;

      htmlPoints.push({
        month: label,
        shortMonth: label.length > 14 ? label.slice(0, 12) + '…' : label,
        rawAmount: rawVal,
        amount: num,
        currencySymbol: htmlIsPercentage ? '%' : htmlCurrency,
        sortKey: htmlPoints.length + 1,
        pointIndex: htmlPoints.length
      });
    }
  }

  if (htmlPoints.length >= 2) {
    sections.push({
      title: 'GRN Acceptance Rate (Higher is Better)',
      points: htmlPoints,
      isPercentage: htmlIsPercentage,
      currency: htmlIsPercentage ? '%' : htmlCurrency
    });
  }

  // 2. Parse ASCII lines across the content
  const lines = content.split('\n');
  const asciiLineRegex = /^[\s*#-]*([A-Za-z0-9_\-./\s]{2,30}?)\s+([█░▓▒■❚|=#-]{2,})\s+([-+]?[$₹€£¥]?[0-9,.]+%?)(?:\s+(.*))?$/;

  let currentTitle = '';
  let currentPoints: TrendDataPoint[] = [];
  let currentIsPercent = false;
  let currentCurrency = '$';
  let currentUnit = '';

  const finalizeSection = () => {
    if (currentPoints.length >= 2) {
      sections.push({
        title: currentTitle || 'Comparative Analytics',
        points: [...currentPoints],
        isPercentage: currentIsPercent,
        currency: currentIsPercent ? '%' : currentCurrency,
        unit: currentUnit
      });
    }
    currentPoints = [];
    currentIsPercent = false;
    currentCurrency = '$';
    currentUnit = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const isHeading = (
      (rawLine.includes('(') && (rawLine.includes('Rate') || rawLine.includes('Better') || rawLine.includes('Score') || rawLine.includes('Variance') || rawLine.includes('Spend') || rawLine.includes('MISMATCH') || rawLine.includes('DENSITY'))) ||
      (rawLine.toUpperCase() === rawLine && rawLine.length > 5 && !rawLine.includes('|') && !rawLine.includes('█') && !rawLine.includes('░') && (rawLine.includes('MISMATCH') || rawLine.includes('DENSITY') || rawLine.includes('VARIANCE') || rawLine.includes('ACCEPTANCE') || rawLine.includes('RATE')))
    );

    if (isHeading) {
      finalizeSection();
      currentTitle = rawLine.replace(/^[#* \t]+|[#* \t:]+$/g, '');
      continue;
    }

    const match = rawLine.match(asciiLineRegex);
    if (match) {
      const label = match[1].trim();
      const valStr = match[3].trim();
      const numVal = parseNumericAmount(valStr);
      if (numVal !== null) {
        if (valStr.includes('%')) currentIsPercent = true;
        const curr = extractCurrencySymbol(valStr);
        if (curr) currentCurrency = curr;

        const extra = (match[4] || '').trim();
        if (extra && !extra.includes('Best') && !extra.includes('Worst') && !extra.includes('Lowest')) {
          currentUnit = extra.replace(/[✓⚠]/g, '').trim();
        }

        currentPoints.push({
          month: label,
          shortMonth: label.length > 14 ? label.slice(0, 12) + '…' : label,
          rawAmount: extra ? `${valStr} ${extra}` : valStr,
          amount: numVal,
          currencySymbol: curr || (currentIsPercent ? '%' : currentCurrency),
          sortKey: currentPoints.length + 1,
          pointIndex: currentPoints.length
        });
      }
    } else if (currentPoints.length >= 2 && !rawLine.startsWith('-') && !rawLine.startsWith('=') && !rawLine.includes('perf-3d')) {
      finalizeSection();
    }
  }
  finalizeSection();

  if (sections.length === 0) return null;

  const primary = sections[0];
  const title = primary.title || (userQuery ? userQuery.replace(/^[#* \t]+|[#* \t:?]+$/g, '').trim() : 'Comparative Analytics');

  const seriesList: DataSeries[] | undefined = sections.length > 1 ? sections.map((sec, idx) => ({
    id: `series_${idx}`,
    name: sec.title.replace(/\s*\(.*?\)\s*/g, '').trim() || `Metric ${idx + 1}`,
    color: EXECUTIVE_PALETTE[idx % EXECUTIVE_PALETTE.length],
    points: sec.points,
    unit: sec.unit || (sec.isPercentage ? '%' : sec.currency),
    unitType: sec.isPercentage ? 'percent' : (sec.unit ? 'number' : 'currency')
  })) : undefined;

  return buildTrendSeries(title, primary.points, primary.currency, {
    categoryType: 'category',
    dimensionLabel: inferDimensionFromLabels(primary.points.map(p => p.month), userQuery),
    metricLabel: primary.isPercentage ? 'Rate (%)' : (primary.unit || 'Amount'),
    seriesList,
    isMultiEntity: false
  });
}

/**
 * Attempt to extract trend data from arrow, bullet, or colon lines.
 */
function parseFromListOrArrows(content: string, userQuery?: string): TrendSeries | null {
  const lines = content.split('\n');
  const points: TrendDataPoint[] = [];
  let detectedCurrency = '$';
  let precedingHeading = '';

  const linePattern = /(?:[-*•\d.]+\s*)?([A-Za-z0-9\-/.']{3,15}(?:\s*(?:20\d\d|19\d\d|'\d\d))?)(?:\s*[→\->:=–|]\s*|\s+is\s+|\s+)([$₹€£¥A-Z]{0,3}\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cleanedLine = rawLine.replace(/\*\*?|__?/g, '').trim();

    if ((cleanedLine.startsWith('#') || lineHasTrend(cleanedLine)) && !DATE_REGEX.test(cleanedLine)) {
      const clean = cleanedLine.replace(/^[#* \t]+|[#* \t:]+$/g, '');
      if (!precedingHeading || (clean.length < precedingHeading.length && clean.toLowerCase().includes('trend'))) {
        precedingHeading = clean;
      }
    }

    const match = cleanedLine.match(linePattern);
    if (match) {
      const monthStr = match[1].trim();
      const amountStr = match[2].trim();
      const trailingStr = match[3] ? match[3].trim() : '';

      if (!DATE_REGEX.test(monthStr) && !/^[A-Za-z]{3,9}\s*\d{2,4}/.test(monthStr)) continue;

      const numAmount = parseNumericAmount(amountStr);
      if (numAmount === null || numAmount < 10) continue;

      const curr = extractCurrencySymbol(amountStr);
      if (curr) detectedCurrency = curr;

      let countStr: string | undefined = undefined;
      let countNum: number | undefined = undefined;
      const countMatch = trailingStr.match(/(?:count|invoices?)[:\s]*([0-9,]+)/i) ||
                         trailingStr.match(/\(?([0-9,]+)\s*invoices?\)?/i);
      if (countMatch) {
        countStr = countMatch[1].trim();
        const parsedCount = parseNumericAmount(countStr);
        if (parsedCount !== null) countNum = parsedCount;
      }

      const dateInfo = parseDateInfo(monthStr);
      const finalSortKey = dateInfo.sortKey > 0 ? dateInfo.sortKey * 1000 + points.length : (points.length + 1);

      points.push({
        month: dateInfo.displayMonth,
        shortMonth: dateInfo.shortMonth,
        rawAmount: amountStr,
        amount: numAmount,
        currencySymbol: curr,
        invoiceCount: countStr ? `${countStr} invoices` : undefined,
        invoiceCountNum: countNum,
        year: dateInfo.year,
        monthIndex: dateInfo.monthIndex,
        sortKey: finalSortKey,
        pointIndex: points.length
      });
    }
  }

  if (points.length < 2) return null;
  return buildTrendSeries(precedingHeading || 'Financial Trend', points, detectedCurrency);
}

function lineHasTrend(line: string): boolean {
  return line.toLowerCase().includes('trend') || line.toLowerCase().includes('monthly');
}

/**
 * Fallback: scan every line for co-occurrence of a month name + a number
 */
function parseFromAnyLine(content: string, userQuery?: string): TrendSeries | null {
  const lines = content.split('\n');
  const points: TrendDataPoint[] = [];
  let detectedCurrency = '$';
  let precedingHeading = '';

  const monthCapture = new RegExp(
    `((?:${MONTH_NAMES.join('|')}|${MONTH_ABBRS.join('|')})\\s*(?:20\\d\\d|19\\d\\d)?|(?:20\\d\\d)[-/.](?:0?[1-9]|1[0-2]))`,
    'i'
  );
  const amountCapture = /([\$₹€£¥]?\s*[1-9][0-9]{1,}(?:,[0-9]{3})*(?:\.[0-9]+)?)/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\*\*?|__?|`/g, '').trim();
    if (!line) continue;

    if ((line.startsWith('#') || lineHasTrend(line)) && !DATE_REGEX.test(line)) {
      const clean = line.replace(/^[#* \t]+|[#* \t:]+$/g, '');
      if (!precedingHeading || (clean.length < precedingHeading.length && clean.toLowerCase().includes('trend'))) {
        precedingHeading = clean;
      }
      continue;
    }

    const mMonth = line.match(monthCapture);
    const mAmount = line.match(amountCapture);
    if (!mMonth || !mAmount) continue;

    const monthStr = mMonth[1].trim();
    if (!DATE_REGEX.test(monthStr)) continue;

    const amountStr = mAmount[1].trim();
    const numAmount = parseNumericAmount(amountStr);
    if (numAmount === null || numAmount < 10) continue;

    const curr = extractCurrencySymbol(amountStr);
    if (curr) detectedCurrency = curr;

    const dateInfo = parseDateInfo(monthStr);
    const finalSortKey = dateInfo.sortKey > 0 ? dateInfo.sortKey * 1000 + points.length : (points.length + 1);

    points.push({
      month: dateInfo.displayMonth,
      shortMonth: dateInfo.shortMonth,
      rawAmount: amountStr,
      amount: numAmount,
      currencySymbol: curr,
      year: dateInfo.year,
      monthIndex: dateInfo.monthIndex,
      sortKey: finalSortKey,
      pointIndex: points.length
    });
  }

  if (points.length < 2) return null;
  return buildTrendSeries(precedingHeading || 'Financial Trend', points, detectedCurrency);
}

/**
 * Aggregate daily or multi-record points into Month + Year periods (e.g. "April 2023", "May 2023" ... "September 2026").
 * Preserves separate years (April 2023 vs April 2024 remain distinct).
 */
export function aggregatePointsToMonthly(pts: TrendDataPoint[], currencySymbol: string): TrendDataPoint[] {
  if (!pts || pts.length === 0) return [];

  const monthMap = new Map<string, {
    year: number;
    monthIndex: number;
    amountSum: number;
    points: TrendDataPoint[];
    entityValuesSum: { [ent: string]: { amount: number; rawAmount: string; count?: number; isMissing?: boolean } };
  }>();

  for (const pt of pts) {
    let year = pt.year;
    let monthIdx = pt.monthIndex;

    if (year === undefined || monthIdx === undefined) {
      if (pt.sortKey > 0) {
        const sStr = String(pt.sortKey);
        if (sStr.length >= 6) {
          year = parseInt(sStr.slice(0, 4), 10);
          monthIdx = parseInt(sStr.slice(4, 6), 10) - 1;
        }
      }
    }

    if (year === undefined || monthIdx === undefined || year < 1990 || year > 2099 || monthIdx < 0 || monthIdx > 11) {
      return pts;
    }

    const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        year,
        monthIndex: monthIdx,
        amountSum: 0,
        points: [],
        entityValuesSum: {}
      });
    }

    const entry = monthMap.get(key)!;
    entry.amountSum += pt.amount;
    entry.points.push(pt);

    if (pt.entityValues) {
      Object.keys(pt.entityValues).forEach(ent => {
        const ev = pt.entityValues![ent];
        if (!entry.entityValuesSum[ent]) {
          entry.entityValuesSum[ent] = { amount: 0, rawAmount: '', isMissing: false };
        }
        if (!ev.isMissing) {
          entry.entityValuesSum[ent].amount += ev.amount;
        }
      });
    }
  }

  const sortedKeys = Array.from(monthMap.keys()).sort();
  const aggregated: TrendDataPoint[] = [];

  sortedKeys.forEach((key, idx) => {
    const entry = monthMap.get(key)!;
    const fullM = MONTH_NAMES[entry.monthIndex];
    const shortM = MONTH_ABBRS[entry.monthIndex];
    const displayMonth = `${fullM} ${entry.year}`;
    const shortMonth = `${shortM} '${String(entry.year).slice(2)}`;
    const sortKey = entry.year * 100 + (entry.monthIndex + 1);

    const entityValues: { [ent: string]: { amount: number; rawAmount: string; count?: number; isMissing?: boolean } } = {};
    Object.keys(entry.entityValuesSum).forEach(ent => {
      const amt = entry.entityValuesSum[ent].amount;
      entityValues[ent] = {
        amount: amt,
        rawAmount: `${currencySymbol}${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        isMissing: false
      };
    });

    aggregated.push({
      month: displayMonth,
      shortMonth: shortMonth,
      rawAmount: `${currencySymbol}${entry.amountSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      amount: entry.amountSum,
      currencySymbol,
      year: entry.year,
      monthIndex: entry.monthIndex,
      sortKey,
      pointIndex: idx,
      entityValues: Object.keys(entityValues).length > 0 ? entityValues : undefined,
      granularity: 'monthly'
    });
  });

  return aggregated;
}

/**
 * Assemble final TrendSeries with min, max, totals and scaling helpers
 */
function buildTrendSeries(
  title: string,
  rawPoints: TrendDataPoint[],
  currencySymbol: string,
  options?: {
    seriesList?: DataSeries[];
    isMultiEntity?: boolean;
    isMultiMetric?: boolean;
    entityNames?: string[];
    granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    categoryType?: 'time' | 'category';
    metricLabel?: string;
    secondaryMetricLabel?: string;
    dimensionLabel?: string;
  }
): TrendSeries {
  const hasValidDates = rawPoints.some(p => p.sortKey > 0);
  const isCategory = options?.categoryType === 'category' || !hasValidDates;

  let effectivePoints = rawPoints;
  if (!isCategory && hasValidDates) {
    const hasDailyOrMulti = rawPoints.some(p => p.granularity === 'daily') || rawPoints.length > 30;
    if (hasDailyOrMulti) {
      effectivePoints = aggregatePointsToMonthly(rawPoints, currencySymbol);
    }
  }

  const points = isCategory
    ? [...effectivePoints]
    : [...effectivePoints].sort((a, b) => a.sortKey - b.sortKey);

  points.forEach((p, idx) => {
    p.pointIndex = idx;
    if (options?.metricLabel) p.metricLabel = options.metricLabel;
    if (options?.secondaryMetricLabel) p.secondaryMetricLabel = options.secondaryMetricLabel;
  });

  let effectiveSeriesList = options?.seriesList;
  if (effectiveSeriesList && effectiveSeriesList.length >= 2 && !isCategory) {
    effectiveSeriesList = effectiveSeriesList.map((s) => {
      const aggPts = aggregatePointsToMonthly(s.points, currencySymbol);
      aggPts.forEach((p, pIdx) => p.pointIndex = pIdx);
      return {
        ...s,
        points: aggPts
      };
    });
  }

  let max = points[0]?.amount || 0;
  let min = points[0]?.amount || 0;
  let sum = 0;
  let peakPoint = points[0];
  let lowestPoint = points[0];
  let hasCount = false;

  for (const pt of points) {
    if (pt.amount > max) {
      max = pt.amount;
      peakPoint = pt;
    }
    if (pt.amount < min) {
      min = pt.amount;
      lowestPoint = pt;
    }
    sum += pt.amount;
    if (pt.invoiceCount) hasCount = true;
  }

  for (const pt of points) {
    pt.percentOfMax = max > 0 ? (pt.amount / max) * 100 : 0;
  }

  const formattedSum = `${currencySymbol}${sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const periodOptions = isCategory ? [] : generatePeriodOptions(points);
  const defaultPeriodId = periodOptions.length > 0 ? periodOptions[0].id : '';

  return {
    title: title || 'Financial Analytics',
    points,
    currencySymbol: currencySymbol || '$',
    maxAmount: max,
    minAmount: min,
    totalAmount: sum,
    totalAmountFormatted: formattedSum,
    peakPoint,
    lowestPoint,
    hasInvoiceCount: hasCount,
    periodOptions,
    defaultPeriodId,
    seriesList: effectiveSeriesList,
    isMultiEntity: options?.isMultiEntity,
    isMultiMetric: options?.isMultiMetric,
    entityNames: options?.entityNames,
    granularity: isCategory ? options?.granularity : 'monthly',
    categoryType: isCategory ? 'category' : 'time',
    metricLabel: options?.metricLabel,
    secondaryMetricLabel: options?.secondaryMetricLabel,
    dimensionLabel: options?.dimensionLabel
  };
}
