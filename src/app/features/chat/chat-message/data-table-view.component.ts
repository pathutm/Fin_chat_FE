import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableGridData, TableRowData, TableColumnMeta } from '../../../core/models/analytics-view.model';

@Component({
  selector: 'app-data-table-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="data-table-card">
      <!-- Table Header & Controls -->
      <div class="data-table-header">
        <div class="table-title-group">
          <div class="table-icon-badge">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </div>
          <span class="table-title">{{ tableData().title }}</span>
          <span class="row-count-badge">{{ filteredRows().length }} records</span>
        </div>

        <div class="table-actions-group">
          <!-- Search input -->
          @if (tableData().rows.length > 4) {
            <div class="table-search-box">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Filter table..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearchChange()"
              />
              @if (searchQuery()) {
                <button class="clear-search-btn" (click)="searchQuery.set('')">✕</button>
              }
            </div>
          }

          <!-- Copy Table Button -->
          <button class="tbl-action-btn" [class.copied]="isCopied()" (click)="copyTableData()" title="Copy as tab-delimited text">
            @if (isCopied()) {
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied</span>
            } @else {
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            }
          </button>

          <!-- Export CSV Button -->
          <button class="tbl-action-btn" (click)="exportCsv()" title="Export CSV file">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>CSV</span>
          </button>
        </div>
      </div>

      <!-- Table Body Container -->
      <div class="table-scroll-wrapper">
        <table class="enterprise-data-table">
          <thead>
            <tr>
              @for (col of tableData().columns; track col.key) {
                <th
                  [class.numeric]="col.align === 'right'"
                  [class.center]="col.align === 'center'"
                  [class.sortable]="col.sortable"
                  (click)="toggleSort(col.key)"
                >
                  <div class="th-content" [class.align-right]="col.align === 'right'">
                    <span>{{ col.label }}</span>
                    @if (sortKey() === col.key) {
                      <span class="sort-indicator">{{ sortAsc() ? '▲' : '▼' }}</span>
                    }
                  </div>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of paginatedRows(); track row.id) {
              <tr class="table-row">
                @for (col of tableData().columns; track col.key) {
                  <td
                    [class.numeric]="col.align === 'right'"
                    [class.center]="col.align === 'center'"
                    [class.font-mono]="col.type === 'currency' || col.type === 'number' || col.type === 'code'"
                  >
                    @if (col.type === 'status' && row.statusBadge) {
                      <span class="status-chip" [class]="row.statusBadge.variant">
                        {{ row.cells[col.key] }}
                      </span>
                    } @else if (col.type === 'currency') {
                      <span class="currency-cell tabular-nums">
                        {{ row.cells[col.key] }}
                      </span>
                    } @else {
                      <span>{{ row.cells[col.key] }}</span>
                    }
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="tableData().columns.length" class="empty-cell">
                  No matching records found.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      @if (totalPages() > 1) {
        <div class="table-pagination-footer">
          <span class="page-info">
            Showing {{ (currentPage() - 1) * pageSize + 1 }}–{{ Math.min(currentPage() * pageSize, filteredRows().length) }} of {{ filteredRows().length }}
          </span>
          <div class="pagination-buttons">
            <button
              class="page-nav-btn"
              [disabled]="currentPage() === 1"
              (click)="goToPage(currentPage() - 1)"
            >
              Previous
            </button>
            <span class="current-page-tag">{{ currentPage() }} / {{ totalPages() }}</span>
            <button
              class="page-nav-btn"
              [disabled]="currentPage() >= totalPages()"
              (click)="goToPage(currentPage() + 1)"
            >
              Next
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .data-table-card {
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-card);
      margin: 14px 0;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .data-table-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      background: var(--secondary-surface);
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
    }

    .table-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .table-icon-badge {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-accent);
    }

    .table-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--foreground);
      letter-spacing: -0.01em;
    }

    .row-count-badge {
      font-size: 0.72rem;
      color: var(--muted-text);
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      padding: 1px 6px;
      border-radius: 10px;
    }

    .table-actions-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .table-search-box {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      padding: 3px 8px;
      border-radius: 4px;
      color: var(--muted-text);

      input {
        border: none;
        outline: none;
        background: transparent;
        font-size: 0.75rem;
        color: var(--foreground);
        width: 110px;

        &::placeholder {
          color: var(--muted-text);
        }
      }

      .clear-search-btn {
        background: none;
        border: none;
        color: var(--muted-text);
        font-size: 0.7rem;
        cursor: pointer;
        padding: 0 2px;
      }
    }

    .tbl-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--muted-text);
      font-size: 0.72rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        color: var(--foreground);
        border-color: oklch(0.8 0.015 260);
      }

      &.copied {
        color: var(--color-success);
        border-color: var(--color-success);
      }
    }

    .table-scroll-wrapper {
      max-height: 420px;
      overflow: auto;
      width: 100%;
    }

    .enterprise-data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.82rem;

      thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--secondary-surface);
        color: var(--text-secondary);
        font-weight: 600;
        font-size: 0.73rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color);
        white-space: nowrap;

        &.sortable {
          cursor: pointer;
          user-select: none;

          &:hover {
            color: var(--foreground);
            background: oklch(0.94 0.008 260);
          }
        }

        &.numeric {
          text-align: right;
        }

        &.center {
          text-align: center;
        }
      }

      .th-content {
        display: inline-flex;
        align-items: center;
        gap: 4px;

        &.align-right {
          justify-content: flex-end;
          width: 100%;
        }
      }

      .sort-indicator {
        font-size: 0.65rem;
        color: var(--primary-accent);
      }

      tbody td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--border-color);
        color: var(--foreground);
        font-size: 0.8rem;
        vertical-align: middle;
        white-space: nowrap;

        &.numeric {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        &.center {
          text-align: center;
        }
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:hover td {
        background: oklch(0.985 0.003 260);
      }
    }

    .empty-cell {
      text-align: center !important;
      padding: 24px !important;
      color: var(--muted-text);
      font-style: italic;
    }

    .status-chip {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: capitalize;

      &.success {
        background: oklch(0.95 0.04 155);
        color: var(--color-success);
        border: 1px solid oklch(0.88 0.06 155);
      }

      &.destructive {
        background: oklch(0.96 0.04 25);
        color: var(--color-destructive);
        border: 1px solid oklch(0.9 0.06 25);
      }

      &.warning {
        background: oklch(0.96 0.05 75);
        color: var(--color-warning);
        border: 1px solid oklch(0.9 0.08 75);
      }

      &.info {
        background: oklch(0.95 0.04 256);
        color: var(--primary-accent);
        border: 1px solid oklch(0.88 0.06 256);
      }

      &.neutral {
        background: var(--secondary-surface);
        color: var(--muted-text);
        border: 1px solid var(--border-color);
      }
    }

    .table-pagination-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--secondary-surface);
      border-top: 1px solid var(--border-color);
      font-size: 0.74rem;
      color: var(--muted-text);
    }

    .pagination-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-nav-btn {
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--card-surface);
      border: 1px solid var(--border-color);
      color: var(--foreground);
      font-size: 0.72rem;
      cursor: pointer;

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        border-color: oklch(0.8 0.015 260);
      }
    }

    .current-page-tag {
      font-weight: 600;
      color: var(--foreground);
      padding: 0 4px;
    }
  `]
})
export class DataTableViewComponent {
  readonly tableData = input.required<TableGridData>();
  readonly searchQuery = signal<string>('');
  readonly sortKey = signal<string | null>(null);
  readonly sortAsc = signal<boolean>(true);
  readonly currentPage = signal<number>(1);
  readonly isCopied = signal<boolean>(false);
  readonly pageSize = 8;
  readonly Math = Math;

  onSearchChange(): void {
    this.currentPage.set(1);
  }

  toggleSort(colKey: string): void {
    if (this.sortKey() === colKey) {
      if (this.sortAsc()) {
        this.sortAsc.set(false);
      } else {
        this.sortKey.set(null);
        this.sortAsc.set(true);
      }
    } else {
      this.sortKey.set(colKey);
      this.sortAsc.set(true);
    }
  }

  readonly filteredRows = computed<TableRowData[]>(() => {
    let rows = this.tableData().rows;
    const q = this.searchQuery().toLowerCase().trim();

    if (q) {
      rows = rows.filter(r =>
        Object.values(r.cells).some(val =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    const sKey = this.sortKey();
    if (sKey) {
      const asc = this.sortAsc();
      rows = [...rows].sort((a, b) => {
        const valA = a.cells[sKey];
        const valB = b.cells[sKey];

        const numA = typeof valA === 'number' ? valA : parseFloat(String(valA).replace(/[$,₹€£¥%]/g, ''));
        const numB = typeof valB === 'number' ? valB : parseFloat(String(valB).replace(/[$,₹€£¥%]/g, ''));

        if (!isNaN(numA) && !isNaN(numB)) {
          return asc ? numA - numB : numB - numA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return asc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return rows;
  });

  readonly totalPages = computed<number>(() => {
    return Math.ceil(this.filteredRows().length / this.pageSize) || 1;
  });

  readonly paginatedRows = computed<TableRowData[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  copyTableData(): void {
    const data = this.tableData();
    const headers = data.columns.map(c => c.label).join('\t');
    const rows = this.filteredRows().map(r =>
      data.columns.map(c => r.cells[c.key] ?? '').join('\t')
    );
    const tsv = [headers, ...rows].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(tsv).then(() => {
        this.setCopied();
      });
    }
  }

  exportCsv(): void {
    const data = this.tableData();
    const escapeCsv = (val: any) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
    };

    const headers = data.columns.map(c => escapeCsv(c.label)).join(',');
    const rows = this.filteredRows().map(r =>
      data.columns.map(c => escapeCsv(r.cells[c.key])).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(data.title || 'financial_records').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private setCopied(): void {
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 1800);
  }
}
