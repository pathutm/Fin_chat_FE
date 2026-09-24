import {
  AnalyticalPresentation,
  KpiMetricItem,
  TableColumnMeta,
  TableGridData,
  TableRowData,
  VisualFormatType,
  TableCellType
} from '../models/analytics-view.model';
import {
  parseTrendData,
  TrendSeries,
  extractCurrencySymbol,
  DATE_REGEX
} from './trend-parser.util';

/**
 * Clean up text for title display.
 */
function cleanTitle(str: string): string {
  if (!str) return '';
  return str
    .replace(/^#+\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/[:\-–—]+$/, '')
    .trim();
}

/**
 * Extract clean numeric value from a string (handles currency, commas, percentages).
 */
function extractNumeric(val: string): number | null {
  if (!val) return null;
  const clean = val.replace(/[$,₹€£¥%]/g, '').replace(/,/g, '').trim();
  const match = clean.match(/[-+]?[0-9]+(?:\.[0-9]+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * Identify column data type based on values.
 */
function inferColumnType(header: string, values: string[]): TableCellType {
  const hLower = header.toLowerCase();
  if (/(?:po\s*#|grn\s*#|inv(?:oice)?\s*#|id|number|code|sku)/i.test(hLower)) {
    return 'code';
  }
  if (/(?:status|state|match|result|condition)/i.test(hLower)) {
    return 'status';
  }
  if (/(?:date|month|year|period|quarter|time)/i.test(hLower)) {
    return 'date';
  }
  if (/(?:%|percent|ratio|rate|margin)/i.test(hLower)) {
    return 'percentage';
  }
  if (/(?:amount|spend|cost|revenue|price|total|balance|val(?:ue)?)/i.test(hLower)) {
    return 'currency';
  }
  if (/(?:qty|quantity|count|volume|units?)/i.test(hLower)) {
    return 'number';
  }

  // Value inspection fallback
  const sample = values.filter(v => v && v.trim().length > 0).slice(0, 5);
  if (sample.length === 0) return 'text';

  if (sample.every(s => /[$₹€£¥]/.test(s))) return 'currency';
  if (sample.every(s => /%$/.test(s.trim()))) return 'percentage';
  if (sample.every(s => DATE_REGEX.test(s))) return 'date';
  if (sample.every(s => /^(?:matched|discrepancy|pending|approved|rejected|active|closed|overdue)$/i.test(s.trim()))) return 'status';
  if (sample.every(s => extractNumeric(s) !== null)) return 'number';

  return 'text';
}

/**
 * Determine alignment based on column type.
 */
function getColumnAlign(type: TableCellType): 'left' | 'right' | 'center' {
  switch (type) {
    case 'currency':
    case 'number':
    case 'percentage':
      return 'right';
    case 'status':
    case 'date':
      return 'center';
    default:
      return 'left';
  }
}

/**
 * Map status text to design system status variant.
 */
function mapStatusVariant(text: string): 'success' | 'warning' | 'destructive' | 'info' | 'neutral' {
  const t = text.toLowerCase().trim();
  if (/matched|approved|paid|active|pass|success|favorable/i.test(t)) return 'success';
  if (/pending|review|investigate|warning|neutral/i.test(t)) return 'warning';
  if (/discrepancy|mismatch|rejected|overdue|failed|unfavorable|error/i.test(t)) return 'destructive';
  if (/open|in\s*progress|info/i.test(t)) return 'info';
  return 'neutral';
}

/**
 * Parse structured markdown table from response content.
 */
export function extractTableData(content: string, precedingHeading?: string): TableGridData | null {
  const lines = content.split('\n');
  let inTable = false;
  let headerCols: string[] = [];
  const rawRows: string[][] = [];
  let detectedTitle = precedingHeading || '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    if (rawLine.startsWith('#') || (rawLine.startsWith('**') && rawLine.endsWith('**'))) {
      if (!inTable) {
        detectedTitle = cleanTitle(rawLine);
      }
    }

    if (rawLine.startsWith('|') && rawLine.endsWith('|')) {
      const cols = rawLine.slice(1, -1).split('|').map(c => c.trim());
      const isSeparator = cols.every(c => /^:?-+:?$/.test(c.replace(/\s+/g, '')));

      if (!inTable && !isSeparator) {
        if (cols.length >= 2) {
          inTable = true;
          headerCols = cols.map(c => c.replace(/[*_`]/g, '').trim());
          continue;
        }
      } else if (inTable) {
        if (isSeparator) continue;
        if (cols.length >= 2) {
          rawRows.push(cols.map(c => c.replace(/[*_`]/g, '').trim()));
        }
      }
    } else if (inTable && rawRows.length > 0) {
      break;
    }
  }

  if (!inTable || rawRows.length === 0 || headerCols.length < 2) {
    return null;
  }

  // Detect currency symbol
  let currencySymbol = '$';
  for (const row of rawRows) {
    for (const cell of row) {
      const c = extractCurrencySymbol(cell);
      if (c) {
        currencySymbol = c;
        break;
      }
    }
  }

  // Build Column Meta
  const columns: TableColumnMeta[] = headerCols.map((colName, colIdx) => {
    const values = rawRows.map(r => r[colIdx] || '');
    const colType = inferColumnType(colName, values);
    return {
      key: `col_${colIdx}`,
      label: colName,
      type: colType,
      align: getColumnAlign(colType),
      sortable: true,
      currencySymbol: colType === 'currency' ? currencySymbol : undefined
    };
  });

  // Build Row Data
  const rows: TableRowData[] = rawRows.map((row, rowIdx) => {
    const cells: { [k: string]: string | number | null } = {};
    let statusBadge: TableRowData['statusBadge'] = undefined;

    row.forEach((cellVal, colIdx) => {
      const colMeta = columns[colIdx];
      const key = colMeta ? colMeta.key : `col_${colIdx}`;
      cells[key] = cellVal;

      if (colMeta && colMeta.type === 'status' && !statusBadge) {
        statusBadge = {
          text: cellVal,
          variant: mapStatusVariant(cellVal)
        };
      }
    });

    return {
      id: `row_${rowIdx}`,
      cells,
      statusBadge
    };
  });

  return {
    title: detectedTitle || 'Financial Records',
    columns,
    rows,
    totalRowCount: rows.length,
    currencySymbol
  };
}

/**
 * Extract KPI metrics from bullet points, key-values, or single-metric answers.
 */
export function extractKpiMetrics(content: string): KpiMetricItem[] {
  const kpis: KpiMetricItem[] = [];
  const lines = content.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('|') || line.startsWith('#')) continue;

    // Check if line looks like a bullet or key-value pair
    const bulletClean = line.replace(/^[-*•]\s*/, '').trim();

    // Look for colon separator. Matches: **Label:** Value or **Label**: Value or Label: Value
    const colonMatch = bulletClean.match(/^(\*\*?[A-Za-z0-9\s/_\-–—]+(?::\*\*|\*\*:|:))\s*([$₹€£¥]?\s*[-+]?[0-9,]+(?:\.[0-9]+)?%?(?:\s*[A-Za-z]+)?)(.*)$/);
    if (!colonMatch) continue;

    const rawLabel = colonMatch[1].replace(/[*_`:]/g, '').trim();
    const rawVal = colonMatch[2].replace(/[*_`]/g, '').trim();
    const rest = (colonMatch[3] || '').replace(/[*_`]/g, '').trim();

    // Skip generic text labels that are too long or conversational
    if (!rawLabel || rawLabel.length > 38 || rawLabel.split(/\s+/).length > 5) continue;
    if (/^(?:note|explanation|step|example|summary|reason|source|formula|where|description)/i.test(rawLabel)) continue;

    const num = extractNumeric(rawVal);
    if (num === null) continue;

    const curr = extractCurrencySymbol(rawVal);
    const isPercent = rawVal.includes('%') || /margin|rate|ratio|percent|variance/i.test(rawLabel);

    // Look for change percent / variance in the rest string: e.g. (+3.2% YoY) or (-1.5%)
    let changePercent: number | undefined;
    let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
    let changeText: string | undefined;

    const changeMatch = rest.match(/\(([-+]?[0-9.]+)%\s*([^)]*)\)|\b([-+]?[0-9.]+)%\s*(?:increase|decrease|yoy|mom|variance)\b/i);
    if (changeMatch) {
      const valStr = changeMatch[1] || changeMatch[3];
      changePercent = parseFloat(valStr);
      if (!isNaN(changePercent)) {
        changeText = `${changePercent > 0 ? '+' : ''}${changePercent}%`;
        if (changePercent > 0) changeType = 'positive';
        else if (changePercent < 0) changeType = 'negative';
      }
    } else if (num < 0 || rawVal.startsWith('-')) {
      changeType = 'negative';
    } else if (rest.toLowerCase().includes('favorable')) {
      changeType = 'positive';
    }

    // Clean subtext
    const subtext = rest.replace(/\(([-+]?[0-9.]+)%[^)]*\)/, '').replace(/^[-(:]+/, '').trim() || undefined;

    kpis.push({
      id: `kpi_${kpis.length}`,
      label: rawLabel,
      value: rawVal,
      numericValue: num,
      currencySymbol: curr || undefined,
      unit: isPercent ? '%' : undefined,
      changePercent,
      changeText,
      changeType,
      subtext
    });

    if (kpis.length >= 6) break;
  }

  return kpis;
}

/**
 * Analyze user query and AI response content to intelligently select the optimal presentation.
 */
export function analyzeAnalyticalResponse(
  content: string,
  userQuery: string = ''
): AnalyticalPresentation {
  if (!content || typeof content !== 'string') {
    return {
      visualType: 'none',
      title: '',
      suitableViews: ['none'],
      activeView: 'none',
      isVisualizationUseful: false
    };
  }

  const cleanQ = (userQuery || '').toLowerCase();
  const tableData = extractTableData(content);
  const kpiItems = extractKpiMetrics(content);
  const trendSeries = parseTrendData(content, userQuery);

  // If no structured table, no KPIs, and no trend series: render normal text only!
  if (!tableData && kpiItems.length === 0 && !trendSeries) {
    return {
      visualType: 'none',
      title: '',
      suitableViews: ['none'],
      activeView: 'none',
      isVisualizationUseful: false
    };
  }

  // 1. Detailed Records Detection:
  // Tables with >= 4 columns where multiple columns are IDs/codes/statuses/reconciliation items
  const isDetailedRecordsTable = !!(
    tableData &&
    tableData.columns.length >= 4 &&
    (tableData.columns.some(c => c.type === 'status' || c.type === 'code') ||
     /\b(?:reconciliation|audit|discrepanc(?:y|ies)|transactions?|records?|details?|list)\b/i.test(cleanQ))
  );

  // 2. Time-Series Trends:
  const isTimeSeriesTrend = !!(
    trendSeries &&
    (trendSeries.categoryType === 'time' || trendSeries.points.some(p => p.sortKey > 0)) &&
    trendSeries.points.length >= 2
  );

  // 3. Pure KPI Query Detection:
  // 1 to 4 metric items without a large series, or explicit ratio/margin questions
  const isKpiFocused = (
    kpiItems.length >= 1 &&
    kpiItems.length <= 4 &&
    (!tableData || tableData.rows.length <= 2) &&
    (!trendSeries || trendSeries.points.length <= 2)
  );

  // 4. Proportions / Part-to-whole (must NOT be time series):
  const isProportionFocused = !isTimeSeriesTrend && !!(
    /\b(?:proportion|share|composition|pie|donut|parts?\s*of\s*whole)\b/i.test(cleanQ) ||
    (/\bbreakdown\b/i.test(cleanQ) && !isTimeSeriesTrend) ||
    (tableData && tableData.columns.some(c => /component|cost\s*item|cost\s*share/i.test(c.label)) && tableData.rows.length <= 8)
  );

  // 5. Relationships / Correlation:
  // 2 numeric metrics compared against each other
  const isRelationshipFocused = !!(
    /\b(?:correlation|relationship|scatter|vs|versus)\b/i.test(cleanQ) &&
    tableData &&
    tableData.columns.filter(c => c.type === 'number' || c.type === 'currency').length >= 2
  );

  // 6. Comparisons / Rankings:
  // Vendors by spend, products by cost, etc.
  const isRankingOrComparison = !!(
    /\b(?:top|highest|lowest|rank|ranking|compare|comparison|versus|vs|best|worst)\b/i.test(cleanQ) ||
    (trendSeries && trendSeries.categoryType === 'category') ||
    (tableData && tableData.columns.some(c => /vendor|product|customer|plant|warehouse|cost\s*centre|account/i.test(c.label)))
  );

  // Determine Title
  const title =
    trendSeries?.title ||
    tableData?.title ||
    (kpiItems.length > 0 ? 'Key Performance Metrics' : 'Financial Analysis');

  // Decision Tree
  let visualType: VisualFormatType = 'none';
  const suitableViews: VisualFormatType[] = [];

  if (isDetailedRecordsTable && tableData) {
    visualType = 'data-table';
    suitableViews.push('data-table');
    if (trendSeries && trendSeries.points.length >= 3) {
      suitableViews.push('bar-chart');
    }
  } else if (isKpiFocused && kpiItems.length > 0) {
    visualType = 'kpi-grid';
    suitableViews.push('kpi-grid');
    if (tableData) suitableViews.push('data-table');
  } else if (kpiItems.length >= 2 && trendSeries && trendSeries.points.length >= 3) {
    // Multi-metric dashboard (KPIs at top + chart below)
    visualType = 'dashboard';
    suitableViews.push('dashboard');
    suitableViews.push(trendSeries.categoryType === 'category' ? 'bar-chart' : 'line-chart');
    if (tableData) suitableViews.push('data-table');
  } else if (isRelationshipFocused && trendSeries) {
    visualType = 'scatter-chart';
    suitableViews.push('scatter-chart');
    if (tableData) suitableViews.push('data-table');
  } else if (isProportionFocused && trendSeries) {
    visualType = 'donut-chart';
    suitableViews.push('donut-chart');
    suitableViews.push('bar-chart');
    if (tableData) suitableViews.push('data-table');
  } else if (isRankingOrComparison && trendSeries) {
    visualType = 'bar-chart';
    suitableViews.push('bar-chart');
    if (trendSeries.points.length <= 8) suitableViews.push('donut-chart');
    if (tableData) suitableViews.push('data-table');
  } else if (isTimeSeriesTrend && trendSeries) {
    visualType = 'line-chart';
    suitableViews.push('line-chart');
    suitableViews.push('bar-chart');
    if (tableData) suitableViews.push('data-table');
  } else if (trendSeries && trendSeries.points.length >= 2) {
    visualType = trendSeries.categoryType === 'category' ? 'bar-chart' : 'line-chart';
    suitableViews.push(visualType);
    if (tableData) suitableViews.push('data-table');
  } else if (tableData && tableData.rows.length >= 2) {
    visualType = 'data-table';
    suitableViews.push('data-table');
  } else if (kpiItems.length > 0) {
    visualType = 'kpi-grid';
    suitableViews.push('kpi-grid');
  }

  // Determine Visualization State Flags
  const visualizationAvailable = visualType !== 'none';

  // Explicit visualization request detection in original user prompt (requires explicit chart/graph/plot/visualize action word)
  const hasExplicitVisualIntent = /\b(?:chart|graph|plot|visualize|visualization|bar\s*chart|line\s*chart|donut\s*chart|pie\s*chart|scatter\s*plot|histogram|waterfall\s*chart|draw|show\s*chart|make\s*chart)\b/i.test(cleanQ);

  // Pure theoretical / definition question detection
  const isTheoreticalQuery = /\b(?:what\s+is|explain|definition|define|meaning\s+of|how\s+does)\b/i.test(cleanQ) && !/\b(?:data|show|get|list|top|revenue|invoice|vendor|sales)\b/i.test(cleanQ);

  let visualizationVisible = false;
  let visualizationOffered = false;
  let visualizationIntent = false;

  if (visualizationAvailable && !isTheoreticalQuery) {
    if (hasExplicitVisualIntent) {
      visualizationVisible = true;
      visualizationIntent = true;
      visualizationOffered = false;
    } else {
      visualizationVisible = false;
      visualizationIntent = false;
      visualizationOffered = true;
    }
  }

  const isVisualizationUseful = visualizationAvailable && visualizationVisible;

  return {
    visualType,
    title,
    subtitle: trendSeries?.granularity ? `Granularity: ${trendSeries.granularity}` : undefined,
    kpiItems: kpiItems.length > 0 ? kpiItems : undefined,
    chartData: trendSeries || undefined,
    tableData: tableData || undefined,
    suitableViews: suitableViews.length > 0 ? suitableViews : [visualType],
    activeView: visualType,
    isVisualizationUseful,
    visualizationAvailable,
    visualizationVisible,
    visualizationIntent,
    visualizationOffered,
    visualizationRequested: hasExplicitVisualIntent
  };
}
