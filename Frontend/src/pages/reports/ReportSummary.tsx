import { Typography } from '@mui/material';

import type { ReportResponse } from './types';
import { humanize } from './utils';

// Props for the summary text: the generated report data.
interface ReportSummaryProps {
  report: ReportResponse | null;
}

// Shows a short description of the report, including the report name, total records, and applied filters.
export function ReportSummary({ report }: ReportSummaryProps) {
  if (!report) return null;

  return (
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      Generated {report.report_name} with {report.total} matching records. Applied filters:{' '}
      {Object.keys(report.filters).length
        ? Object.entries(report.filters)
            .map(([key, value]) => `${humanize(key)}=${value}`)
            .join(', ')
        : 'None'}
    </Typography>
  );
}
