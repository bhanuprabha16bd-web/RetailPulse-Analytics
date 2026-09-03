import React, { useState } from 'react';
import { Paper, Stack, TextField, Button, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { AuditLogFilters } from '../../api/auditApi';

interface AuditFilterBarProps {
  filters: AuditLogFilters;
  setFilters: React.Dispatch<React.SetStateAction<AuditLogFilters>>;
}

const AuditFilterBar: React.FC<AuditFilterBarProps> = ({ filters, setFilters }) => {
  // Local state for the search bar text so we don't trigger an API request on every single keystroke.
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Generic handler for dropdowns and date pickers. It resets to page 1 whenever a filter changes.
  const handleFilterChange = (field: keyof AuditLogFilters) => (e: SelectChangeEvent | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFilters(prev => ({ ...prev, [field]: e.target.value, page: 1 }));
  };

  // Triggered when user clicks the Search button or hits Enter in the search box
  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: localSearch, page: 1 }));
  };

  // Resets all filters back to their default state
  const clearFilters = () => {
    setLocalSearch('');
    setFilters({ page: 1, limit: 25, sortBy: 'newest' });
  };

  return (
    <Paper sx={{ p: 2 }}>
      {/* Stack provides a responsive flexbox layout (column on mobile, row on desktop) */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
        
        {/* Search Input Field */}
        <TextField
          label="Search description, resource, user..."
          variant="outlined"
          size="small"
          fullWidth
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        
        {/* Action Type Dropdown */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Action</InputLabel>
          <Select value={filters.action || ''} label="Action" onChange={handleFilterChange('action')}>
            <MenuItem value="">All Actions</MenuItem>
            <MenuItem value="CREATE">CREATE</MenuItem>
            <MenuItem value="UPDATE">UPDATE</MenuItem>
            <MenuItem value="DELETE">DELETE</MenuItem>
            <MenuItem value="STOCK_ADJUSTMENT">STOCK ADJUSTMENT</MenuItem>
            <MenuItem value="IMPORT">IMPORT</MenuItem>
            <MenuItem value="User Login">Login</MenuItem>
          </Select>
        </FormControl>

        {/* Status Dropdown */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status || ''} label="Status" onChange={handleFilterChange('status')}>
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="Success">Success</MenuItem>
            <MenuItem value="Failed">Failed</MenuItem>
          </Select>
        </FormControl>
        
        {/* Date Range Pickers */}
        <TextField
          label="Start Date"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.startDate || ''}
          onChange={handleFilterChange('startDate')}
        />
        <TextField
          label="End Date"
          type="date"
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
          value={filters.endDate || ''}
          onChange={handleFilterChange('endDate')}
        />

        {/* Action Buttons */}
        <Button variant="contained" onClick={handleSearch} startIcon={<SearchIcon />}>
          Search
        </Button>
        <Button variant="outlined" color="secondary" onClick={clearFilters} startIcon={<ClearIcon />}>
          Clear
        </Button>
      </Stack>
    </Paper>
  );
};

export default AuditFilterBar;
