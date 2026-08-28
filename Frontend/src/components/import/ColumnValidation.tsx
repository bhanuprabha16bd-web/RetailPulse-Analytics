import { Box, Typography, Paper, Chip, List } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';

interface ColumnValidationProps {
  importType: string;
}

export default function ColumnValidation({ importType }: ColumnValidationProps) {
  const getRequiredColumns = () => {
    if (importType === 'Products') return ['Product Name', 'SKU', 'Category', 'Unit Price', 'Stock Quantity'];
    if (importType === 'Customers') return ['Name', 'Email/Phone'];
    if (importType === 'Sales') return ['Product SKU', 'Quantity'];
    return [];
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>Column Validation</Typography>
      <Chip label="All required columns are present" color="success" size="small" sx={{ mb: 2, width: '100%', bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }} />
      <Typography variant="subtitle2" gutterBottom>Required Columns ({importType})</Typography>
      <List sx={{ pt: 0 }}>
        {getRequiredColumns().map((col) => (
          <Box key={col} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="body2">{col}</Typography>
          </Box>
        ))}
      </List>
      <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f7ff', borderRadius: 1, display: 'flex', alignItems: 'center' }}>
        <ErrorIcon color="info" sx={{ fontSize: 20, mr: 1 }} />
        <Typography variant="caption" color="info.main">The CSV file has all required columns.</Typography>
      </Box>
    </Paper>
  );
}
