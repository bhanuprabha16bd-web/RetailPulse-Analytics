import React, { useState, useMemo } from 'react';
import { Box, Grid, TextField, InputAdornment, MenuItem, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';
import { Search } from '@mui/icons-material';

interface Props {
  processedProducts: any[];
  categories: any[];
  uniqueBrands: string[];
}

const CurrentStock: React.FC<Props> = ({ processedProducts, categories, uniqueBrands }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Product Name');

  const visibleProducts = useMemo(() => {
    let filtered = processedProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'All' || p.categoryName === categoryFilter;
      const matchBrand = brandFilter === 'All' || (p.brand || 'Unbranded') === brandFilter;
      const matchStatus = statusFilter === 'All' || p.statusObj.label === statusFilter;
      return matchSearch && matchCat && matchBrand && matchStatus;
    });

    if (sortBy === 'Product Name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'Current Stock') filtered.sort((a, b) => b.stockQuantity - a.stockQuantity);
    else if (sortBy === 'Recently Updated') filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return filtered;
  }, [processedProducts, search, categoryFilter, brandFilter, statusFilter, sortBy]);

  return (
    <Box>
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

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell align="right">Current</TableCell>
              <TableCell align="right">Reserved</TableCell>
              <TableCell align="right">Available</TableCell>
              <TableCell align="right">Reorder Lvl</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleProducts.map(p => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell>{p.categoryName}</TableCell>
                <TableCell>{p.brand || '—'}</TableCell>
                <TableCell align="right">{p.stockQuantity}</TableCell>
                <TableCell align="right">{p.reservedStock}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{p.available}</TableCell>
                <TableCell align="right">{p.reorderLevel}</TableCell>
                <TableCell align="center"><Chip label={p.statusObj.label} color={p.statusObj.color} size="small" /></TableCell>
              </TableRow>
            ))}
            {!visibleProducts.length && (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>No products found matching filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CurrentStock;
