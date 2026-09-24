import {
  Box, Typography, Paper, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { ImportPreviewResponse } from '../../api/importApi';

// Props: previewData contains columns, sample rows, and total row count from the parsed CSV
interface CSVPreviewProps {
  previewData: ImportPreviewResponse;
}

export default function CSVPreview({ previewData }: CSVPreviewProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>

      {/* Header row: title with validation badge on the left, total record count on the right */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>CSV Preview</Typography>
          {/* Green chip indicating the uploaded file passed validation */}
          <Chip label="File validated successfully" color="success" size="small" variant="filled" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }} />
        </Box>
        {/* Displays total number of records found in the CSV */}
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          Total Records: <Chip label={previewData.totalRows} size="small" sx={{ fontWeight: 'bold' }} />
        </Typography>
      </Box>

      {/* Scrollable table container — displays up to the first 6 columns to avoid overflow */}
      <TableContainer sx={{ maxHeight: 250, border: '1px solid #eee', borderRadius: 1 }}>
        <Table size="small" stickyHeader>

          {/* Table header — renders the first 6 column names from the CSV */}
          <TableHead>
            <TableRow>
              {previewData.columns.slice(0, 6).map((col, idx) => (
                <TableCell key={idx} sx={{ fontWeight: 'bold', bgcolor: '#f9fafb' }}>{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* Table body — renders each preview row, limited to the first 6 columns */}
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

      {/* Footer note — clarifies that only a subset of rows is shown; full import includes all records */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing first {previewData.previewData.length} rows. Import will include all {previewData.totalRows} records.
      </Typography>
    </Paper>
  );
}
