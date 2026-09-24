import { ReportActions } from './ReportActions';
import { ReportFilters } from './ReportFilters';
import { ReportSummary } from './ReportSummary';
import { ReportTable } from './ReportTable';
import type { Filters, ReportResponse } from './types';

// Props required by the report tab to manage report filters, data, and actions.
interface GenerateReportTabProps {
  reportType: string;
  filters: Filters;
  report: ReportResponse | null;
  loading: boolean;
  page: number;
  sortBy: string;
  sortOrder: string;
  onReportTypeChange: (value: string) => void;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onGenerate: () => void;
  onExport: (format: 'CSV' | 'PDF') => void;
  onSort: (key: string) => void;
  onPageChange: (nextPage: number) => void;
}

// Main report screen: combines filter form, action buttons, summary, and table.
export function GenerateReportTab({
  reportType,
  filters,
  report,
  loading,
  page,
  sortBy,
  sortOrder,
  onReportTypeChange,
  onFilterChange,
  onGenerate,
  onExport,
  onSort,
  onPageChange,
}: GenerateReportTabProps) {
  return (
    <>
      {/* User can choose report type and filter values before generating results. */}
      <ReportFilters
        reportType={reportType}
        filters={filters}
        onReportTypeChange={onReportTypeChange}
        onFilterChange={onFilterChange}
      />

      {/* Buttons to generate the report and export it in CSV/PDF format. */}
      <ReportActions report={report} onGenerate={onGenerate} onExport={onExport} />

      {/* Shows quick summary information for the generated report. */}
      <ReportSummary report={report} />

      {/* Displays report data with loading state, sorting, and pagination. */}
      <ReportTable
        report={report}
        loading={loading}
        page={page}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
        onPageChange={onPageChange}
      />
    </>
  );
}
