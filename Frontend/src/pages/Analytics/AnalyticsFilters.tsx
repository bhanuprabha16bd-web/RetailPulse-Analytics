import React from 'react';
import { Box, Typography, Paper, TextField, MenuItem, Button } from '@mui/material';

interface AnalyticsFiltersProps {
  filters: any;
  categories: any[];
  brands: string[];
  loading: boolean;
  onFilterChange: (field: string, value: string) => void;
  onApplyFilters: () => void;
}

const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  filters, categories, brands, loading, onFilterChange, onApplyFilters
}) => {
  return (
    <Paper className="no-print" sx={{ p: 2, mb: 4 }} variant="outlined">
      <Typography variant="subtitle2" mb={2} color="text.secondary">Global Filters</Typography>
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
        <TextField sx={{ minWidth: 180, flexGrow: 1 }} type={filters.start_date ? 'date' : 'text'} onFocus={(e) => e.target.type = 'date'} onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} size="small" label="Start Date" value={filters.start_date} onChange={e => onFilterChange('start_date', e.target.value)} />
        <TextField sx={{ minWidth: 180, flexGrow: 1 }} type={filters.end_date ? 'date' : 'text'} onFocus={(e) => e.target.type = 'date'} onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} size="small" label="End Date" value={filters.end_date} onChange={e => onFilterChange('end_date', e.target.value)} />
        <TextField sx={{ minWidth: 140, flexGrow: 1 }} select size="small" label="Category" value={filters.category_id} onChange={e => onFilterChange('category_id', e.target.value)}>
          <MenuItem value="">All</MenuItem>
          {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <TextField sx={{ minWidth: 140, flexGrow: 1 }} select size="small" label="Brand" value={filters.brand} onChange={e => onFilterChange('brand', e.target.value)}>
          <MenuItem value="">All</MenuItem>
          {brands.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
        </TextField>
        <TextField sx={{ minWidth: 140, flexGrow: 1 }} select size="small" label="Channel" value={filters.sales_channel} onChange={e => onFilterChange('sales_channel', e.target.value)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Retail Store">Retail Store</MenuItem>
          <MenuItem value="Online">Online</MenuItem>
          <MenuItem value="Wholesale">Wholesale</MenuItem>
        </TextField>
        <TextField sx={{ minWidth: 140, flexGrow: 1 }} select size="small" label="Payment" value={filters.payment_method} onChange={e => onFilterChange('payment_method', e.target.value)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Cash">Cash</MenuItem>
          <MenuItem value="Credit Card">Credit Card</MenuItem>
          <MenuItem value="Mobile Payment">Mobile</MenuItem>
        </TextField>
        <Button sx={{ minWidth: 140, height: 40 }} variant="contained" onClick={onApplyFilters} disabled={loading}>Apply Filters</Button>
      </Box>
    </Paper>
  );
};

export default AnalyticsFilters;
