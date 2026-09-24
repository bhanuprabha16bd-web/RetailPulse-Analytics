import { Button, Stack } from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';

import type { ReportResponse } from './types';

// Props for the action bar: current report data and callback functions for actions.
interface ReportActionsProps {
  report: ReportResponse | null;
  onGenerate: () => void;
  onExport: (format: 'CSV' | 'PDF') => void;
}

// Shows the action buttons for generating and exporting the report.
export function ReportActions({ report, onGenerate, onExport }: ReportActionsProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      {/* Generates the report based on the current filters. */}
      <Button variant="contained" startIcon={<Refresh />} onClick={onGenerate}>
        Generate Report
      </Button>

      {/* Exports the current report as CSV. Disabled if no report is available. */}
      <Button variant="outlined" startIcon={<Download />} disabled={!report} onClick={() => onExport('CSV')}>
        CSV
      </Button>

      {/* Exports the current report as PDF. Disabled if no report is available. */}
      <Button variant="outlined" startIcon={<Download />} disabled={!report} onClick={() => onExport('PDF')}>
        PDF
      </Button>
    </Stack>
  );
}
