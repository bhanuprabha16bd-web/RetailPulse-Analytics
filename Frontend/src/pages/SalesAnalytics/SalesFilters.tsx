import React from 'react';
import { Paper, Box, ToggleButtonGroup, ToggleButton, TextField, MenuItem, Button } from '@mui/material';

interface SalesFiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
  appliedFilters: any;
  filterOptions: any;
  loading: boolean;
  applyFilters: () => void;
  selectPeriod: (period: string) => void;
}

const SalesFilters: React.FC<SalesFiltersProps> = ({
  filters, setFilters, filterOptions, loading, applyFilters, selectPeriod
}) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup size="small" exclusive onChange={(_, value) => value && selectPeriod(value)}>
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="7">Last 7 Days</ToggleButton>
          <ToggleButton value="30">Last 30 Days</ToggleButton>
          <ToggleButton value="month">This Month</ToggleButton>
          <ToggleButton value="last-month">Last Month</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>
        
        <TextField size="small" label="Start date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
        <TextField size="small" label="End date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
        
        <TextField size="small" select label="Product" sx={{ minWidth: 145 }} value={filters.product_id} onChange={e => setFilters({ ...filters, product_id: e.target.value })}>
          <MenuItem value="">All products</MenuItem>
          {filterOptions.products.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        
        <TextField size="small" select label="Category" sx={{ minWidth: 145 }} value={filters.category_id} onChange={e => setFilters({ ...filters, category_id: e.target.value })}>
          <MenuItem value="">All categories</MenuItem>
          {filterOptions.categories.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        
        <TextField size="small" select label="Customer" sx={{ minWidth: 145 }} value={filters.customer_id} onChange={e => setFilters({ ...filters, customer_id: e.target.value })}>
          <MenuItem value="">All customers</MenuItem>
          {filterOptions.customers.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>)}
        </TextField>
        
        <TextField size="small" select label="Channel" sx={{ minWidth: 150 }} value={filters.sales_channel} onChange={e => setFilters({ ...filters, sales_channel: e.target.value })}>
          <MenuItem value="">All channels</MenuItem>
          <MenuItem value="Retail Store">Retail Store</MenuItem>
          <MenuItem value="Online Store">Online Store</MenuItem>
          <MenuItem value="Marketplace">Marketplace</MenuItem>
        </TextField>
        
        <TextField size="small" select label="Payment" sx={{ minWidth: 145 }} value={filters.payment_method} onChange={e => setFilters({ ...filters, payment_method: e.target.value })}>
          <MenuItem value="">All methods</MenuItem>
          <MenuItem value="Cash">Cash</MenuItem>
          <MenuItem value="Card">Card</MenuItem>
          <MenuItem value="UPI">UPI</MenuItem>
          <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
        </TextField>
        
        <Button variant="contained" onClick={applyFilters} disabled={loading || (!!filters.start_date && !!filters.end_date && filters.start_date > filters.end_date)}>Apply filters</Button>
      </Box>
    </Paper>
  );
};

export default SalesFilters;
