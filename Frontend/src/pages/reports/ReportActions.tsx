import { Button, Stack } from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';

import type { ReportResponse } from './types';

interface ReportActionsProps {
  report: ReportResponse | null;
  onGenerate: () => void;
  onExport: (format: 'CSV' | 'PDF') => void;
}

export function ReportActions({ report, onGenerate, onExport }: ReportActionsProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
      <Button variant="contained" startIcon={<Refresh />} onClick={onGenerate}>
        Generate Report
      </Button>
      <Button variant="outlined" startIcon={<Download />} disabled={!report} onClick={() => onExport('CSV')}>
        CSV
      </Button>
      <Button variant="outlined" startIcon={<Download />} disabled={!report} onClick={() => onExport('PDF')}>
        PDF
      </Button>
    </Stack>
  );
}
