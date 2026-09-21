import { ReportActions } from './ReportActions';
import { ReportFilters } from './ReportFilters';
import { ReportSummary } from './ReportSummary';
import { ReportTable } from './ReportTable';
import type { Filters, ReportResponse } from './types';

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
      <ReportFilters
        reportType={reportType}
        filters={filters}
        onReportTypeChange={onReportTypeChange}
        onFilterChange={onFilterChange}
      />

      <ReportActions report={report} onGenerate={onGenerate} onExport={onExport} />

      <ReportSummary report={report} />

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
