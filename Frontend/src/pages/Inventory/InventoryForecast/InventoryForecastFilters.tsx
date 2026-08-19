import { Card, CardContent, Stack, TextField, MenuItem, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';

interface InventoryForecastFiltersProps {
  categories: any[];
  suppliers: string[];
  filterOptions: any[];
  categoryFilter: string; setCategoryFilter: (val: string) => void;
  supplierFilter: string; setSupplierFilter: (val: string) => void;
  productFilter: string; setProductFilter: (val: string) => void;
  riskFilter: string; setRiskFilter: (val: string) => void;
  reorderFilter: string; setReorderFilter: (val: string) => void;
  sortBy: string; setSortBy: (val: string) => void;
  search: string; setSearch: (val: string) => void;
  setPage: (val: number) => void;
}

export default function InventoryForecastFilters({
  categories, suppliers, filterOptions,
  categoryFilter, setCategoryFilter,
  supplierFilter, setSupplierFilter,
  productFilter, setProductFilter,
  riskFilter, setRiskFilter,
  reorderFilter, setReorderFilter,
  sortBy, setSortBy,
  search, setSearch, setPage
}: InventoryForecastFiltersProps) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography sx={{ mb: 1.5, fontWeight: 800 }}>Filters & Sorting</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <TextField select size="small" label="Category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((row: any) => <MenuItem key={row.categoryId} value={String(row.categoryId)}>{row.categoryName}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Supplier" value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">All Suppliers</MenuItem>
            {suppliers.map((supplier: string) => <MenuItem key={supplier} value={supplier}>{supplier}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Product" value={productFilter} onChange={e => setProductFilter(e.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="">All Products</MenuItem>
            {filterOptions.map((row: any) => <MenuItem key={row.productId} value={String(row.productId)}>{row.productName}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Risk Level" value={riskFilter} onChange={e => setRiskFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">All Risks</MenuItem>
            <MenuItem value="Out of Stock">Out of Stock</MenuItem>
            <MenuItem value="Stockout Risk">Stockout Risk</MenuItem>
            <MenuItem value="Low Stock">Low Stock</MenuItem>
            <MenuItem value="Overstock">Overstock</MenuItem>
            <MenuItem value="Healthy">Healthy</MenuItem>
          </TextField>
          <TextField select size="small" label="Reorder Status" value={reorderFilter} onChange={e => setReorderFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="true">Reorder Required</MenuItem>
            <MenuItem value="false">No Action</MenuItem>
          </TextField>
          <TextField select size="small" label="Sort By" value={sortBy} onChange={e => setSortBy(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="stock_risk">Risk Level</MenuItem>
            <MenuItem value="current_stock">Current Stock</MenuItem>
            <MenuItem value="forecasted_demand">Forecasted Demand</MenuItem>
            <MenuItem value="days_remaining">Days Remaining</MenuItem>
            <MenuItem value="recommended_quantity">Recommended Qty</MenuItem>
          </TextField>
          <TextField size="small" label="Search product or SKU" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} sx={{ minWidth: 210 }} slotProps={{ input: { endAdornment: <Search fontSize="small" color="action" /> } }} />
        </Stack>
      </CardContent>
    </Card>
  );
}
