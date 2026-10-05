import React from 'react';
import { Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Box } from '@mui/material';

interface CSVPreviewProps {
  columns: string[];
  previewData: Record<string, string>[];
}

export const CSVPreview: React.FC<CSVPreviewProps> = ({ columns, previewData }) => {
  if (!previewData || previewData.length === 0) return null;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" gutterBottom>File Preview (First 5 rows)</Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col, idx) => (
                <TableCell key={idx}><b>{col}</b></TableCell>
              ))}
              <TableCell><b>Status</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {previewData.slice(0, 5).map((row, idx) => (
              <TableRow key={idx}>
                {columns.map((col, cIdx) => (
                  <TableCell key={cIdx}>{row[col] || '-'}</TableCell>
                ))}
                <TableCell>
                  <Chip size="small" label="Valid" color="success" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
