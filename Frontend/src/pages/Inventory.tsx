import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, MenuItem, Chip, CircularProgress, Alert, Stack, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent
} from '@mui/material';
import { Search, Inventory2, Timeline, Add, Dashboard as DashboardIcon } from '@mui/icons-material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Category { id: number; name: string; }
interface Product {
  id: number; name: string; sku: string; brand: string; categoryId: number;
  stockQuantity: number; reservedStock: number; reorderLevel: number; status: boolean; updatedAt: string;
  category?: Category;
}
interface StockMovement {
  id: number; productId: number; movementType: string;
  previousQuantity: number; updatedQuantity: number; quantityChanged: number;
  reason: string; remarks: string; referenceId: string; timestamp: string; 
  product: Product; user?: { id: number; fullName: string; };
}

const Inventory = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filters & Sort
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Product Name');

  // Adjust Modal
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: '', type: 'Stock Addition', quantity: 1, reason: '', remarks: '' });
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, moveRes, catRes] = await Promise.all([
        axiosPrivate.get<Product[]>('/inventory/'),
        axiosPrivate.get<StockMovement[]>('/inventory/movements'),
        axiosPrivate.get<Category[]>('/categories/')
      ]);
      setProducts(prodRes.data);
      setMovements(moveRes.data);
      setCategories(catRes.data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStockStatus = (available: number, reorder: number) => {
    if (available <= 0) return { label: 'Out of Stock', color: 'error' as const };
    if (available <= reorder) return { label: 'Low Stock', color: 'warning' as const };
    return { label: 'In Stock', color: 'success' as const };
  };

  const getMovementColor = (type: string, qty: number) => {
    if (type === 'Sale' || type === 'Stock Removal' || qty < 0) return 'error';
    if (type === 'Stock Addition' || type === 'Return' || qty > 0) return 'success';
    return 'default';
  };

  const processedProducts = useMemo(() => {
    return products.map(p => {
      const available = p.stockQuantity - p.reservedStock;
      const status = getStockStatus(available, p.reorderLevel);
      const cat = categories.find(c => c.id === p.categoryId)?.name || 'Unknown';
      return { ...p, available, statusObj: status, categoryName: cat };
    });
  }, [products, categories]);

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

  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map(p => p.brand || 'Unbranded'));
    return Array.from(brands);
  }, [products]);

  // Dashboard Stats
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const lowStockCount = processedProducts.filter(p => p.statusObj.label === 'Low Stock').length;
  const outOfStockCount = processedProducts.filter(p => p.statusObj.label === 'Out of Stock').length;

  const statusChartData = [
    { name: 'In Stock', value: totalProducts - lowStockCount - outOfStockCount, color: '#2e7d32' },
    { name: 'Low Stock', value: lowStockCount, color: '#ed6c02' },
    { name: 'Out of Stock', value: outOfStockCount, color: '#d32f2f' }
  ].filter(d => d.value > 0);

  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    processedProducts.forEach(p => {
      map.set(p.categoryName, (map.get(p.categoryName) || 0) + p.stockQuantity);
    });
    return Array.from(map.entries()).map(([name, quantity]) => ({ name, quantity }));
  }, [processedProducts]);

  const handleAdjustSubmit = async () => {
    if (!adjustForm.productId || adjustForm.quantity <= 0 || !adjustForm.reason) {
      setAdjustError('Please fill in all required fields (Product, positive Quantity, and Reason).');
      return;
    }
    const selectedProd = processedProducts.find(p => p.id.toString() === adjustForm.productId);
    if (selectedProd && adjustForm.type === 'Stock Removal' && adjustForm.quantity > selectedProd.available) {
      setAdjustError(`Cannot remove more than the available stock (${selectedProd.available}).`);
      return;
    }

    setSubmitting(true);
    try {
      await axiosPrivate.post('/inventory/adjust', {
        productId: parseInt(adjustForm.productId),
        adjustmentType: adjustForm.type,
        quantity: adjustForm.quantity,
        reason: adjustForm.reason,
        remarks: adjustForm.remarks
      });
      setAdjustOpen(false);
      setAdjustForm({ productId: '', type: 'Stock Addition', quantity: 1, reason: '', remarks: '' });
      loadData();
    } catch (err: any) {
      setAdjustError(err.response?.data?.detail || 'Failed to adjust stock');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Inventory Management</Typography>
          <Typography color="text.secondary">Monitor current stock levels, view dashboards, and manage stock.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAdjustOpen(true)}>
          Adjust Stock
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<DashboardIcon fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Dashboard" />
          <Tab icon={<Inventory2 fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Current Stock" />
          <Tab icon={<Timeline fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Stock Movements" />
        </Tabs>

        {/* Dashboard Tab */}
        {tab === 0 && (
          <Box p={3}>
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                  <CardContent>
                    <Typography variant="subtitle2" opacity={0.8}>Total Products</Typography>
                    <Typography variant="h3">{totalProducts}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText' }}>
                  <CardContent>
                    <Typography variant="subtitle2" opacity={0.8}>Total Quantity</Typography>
                    <Typography variant="h3">{totalQuantity}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                  <CardContent>
                    <Typography variant="subtitle2" opacity={0.8}>Low Stock Products</Typography>
                    <Typography variant="h3">{lowStockCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: 'error.main', color: 'error.contrastText' }}>
                  <CardContent>
                    <Typography variant="subtitle2" opacity={0.8}>Out of Stock</Typography>
                    <Typography variant="h3">{outOfStockCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: 350 }}>
                  <Typography variant="h6" mb={2} align="center">Stock Status Distribution</Typography>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: 350 }}>
                  <Typography variant="h6" mb={2} align="center">Inventory by Category</Typography>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="quantity" fill="#1976d2" name="Total Quantity" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Current Stock Tab */}
        {tab === 1 && (
          <Box p={3}>
            <Grid container spacing={2} mb={3}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" placeholder="Search by Product Name or SKU" value={search} onChange={(e) => setSearch(e.target.value)}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} />
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <TextField fullWidth select size="small" label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <MenuItem value="All">All Categories</MenuItem>
                  {categories.map(c => <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <TextField fullWidth select size="small" label="Brand" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
                  <MenuItem value="All">All Brands</MenuItem>
                  {uniqueBrands.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <TextField fullWidth select size="small" label="Stock Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="All">All Statuses</MenuItem>
                  <MenuItem value="In Stock">In Stock</MenuItem>
                  <MenuItem value="Low Stock">Low Stock</MenuItem>
                  <MenuItem value="Out of Stock">Out of Stock</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={12} md={2}>
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
        )}

        {/* Stock Movements Tab */}
        {tab === 2 && (
          <Box p={3}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Movement Type</TableCell>
                    <TableCell align="right">Prev Qty</TableCell>
                    <TableCell align="right">Updated Qty</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Adjusted By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.map(m => (
                    <TableRow key={m.id} hover>
                      <TableCell>{new Date(m.timestamp).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{m.product?.name || `Product ID ${m.productId}`}</TableCell>
                      <TableCell><Chip label={m.movementType} size="small" variant="outlined" color={getMovementColor(m.movementType, m.quantityChanged)} /></TableCell>
                      <TableCell align="right">{m.previousQuantity ?? '—'}</TableCell>
                      <TableCell align="right">{m.updatedQuantity ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ color: m.quantityChanged > 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                        {m.quantityChanged > 0 ? '+' : ''}{m.quantityChanged}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{m.reason || m.referenceId || '—'}</Typography>
                        {m.remarks && <Typography variant="caption" color="text.secondary">{m.remarks}</Typography>}
                      </TableCell>
                      <TableCell>{m.user?.fullName || 'System'}</TableCell>
                    </TableRow>
                  ))}
                  {!movements.length && (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>No stock movements recorded yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Stock</DialogTitle>
        <DialogContent dividers>
          {adjustError && <Alert severity="error" sx={{ mb: 2 }}>{adjustError}</Alert>}
          <Stack spacing={2}>
            <TextField select label="Product *" fullWidth value={adjustForm.productId} onChange={(e) => setAdjustForm({...adjustForm, productId: e.target.value})}>
              {processedProducts.map(p => <MenuItem key={p.id} value={p.id}>{p.name} (Available: {p.available})</MenuItem>)}
            </TextField>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField select label="Adjustment Type *" fullWidth value={adjustForm.type} onChange={(e) => setAdjustForm({...adjustForm, type: e.target.value})}>
                  <MenuItem value="Stock Addition">Stock Addition (+)</MenuItem>
                  <MenuItem value="Stock Removal">Stock Removal (-)</MenuItem>
                  <MenuItem value="Manual Adjustment">Manual Adjustment (=)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField type="number" label={adjustForm.type === 'Manual Adjustment' ? "New Quantity *" : "Quantity *"} fullWidth value={adjustForm.quantity} onChange={(e) => setAdjustForm({...adjustForm, quantity: parseInt(e.target.value) || 0})} />
              </Grid>
            </Grid>
            <TextField label="Reason *" fullWidth value={adjustForm.reason} onChange={(e) => setAdjustForm({...adjustForm, reason: e.target.value})} placeholder="e.g. Damage, Audit Discrepancy" />
            <TextField label="Remarks (Optional)" fullWidth multiline rows={2} value={adjustForm.remarks} onChange={(e) => setAdjustForm({...adjustForm, remarks: e.target.value})} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdjustSubmit} disabled={submitting}>Submit Adjustment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory;
