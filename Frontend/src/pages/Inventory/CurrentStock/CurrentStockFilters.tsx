import { Grid, TextField, InputAdornment, MenuItem } from '@mui/material';
import { Search } from '@mui/icons-material';

interface CurrentStockFiltersProps {
  search: string; setSearch: (val: string) => void;
  categoryFilter: string; setCategoryFilter: (val: string) => void;
  brandFilter: string; setBrandFilter: (val: string) => void;
  statusFilter: string; setStatusFilter: (val: string) => void;
  sortBy: string; setSortBy: (val: string) => void;
  categories: any[];
  uniqueBrands: string[];
}

export default function CurrentStockFilters({
  search, setSearch,
  categoryFilter, setCategoryFilter,
  brandFilter, setBrandFilter,
  statusFilter, setStatusFilter,
  sortBy, setSortBy,
  categories, uniqueBrands
}: CurrentStockFiltersProps) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField fullWidth size="small" placeholder="Search by Product Name or SKU" value={search} onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4, md: 2 }}>
        <TextField fullWidth select size="small" label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <MenuItem value="All">All Categories</MenuItem>
          {categories.map(c => <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 4, md: 2 }}>
        <TextField fullWidth select size="small" label="Brand" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
          <MenuItem value="All">All Brands</MenuItem>
          {uniqueBrands.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 4, md: 2 }}>
        <TextField fullWidth select size="small" label="Stock Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <MenuItem value="All">All Statuses</MenuItem>
          <MenuItem value="In Stock">In Stock</MenuItem>
          <MenuItem value="Low Stock">Low Stock</MenuItem>
          <MenuItem value="Out of Stock">Out of Stock</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 12, md: 2 }}>
        <TextField fullWidth select size="small" label="Sort By" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <MenuItem value="Product Name">Product Name</MenuItem>
          <MenuItem value="Current Stock">Current Stock (High-Low)</MenuItem>
          <MenuItem value="Recently Updated">Recently Updated</MenuItem>
        </TextField>
      </Grid>
    </Grid>
  );
}
