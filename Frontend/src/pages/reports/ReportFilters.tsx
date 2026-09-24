import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
} from '@mui/material';

import { reportTypes, type Filters } from './types';

// Props for the filter panel: selected report type, current filter values, and change handlers.
interface ReportFiltersProps {
  reportType: string;
  filters: Filters;
  onReportTypeChange: (value: string) => void;
  onFilterChange: (key: keyof Filters, value: string) => void;
}

// This component lets the user choose the report type and the conditions used to generate the report.
export function ReportFilters({
  reportType,
  filters,
  onReportTypeChange,
  onFilterChange,
}: ReportFiltersProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, flexWrap: 'wrap' }}>
        {/* Choose which report to generate. */}
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Report type</InputLabel>
          <Select value={reportType} label="Report type" onChange={(event) => onReportTypeChange(event.target.value)}>
            {reportTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Date range filter for the report. */}
        <TextField
          size="small"
          type="date"
          label="From"
          value={filters.start_date}
          onChange={(event) => onFilterChange('start_date', event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          size="small"
          type="date"
          label="To"
          value={filters.end_date}
          onChange={(event) => onFilterChange('end_date', event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        {/* Filters for product, category, brand, and customer. */}
        <TextField
          size="small"
          label="Product ID"
          value={filters.product_id}
          onChange={(event) => onFilterChange('product_id', event.target.value)}
        />

        <TextField
          size="small"
          label="Category ID"
          value={filters.category_id}
          onChange={(event) => onFilterChange('category_id', event.target.value)}
        />

        <TextField
          size="small"
          label="Brand"
          value={filters.brand}
          onChange={(event) => onFilterChange('brand', event.target.value)}
        />

        <TextField
          size="small"
          label="Customer ID"
          value={filters.customer_id}
          onChange={(event) => onFilterChange('customer_id', event.target.value)}
        />

        {/* Sales condition filter, such as Paid or Pending. */}
        <FormControl size="small" sx={{ minWidth: 145 }}>
          <InputLabel>Sales status</InputLabel>
          <Select value={filters.sales_status} label="Sales status" onChange={(event) => onFilterChange('sales_status', event.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['Paid', 'Pending', 'Overdue'].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Inventory condition filter, such as In Stock or Low Stock. */}
        <FormControl size="small" sx={{ minWidth: 145 }}>
          <InputLabel>Stock status</InputLabel>
          <Select value={filters.stock_status} label="Stock status" onChange={(event) => onFilterChange('stock_status', event.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['In Stock', 'Low Stock', 'Out of Stock'].map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Paper>
  );
}
