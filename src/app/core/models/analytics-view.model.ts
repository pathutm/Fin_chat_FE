import { TrendSeries } from '../utils/trend-parser.util';

export type VisualFormatType =
  | 'none'
  | 'kpi-grid'
  | 'bar-chart'
  | 'line-chart'
  | 'donut-chart'
  | 'scatter-chart'
  | 'dashboard'
  | 'data-table';

export interface KpiMetricItem {
  id: string;
  label: string;
  value: string;
  numericValue?: number;
  unit?: string;
  currencySymbol?: string;
  changePercent?: number;
  changeText?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  category?: string;
  badge?: string;
}

export type TableCellType = 'text' | 'currency' | 'number' | 'percentage' | 'date' | 'status' | 'code';

export interface TableColumnMeta {
  key: string;
  label: string;
  type: TableCellType;
  align: 'left' | 'right' | 'center';
  sortable?: boolean;
  currencySymbol?: string;
}

export interface TableRowData {
  id: string;
  cells: { [columnKey: string]: string | number | null };
  statusBadge?: {
    text: string;
    variant: 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
  };
}

export interface TableGridData {
  title: string;
  columns: TableColumnMeta[];
  rows: TableRowData[];
  totalRowCount: number;
  currencySymbol?: string;
  summaryRow?: { [columnKey: string]: string };
}

export interface AnalyticalPresentation {
  visualType: VisualFormatType;
  title: string;
  subtitle?: string;
  kpiItems?: KpiMetricItem[];
  chartData?: TrendSeries;
  tableData?: TableGridData;
  suitableViews: VisualFormatType[];
  activeView: VisualFormatType;
  isVisualizationUseful: boolean;
}
