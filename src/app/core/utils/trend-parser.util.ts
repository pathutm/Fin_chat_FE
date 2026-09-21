export interface TrendDataPoint {
  month: string;              // e.g. "January 2026" or "March 2023"
  shortMonth: string;         // e.g. "Jan '26" or "Mar '23"
  rawAmount: string;          // e.g. "$31,073,919.57" (exact string preserved from response)
  amount: number;             // numeric for chart plotting e.g. 31073919.57
  currencySymbol: string;     // e.g. "$" or "₹" or "€"
  invoiceCount?: string;      // e.g. "1,245" or "1,245 invoices"
  invoiceCountNum?: number;   // numeric if available
  percentOfMax?: number;      // 0 to 100 relative to peak
  year?: number;              // e.g. 2023, 2026
  monthIndex?: number;        // 0-11
  sortKey: number;            // e.g. 202303 for chronological ordering. Always assigned (1-indexed by position if year unknown)
  pointIndex: number;         // original index in parsed order — always stable and unique
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
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBRS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_REGEX = new RegExp(
  `\\b(?:(?:${MONTH_NAMES.join('|')}|${MONTH_ABBRS.join('|')})\\s*['']?(?:20\\d\\d|19\\d\\d|\\d\\d)?|(?:20\\d\\d|19\\d\\d)[-/.](?:0?[1-9]|1[0-2])|(?:0?[1-9]|1[0-2])[-/.](?:20\\d\\d|19\\d\\d)|(?:20\\d\\d)(?:0[1-9]|1[0-2])|Q[1-4]\\s*(?:20\\d\\d|\\d\\d)?)\\b`,
  'i'
);

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
function extractCurrencySymbol(raw: string): string {
  if (!raw) return '$';
  if (raw.includes('$')) return '$';
  if (raw.includes('₹') || /\bINR\b/i.test(raw)) return '₹';
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
  /** Numeric sort key: YYYYMM when year is known, or 0 when unknown */
  sortKey: number;
}

/**
 * Parse date label into structured year, month index, and clean display labels.
 * Returns sortKey=0 when year cannot be extracted.
 */
export function parseDateInfo(label: string, fallbackYear?: number): ParsedDateInfo {
  const clean = label.replace(/[*_`]/g, '').trim();

  // 1. Match YYYY-MM, YYYY/MM, YYYY.MM, YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/.](0?[1-9]|1[0-2])(?:[-/.]\d{1,2})?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const mNum = parseInt(isoMatch[2], 10);
    const mIdx = mNum - 1;
    const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
    const fullM = MONTH_NAMES[mIdx];
    return {
      year, monthIndex: mIdx,
      displayMonth: `${fullM} ${year}`,
      shortMonth: `${shortM} '${String(year).slice(2)}`,
      sortKey: year * 100 + mNum
    };
  }

  // 2. Match 6-digit numeric YYYYMM e.g. "202303"
  const yyyymmMatch = clean.match(/^(\d{4})(0[1-9]|1[0-2])$/);
  if (yyyymmMatch) {
    const year = parseInt(yyyymmMatch[1], 10);
    const mNum = parseInt(yyyymmMatch[2], 10);
    const mIdx = mNum - 1;
    const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
    const fullM = MONTH_NAMES[mIdx];
    return {
      year, monthIndex: mIdx,
      displayMonth: `${fullM} ${year}`,
      shortMonth: `${shortM} '${String(year).slice(2)}`,
      sortKey: year * 100 + mNum
    };
  }

  // 3. Match MM-YYYY or MM/YYYY
  const mmyyyyMatch = clean.match(/^(0?[1-9]|1[0-2])[-/.](\d{4})$/);
  if (mmyyyyMatch) {
    const mNum = parseInt(mmyyyyMatch[1], 10);
    const year = parseInt(mmyyyyMatch[2], 10);
    const mIdx = mNum - 1;
    const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
    const fullM = MONTH_NAMES[mIdx];
    return {
      year, monthIndex: mIdx,
      displayMonth: `${fullM} ${year}`,
      shortMonth: `${shortM} '${String(year).slice(2)}`,
      sortKey: year * 100 + mNum
    };
  }

  // 4. Match Year first: "YYYY Month" e.g. "2025 January", "2025-Jan", "2025/Sep"
  const yearFirstMatch = clean.match(
    new RegExp(`^(\\d{4})\\s*[-/.,]?\\s*(${MONTH_NAMES.join('|')}|${MONTH_ABBRS.join('|')})`, 'i')
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
        sortKey: year * 100 + (mIdx + 1)
      };
    }
  }

  // 5. Match Month first: "Month Year" e.g. "January 2026", "Jan '26", "Jan-2026", "Sep, 2026"
  const monthFirstMatch = clean.match(
    new RegExp(`^(${MONTH_NAMES.join('|')}|${MONTH_ABBRS.join('|')})[.]?\\s*[-/.,'’]?\\s*(\\d{2,4})?`, 'i')
  );
  if (monthFirstMatch) {
    const namePart = monthFirstMatch[1].toLowerCase();
    let mIdx = MONTH_NAMES.findIndex(n => n.toLowerCase().startsWith(namePart.slice(0, 3)));
    if (mIdx === -1) {
      mIdx = MONTH_ABBRS.findIndex(a => a.toLowerCase().startsWith(namePart.slice(0, 3)));
    }

    let year: number | undefined = undefined;
    if (monthFirstMatch[2]) {
      const yStr = monthFirstMatch[2];
      year = yStr.length === 2 ? 2000 + parseInt(yStr, 10) : parseInt(yStr, 10);
      if (year < 1990 || year > 2099) year = undefined;
    }
    if (year === undefined && fallbackYear && fallbackYear >= 1990 && fallbackYear <= 2099) {
      year = fallbackYear;
    }

    if (mIdx >= 0) {
      const shortM = MONTH_ABBRS[mIdx].slice(0, 3);
      const fullM = MONTH_NAMES[mIdx];
      const displayM = year ? `${fullM} ${year}` : fullM;
      const shortMonth = year ? `${shortM} '${String(year).slice(2)}` : shortM;
      const sortKey = year ? year * 100 + (mIdx + 1) : 0;
      return { year, monthIndex: mIdx, displayMonth: displayM, shortMonth, sortKey };
    }
  }

  // Fallback for custom or unrecognized labels
  return { displayMonth: clean, shortMonth: clean, sortKey: 0 };
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
      label: `${points.length} Months`,
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
    const y1 = minYear;
    const y2 = minYear + 1;
    const rangePts = points.filter(p => p.year === y1 || p.year === y2);
    const minIdx = rangePts.length > 0 ? Math.min(...rangePts.map(p => p.pointIndex)) : 0;
    const maxIdx = rangePts.length > 0 ? Math.max(...rangePts.map(p => p.pointIndex)) : points.length - 1;
    options.push({
      id: `${y1}-${y2}`,
      label: `${y1}–${y2}`,
      years: [y1, y2],
      pointCount: rangePts.length > 0 ? rangePts.length : points.length,
      minPointIndex: minIdx,
      maxPointIndex: maxIdx
    });
  } else {
    // 1. Full span option: e.g. "2023–2026" (all years from minYear to maxYear)
    if (maxYear - minYear >= 2) {
      options.push({
        id: `${minYear}-${maxYear}`,
        label: `${minYear}–${maxYear}`,
        years: knownYears,
        pointCount: points.length,
        minPointIndex: 0,
        maxPointIndex: points.length - 1
      });
    }

    // 2. Consecutive 2-year ranges: 2023–2024, 2024–2025, 2025–2026
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

/**
 * Detect tabular or list-based trend data from assistant response text
 */
export function parseTrendData(content: string): TrendSeries | null {
  if (!content || typeof content !== 'string') return null;

  const tableResult = parseFromMarkdownTable(content);
  if (tableResult && tableResult.points.length >= 2) return tableResult;

  const listResult = parseFromListOrArrows(content);
  if (listResult && listResult.points.length >= 2) return listResult;

  const fallbackResult = parseFromAnyLine(content);
  if (fallbackResult && fallbackResult.points.length >= 2) return fallbackResult;

  return null;
}

/**
 * Attempt to extract trend data from Markdown tables
 */
function parseFromMarkdownTable(content: string): TrendSeries | null {
  const lines = content.split('\n');
  let inTable = false;
  let headerCols: string[] = [];
  let monthColIdx = -1;
  let amountColIdx = -1;
  let countColIdx = -1;
  const rawRows: string[][] = [];
  let precedingHeading = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#') || (line.startsWith('**') && line.endsWith('**') && line.toLowerCase().includes('trend'))) {
      precedingHeading = line.replace(/^[#* \t]+|[#* \t]+$/g, '');
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      const cols = line.slice(1, -1).split('|').map(c => c.trim());
      const isSeparator = cols.every(c => /^:?-+:?$/.test(c.replace(/\s+/g, '')));

      if (!inTable && !isSeparator) {
        const isMonthHeader = cols.some(c => /month|date|period|time/i.test(c));
        const isAmountHeader = cols.some(c => /amount|total|spend|invoice|revenue|cost|sales/i.test(c));

        if (isMonthHeader || isAmountHeader) {
          inTable = true;
          headerCols = cols;
          monthColIdx = cols.findIndex(c => /month|date|period|time/i.test(c));
          amountColIdx = cols.findIndex(c => /amount|total|spend|revenue|cost|sales/i.test(c));
          countColIdx = cols.findIndex(c => /count|invoices|no\.|number/i.test(c));

          if (amountColIdx === -1) {
            amountColIdx = cols.findIndex(c => /invoice/i.test(c) && !/count|no\./i.test(c));
          }
          if (monthColIdx === -1 && cols.length > 0) monthColIdx = 0;
          if (amountColIdx === -1 && cols.length > 1) amountColIdx = 1;
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

  if (rawRows.length < 2) return null;

  const points: TrendDataPoint[] = [];
  let detectedCurrency = '$';

  for (const row of rawRows) {
    const monthCell = (monthColIdx >= 0 && monthColIdx < row.length) ? row[monthColIdx] : row[0];
    const amountCell = (amountColIdx >= 0 && amountColIdx < row.length) ? row[amountColIdx] : row[1];
    const countCell = (countColIdx >= 0 && countColIdx < row.length) ? row[countColIdx] : undefined;

    const monthClean = monthCell.replace(/[*_`]/g, '').trim();
    // Must match a month pattern — bare year numbers like "2024" are rejected
    if (!MONTH_REGEX.test(monthClean) && !/^[a-zA-Z]{3,9}\s+\d{2,4}/.test(monthClean)) {
      continue;
    }

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

    // Skip if parseDateInfo could not identify a month (e.g. bare year "2024")
    if (dateInfo.monthIndex === undefined) continue;

    // Deduplicate: same month+year combination
    if (points.some(p => p.year === dateInfo.year && p.monthIndex === dateInfo.monthIndex)) continue;

    points.push({
      month: dateInfo.displayMonth,
      shortMonth: dateInfo.shortMonth,
      rawAmount: amountCell.replace(/[*_`]/g, '').trim(),
      amount: numAmount,
      currencySymbol: curr,
      invoiceCount: invoiceCountStr,
      invoiceCountNum: invoiceCountNum,
      year: dateInfo.year,
      monthIndex: dateInfo.monthIndex,
      sortKey: dateInfo.sortKey,
      pointIndex: 0  // filled by buildTrendSeries
    });
  }

  if (points.length < 2) return null;
  return buildTrendSeries(precedingHeading || 'Monthly Invoice Amount Trend', points, detectedCurrency);
}

/**
 * Attempt to extract trend data from arrow, bullet, or colon lines.
 */
function parseFromListOrArrows(content: string): TrendSeries | null {
  const lines = content.split('\n');
  const points: TrendDataPoint[] = [];
  let detectedCurrency = '$';
  let precedingHeading = '';

  const linePattern = /(?:[-*•\d.]+\s*)?([A-Za-z0-9\-/.']{3,15}(?:\s*(?:20\d\d|19\d\d|'\d\d))?)(?:\s*[→\->:=–|]\s*|\s+is\s+|\s+)([$₹€£¥A-Z]{0,3}\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cleanedLine = rawLine.replace(/\*\*?|__?/g, '').trim();

    if ((cleanedLine.startsWith('#') || lineHasTrend(cleanedLine)) && !MONTH_REGEX.test(cleanedLine)) {
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

      if (!MONTH_REGEX.test(monthStr)) continue;

      const numAmount = parseNumericAmount(amountStr);
      if (numAmount === null || numAmount < 100) continue;

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

      // Skip if no month was parsed (bare year numbers rejected here too)
      if (dateInfo.monthIndex === undefined) continue;

      // Deduplicate by year+month combination
      if (points.some(p => p.year === dateInfo.year && p.monthIndex === dateInfo.monthIndex)) continue;

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
        sortKey: dateInfo.sortKey,
        pointIndex: 0  // filled by buildTrendSeries
      });
    }
  }

  if (points.length < 2) return null;
  return buildTrendSeries(precedingHeading || 'Monthly Invoice Amount Trend', points, detectedCurrency);
}

function lineHasTrend(line: string): boolean {
  return line.toLowerCase().includes('trend') || line.toLowerCase().includes('monthly');
}

/**
 * Fallback: scan every line for co-occurrence of a month name + a large number (≥1000)
 */
function parseFromAnyLine(content: string): TrendSeries | null {
  const lines = content.split('\n');
  const points: TrendDataPoint[] = [];
  let detectedCurrency = '$';
  let precedingHeading = '';

  const monthCapture = new RegExp(
    `((?:${MONTH_NAMES.join('|')}|${MONTH_ABBRS.join('|')})\\s*(?:20\\d\\d|19\\d\\d)?|(?:20\\d\\d)[-/.](?:0?[1-9]|1[0-2]))`,
    'i'
  );
  const amountCapture = /([\$₹€£¥]?\s*[1-9][0-9]{2,}(?:,[0-9]{3})*(?:\.[0-9]+)?)/;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\*\*?|__?|`/g, '').trim();
    if (!line) continue;

    if ((line.startsWith('#') || lineHasTrend(line)) && !MONTH_REGEX.test(line)) {
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
    if (!MONTH_REGEX.test(monthStr)) continue;

    const amountStr = mAmount[1].trim();
    const numAmount = parseNumericAmount(amountStr);
    if (numAmount === null || numAmount < 100) continue;

    const curr = extractCurrencySymbol(amountStr);
    if (curr) detectedCurrency = curr;

    const dateInfo = parseDateInfo(monthStr);
    if (dateInfo.monthIndex === undefined) continue;

    if (points.some(p => p.year === dateInfo.year && p.monthIndex === dateInfo.monthIndex)) continue;

    points.push({
      month: dateInfo.displayMonth,
      shortMonth: dateInfo.shortMonth,
      rawAmount: amountStr,
      amount: numAmount,
      currencySymbol: curr,
      year: dateInfo.year,
      monthIndex: dateInfo.monthIndex,
      sortKey: dateInfo.sortKey,
      pointIndex: 0
    });
  }

  if (points.length < 2) return null;
  return buildTrendSeries(precedingHeading || 'Monthly Invoice Amount Trend', points, detectedCurrency);
}

/**
 * Assemble final TrendSeries with min, max, totals and scaling helpers
 */
function buildTrendSeries(
  title: string,
  rawPoints: TrendDataPoint[],
  currencySymbol: string
): TrendSeries {
  // Sort points chronologically:
  // If points have valid sortKey (> 0), sort by sortKey; otherwise preserve original order
  const hasValidDates = rawPoints.some(p => p.sortKey > 0);
  const points = hasValidDates
    ? [...rawPoints].sort((a, b) => a.sortKey - b.sortKey)
    : [...rawPoints];

  // Assign stable, sequential 0-based pointIndex to every point
  points.forEach((p, idx) => {
    p.pointIndex = idx;
  });

  let max = points[0].amount;
  let min = points[0].amount;
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

  // Generate period options using pointIndex ranges
  const periodOptions = generatePeriodOptions(points);

  // Default: first period option (e.g., "2023-2026" full range if available, or first 2-year range)
  const defaultPeriodId = periodOptions.length > 0 ? periodOptions[0].id : '';

  return {
    title: title || 'Monthly Invoice Amount Trend',
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
    defaultPeriodId
  };
}
