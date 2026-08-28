import {
  Box, Typography, Paper, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { ImportPreviewResponse } from '../../api/importApi';

interface CSVPreviewProps {
  previewData: ImportPreviewResponse;
}

export default function CSVPreview({ previewData }: CSVPreviewProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>CSV Preview</Typography>
          <Chip label="File validated successfully" color="success" size="small" variant="filled" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          Total Records: <Chip label={previewData.totalRows} size="small" sx={{ fontWeight: 'bold' }} />
        </Typography>
      </Box>
      <TableContainer sx={{ maxHeight: 250, border: '1px solid #eee', borderRadius: 1 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {previewData.columns.slice(0, 6).map((col, idx) => (
                <TableCell key={idx} sx={{ fontWeight: 'bold', bgcolor: '#f9fafb' }}>{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {previewData.previewData.map((row, idx) => (
              <TableRow key={idx}>
                {previewData.columns.slice(0, 6).map((col, cidx) => (
                  <TableCell key={cidx}>{row[col]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing first {previewData.previewData.length} rows. Import will include all {previewData.totalRows} records.
      </Typography>
    </Paper>
  );
}
