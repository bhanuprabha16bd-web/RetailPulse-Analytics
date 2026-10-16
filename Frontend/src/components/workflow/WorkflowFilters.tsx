import React from 'react';
import { Paper, TextField, Select, MenuItem, InputLabel, FormControl, Button, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

interface FilterState {
  search: string;
  request_type: string;
  status: string;
  priority: string;
}

interface WorkflowFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onSearch: () => void;
  onReset?: () => void;
  hideStatus?: boolean;
}

const WorkflowFilters: React.FC<WorkflowFiltersProps> = ({ filters, onFilterChange, onSearch, onReset, hideStatus }) => {
  const handleChange = (field: keyof FilterState) => (event: any) => {
    onFilterChange({ ...filters, [field]: event.target.value });
  };

  const handleReset = () => {
    const empty = { search: '', request_type: '', status: '', priority: '' };
    onFilterChange(empty);
    if (onReset) onReset();
  };

  return (
    <Paper sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }} elevation={0}>
      <TextField
        size="small"
        placeholder="Search requests..."
        value={filters.search}
        onChange={handleChange('search')}
        sx={{ minWidth: 180, flexGrow: 1 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }
        }}
      />

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>Request Type</InputLabel>
        <Select value={filters.request_type} label="Request Type" onChange={handleChange('request_type')}>
          <MenuItem value="">All Types</MenuItem>
          <MenuItem value="Product Price Change">Product Price Change</MenuItem>
          <MenuItem value="Stock Adjustment">Stock Adjustment</MenuItem>
          <MenuItem value="Product Deactivation">Product Deactivation</MenuItem>
          <MenuItem value="Customer Information Change">Customer Information Change</MenuItem>
          <MenuItem value="Inventory Import Approval">Inventory Import Approval</MenuItem>
        </Select>
      </FormControl>

      {!hideStatus && (
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={filters.status} label="Status" onChange={handleChange('status')}>
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Pending Approval">Pending Approval</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Rejected">Rejected</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      )}

      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel>Priority</InputLabel>
        <Select value={filters.priority} label="Priority" onChange={handleChange('priority')}>
          <MenuItem value="">All Priorities</MenuItem>
          <MenuItem value="Low">Low</MenuItem>
          <MenuItem value="Medium">Medium</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Critical">Critical</MenuItem>
        </Select>
      </FormControl>

      <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={handleReset}>
        Reset
      </Button>
      <Button variant="contained" onClick={onSearch}>
        Search
      </Button>
    </Paper>
  );
};

export default WorkflowFilters;
