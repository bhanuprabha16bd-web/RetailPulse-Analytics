import { Box, TextField, InputAdornment, MenuItem } from '@mui/material';
import { Search } from '@mui/icons-material';

interface CustomersListFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  segment: string;
  setSegment: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  segmentColors: Record<string, any>;
}

export default function CustomersListFilters({
  search, setSearch, segment, setSegment, status, setStatus, segmentColors
}: CustomersListFiltersProps) {
  return (
    <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
      <TextField 
        size="small" 
        placeholder="Search by name or email" 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} 
      />
      <TextField 
        select 
        size="small" 
        label="Customer segment" 
        value={segment} 
        onChange={e => setSegment(e.target.value)}
      >
        <MenuItem value="">All segments</MenuItem>
        {Object.keys(segmentColors).map(x => <MenuItem key={x} value={x}>{x.replace(' Customer', '')}</MenuItem>)}
      </TextField>
      <TextField 
        select 
        size="small" 
        label="Status" 
        value={status} 
        onChange={e => setStatus(e.target.value)}
      >
        <MenuItem value="">All statuses</MenuItem>
        <MenuItem value="Active">Active</MenuItem>
        <MenuItem value="Inactive">Inactive</MenuItem>
      </TextField>
    </Box>
  );
}
