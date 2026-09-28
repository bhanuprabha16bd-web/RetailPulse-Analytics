import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { IssueFilters } from '../../api/dataQualityApi';

interface DataQualityFiltersProps {
  filters: IssueFilters;
  onFilterChange: (key: keyof IssueFilters, value: any) => void;
}

const DataQualityFilters: React.FC<DataQualityFiltersProps> = ({ filters, onFilterChange }) => {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Issue Type</InputLabel>
        <Select
          value={filters.issueType || ''}
          label="Issue Type"
          onChange={(e) => onFilterChange('issueType', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Stock Mismatch">Stock Mismatch</MenuItem>
          <MenuItem value="Invalid Product Ref">Invalid Product Ref</MenuItem>
          <MenuItem value="Invalid Customer Ref">Invalid Customer Ref</MenuItem>
          <MenuItem value="Duplicate SKU">Duplicate SKU</MenuItem>
          <MenuItem value="Missing Information">Missing Information</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Severity</InputLabel>
        <Select
          value={filters.severity || ''}
          label="Severity"
          onChange={(e) => onFilterChange('severity', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Critical">Critical</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Module</InputLabel>
        <Select
          value={filters.module || ''}
          label="Module"
          onChange={(e) => onFilterChange('module', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Inventory">Inventory</MenuItem>
          <MenuItem value="Sales">Sales</MenuItem>
          <MenuItem value="Products">Products</MenuItem>
          <MenuItem value="Customers">Customers</MenuItem>
          <MenuItem value="Reports">Reports</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Status</InputLabel>
        <Select
          value={filters.status || ''}
          label="Status"
          onChange={(e) => onFilterChange('status', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Open">Open</MenuItem>
          <MenuItem value="Investigating">Investigating</MenuItem>
          <MenuItem value="Resolved">Resolved</MenuItem>
          <MenuItem value="Ignored">Ignored</MenuItem>
        </Select>
      </FormControl>
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          type="date"
          size="small"
          label="Start Date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.startDate || ''}
          onChange={(e) => onFilterChange('startDate', e.target.value)}
        />
        <TextField
          type="date"
          size="small"
          label="End Date"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.endDate || ''}
          onChange={(e) => onFilterChange('endDate', e.target.value)}
        />
      </Box>
    </Box>
  );
};

export default DataQualityFilters;
