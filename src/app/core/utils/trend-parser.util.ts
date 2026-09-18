export interface TrendDataPoint {
  month: string;              // e.g. "January 2026"
  shortMonth: string;         // e.g. "Jan 2026" or "Jan '26"
  rawAmount: string;          // e.g. "$31,073,919.57" (exact string preserved from response)
  amount: number;             // numeric for chart plotting e.g. 31073919.57
  currencySymbol: string;     // e.g. "$" or "₹" or "€"
  invoiceCount?: string;      // e.g. "1,245" or "1,245 invoices"
  invoiceCountNum?: number;   // numeric if available
  percentOfMax?: number;      // 0 to 100 relative to peak
}

export interface TrendSeries {
  title: string;
  points: TrendDataPoint[];
  currencySymbol: string;
  maxAmount: number;
  minAmount: number;
  totalAmount: number;
  totalAmountFormatted: string;
  peakPoint: TrendDataPoint;
  lowestPoint: TrendDataPoint;
  hasInvoiceCount: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBRS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec'
];

const MONTH_REGEX = new RegExp(
  `\\b(?:(?:${MONTH_NAMES.join('|')}|${MONTH_ABBRS.join('|')})\\s*['’]?(?:20\\d\\d|19\\d\\d|\\d\\d)?|(?:20\\d\\d|19\\d\\d)[-/](?:0?[1-9]|1[0-2])|(?:0?[1-9]|1[0-2])[-/](?:20\\d\\d|19\\d\\d)|Q[1-4]\\s*(?:20\\d\\d|\\d\\d)?)\\b`,
  'i'
);

/**
 * Clean up currency string and extract numerical value
 */
function parseNumericAmount(raw: string): number | null {
  if (!raw) return null;
  // Match numbers with possible commas and decimals
  const match = raw.match(/[-+]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[-+]?[0-9]+(?:\.[0-9]+)?/);
  if (!match) return null;
  const num = parseFloat(match[0].replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * Extract currency symbol or prefix
 */
function extractCurrencySymbol(raw: string): string {
  if (!raw) return '$';
  if (raw.includes('$')) return '$';
  if (raw.includes('₹') || raw.toUpperCase().includes('INR')) return '₹';
  if (raw.includes('€') || raw.toUpperCase().includes('EUR')) return '€';
  if (raw.includes('£') || raw.toUpperCase().includes('GBP')) return '£';
  if (raw.includes('¥')) return '¥';
  const match = raw.match(/^([^\d\s,]+)/);
  return match ? match[1].trim() : '$';
}

/**
 * Format month label into a clean short form for axis display
 */
function formatShortMonth(label: string): string {
  const trimmed = label.trim();
  // If e.g. "January 2026", convert to "Jan '26" or "Jan 2026"
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2) {
    const m = parts[0];
    const y = parts[1];
    const shortM = m.slice(0, 3);
    const shortY = y.length === 4 ? `'${y.slice(2)}` : y;
    return `${shortM} ${shortY}`;
  }
  return trimmed;
}

/**
 * Detect tabular or list-based trend data from assistant response text
 */
export function parseTrendData(content: string): TrendSeries | null {
  if (!content || typeof content !== 'string') return null;

  // Try parsing Markdown tables first
  const tableResult = parseFromMarkdownTable(content);
  if (tableResult && tableResult.points.length >= 2) {
    console.log('[TrendParser] Found data via Markdown table:', tableResult.points.length, 'points');
    return tableResult;
  }

  // Try parsing arrow / bullet / colon lists (e.g. "January 2026 → $31,073,919.57")
  const listResult = parseFromListOrArrows(content);
  if (listResult && listResult.points.length >= 2) {
    console.log('[TrendParser] Found data via list/arrow format:', listResult.points.length, 'points');
    return listResult;
  }

  // Last resort: scan any line that has both a month name and a currency amount
  const fallbackResult = parseFromAnyLine(content);
  if (fallbackResult && fallbackResult.points.length >= 2) {
    console.log('[TrendParser] Found data via fallback scan:', fallbackResult.points.length, 'points');
    return fallbackResult;
  }

  // Debug: show a snippet of content for troubleshooting
  console.log('[TrendParser] No trend data detected. Content snippet:', content.substring(0, 400));
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

    // Track preceding headings for title
    if (line.startsWith('#') || (line.startsWith('**') && line.endsWith('**') && line.toLowerCase().includes('trend'))) {
      precedingHeading = line.replace(/^[#* \t]+|[#* \t]+$/g, '');
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      const cols = line
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      // Check if this is a separator row e.g. |---|---|
      const isSeparator = cols.every(c => /^:?-+:?$/.test(c.replace(/\s+/g, '')));

      if (!inTable && !isSeparator) {
        // Potential header
        const isMonthHeader = cols.some(c => /month|date|period|time/i.test(c));
        const isAmountHeader = cols.some(c => /amount|total|spend|invoice|revenue|cost|sales/i.test(c));

        if (isMonthHeader || isAmountHeader) {
          inTable = true;
          headerCols = cols;
          monthColIdx = cols.findIndex(c => /month|date|period|time/i.test(c));
          amountColIdx = cols.findIndex(c => /amount|total|spend|revenue|cost|sales/i.test(c));
          countColIdx = cols.findIndex(c => /count|invoices|no\.|number/i.test(c));

          // If count was matched as amount or vice versa, refine
          if (amountColIdx === -1) {
            amountColIdx = cols.findIndex(c => /invoice/i.test(c) && !/count|no\./i.test(c));
          }
          if (monthColIdx === -1 && cols.length > 0) {
            monthColIdx = 0;
          }
          if (amountColIdx === -1 && cols.length > 1) {
            amountColIdx = 1;
          }
          continue;
        }
      } else if (inTable) {
        if (isSeparator) {
          continue;
        }

        // Data row
        if (cols.length >= 2) {
          rawRows.push(cols);
        }
      }
    } else if (inTable && rawRows.length > 0) {
      // Table ended
      break;
    }
  }

  if (rawRows.length < 2) {
    return null;
  }

  // Parse points from table rows
  const points: TrendDataPoint[] = [];
  let detectedCurrency = '$';

  for (const row of rawRows) {
    const monthCell = (monthColIdx >= 0 && monthColIdx < row.length) ? row[monthColIdx] : row[0];
    const amountCell = (amountColIdx >= 0 && amountColIdx < row.length) ? row[amountColIdx] : row[1];
    const countCell = (countColIdx >= 0 && countColIdx < row.length) ? row[countColIdx] : undefined;

    // Check if month cell matches a month or date
    const monthClean = monthCell.replace(/[*_`]/g, '').trim();
    if (!MONTH_REGEX.test(monthClean) && !/^[0-9]{4}/.test(monthClean) && !/^[a-zA-Z]{3,9}\s+\d{2,4}/.test(monthClean)) {
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

    points.push({
      month: monthClean,
      shortMonth: formatShortMonth(monthClean),
      rawAmount: amountCell.replace(/[*_`]/g, '').trim(),
      amount: numAmount,
      currencySymbol: curr,
      invoiceCount: invoiceCountStr,
      invoiceCountNum: invoiceCountNum
    });
  }

  if (points.length < 2) return null;

  return buildTrendSeries(
    precedingHeading || 'Monthly Invoice Amount Trend',
    points,
    detectedCurrency
  );
}

/**
 * Attempt to extract trend data from arrow, bullet, or colon lines
 * Examples:
 * January 2026 → $31,073,919.57
 * - February 2026: $50,103,350.38 (Count: 1,890)
 * 1. March 2026 - $50,169,126.37
 */
function parseFromListOrArrows(content: string): TrendSeries | null {
  const lines = content.split('\n');
  const points: TrendDataPoint[] = [];
  let detectedCurrency = '$';
  let precedingHeading = '';

  // Regex for line matching:
  // (bullet/number)? (Month Year) (separator or whitespace) (Currency)(Amount) (optional count info)
  // Supports: "January 2026 → $31,073,919.57", "January 2026: $31,073,919.57", "January 2026 $31,073,919.57"
  const linePattern = /(?:[-*•\d.]+\s*)?([A-Za-z]{3,9}\s*(?:20\d\d|19\d\d|'\d\d)?)(?:\s*[→\->:=–|]\s*|\s+is\s+|\s+)([$₹€£¥A-Z]{0,3}\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)(.*)/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Strip markdown bold/italic markers so **January 2026** → ... is handled correctly
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

      // Verify that monthStr actually has month name
      if (!MONTH_REGEX.test(monthStr)) continue;

      const numAmount = parseNumericAmount(amountStr);
      // Guard against false positives (partial years like "202" captured as amounts)
      if (numAmount === null || numAmount < 100) continue;

      const curr = extractCurrencySymbol(amountStr);
      if (curr) detectedCurrency = curr;

      // Extract optional count from trailing text e.g. "(Count: 1,245)" or "1,245 invoices"
      let countStr: string | undefined = undefined;
      let countNum: number | undefined = undefined;
      const countMatch = trailingStr.match(/(?:count|invoices?)[:\s]*([0-9,]+)/i) ||
                         trailingStr.match(/\(?([0-9,]+)\s*invoices?\)?/i);
      if (countMatch) {
        countStr = countMatch[1].trim();
        const parsedCount = parseNumericAmount(countStr);
        if (parsedCount !== null) countNum = parsedCount;
      }

      points.push({
        month: monthStr,
        shortMonth: formatShortMonth(monthStr),
        rawAmount: amountStr,
        amount: numAmount,
        currencySymbol: curr,
        invoiceCount: countStr ? `${countStr} invoices` : undefined,
        invoiceCountNum: countNum
      });
    }
  }

  if (points.length < 2) return null;

  return buildTrendSeries(
    precedingHeading || 'Monthly Invoice Amount Trend',
    points,
    detectedCurrency
  );
}

function lineHasTrend(line: string): boolean {
  return line.toLowerCase().includes('trend') || line.toLowerCase().includes('monthly');
}

/**
 * Fallback: scan every line for co-occurrence of a month name + a large number (≥1000)
 * This is a last-resort parser for unusual AI response formats.
 */
function parseFromAnyLine(content: string): TrendSeries | null {
  const lines = content.split('\n');
  const points: TrendDataPoint[] = [];
  let detectedCurrency = '$';
  let precedingHeading = '';

  // Relaxed: find month name + year optionally + any large number on same line
  const monthCapture = new RegExp(
    `((?:${MONTH_NAMES.join('|')}|${MONTH_ABBRS.join('|')})\\s*(?:20\\d\\d|19\\d\\d)?)`,
    'i'
  );
  // Large amount: currency symbol optional + number ≥ 1000
  const amountCapture = /([\$₹€£¥]?\s*[1-9][0-9]{2,}(?:,[0-9]{3})*(?:\.[0-9]+)?)/;

  for (const rawLine of lines) {
    // Strip markdown formatting
    const line = rawLine.replace(/\*\*?|__?|`/g, '').trim();
    if (!line) continue;

    // Track headings
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
    if (numAmount === null || numAmount < 1000) continue;

    const curr = extractCurrencySymbol(amountStr) || detectedCurrency;
    if (curr) detectedCurrency = curr;

    // Avoid duplicate months
    if (points.some(p => p.month === monthStr)) continue;

    points.push({
      month: monthStr,
      shortMonth: formatShortMonth(monthStr),
      rawAmount: amountStr,
      amount: numAmount,
      currencySymbol: curr,
    });
  }

  if (points.length < 2) return null;

  return buildTrendSeries(
    precedingHeading || 'Monthly Invoice Amount Trend',
    points,
    detectedCurrency
  );
}

/**
 * Assemble final TrendSeries with min, max, totals and scaling helpers
 */
function buildTrendSeries(
  title: string,
  points: TrendDataPoint[],
  currencySymbol: string
): TrendSeries {
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

  // Calculate percentage of max for each point
  for (const pt of points) {
    pt.percentOfMax = max > 0 ? (pt.amount / max) * 100 : 0;
  }

  // Format total amount with same currency symbol
  const formattedSum = `${currencySymbol}${sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
    hasInvoiceCount: hasCount
  };
}
