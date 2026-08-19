import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, TextField, MenuItem, CircularProgress, Alert, Stack, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Inventory2, Timeline, Add, Dashboard as DashboardIcon } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import InventoryDashboard from './Inventory/InventoryDashboard';
import CurrentStock from './Inventory/CurrentStock';
import StockMovements from './Inventory/StockMovements';
import InventoryForecast from './Inventory/InventoryForecast';

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
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
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

  const processedProducts = useMemo(() => {
    return products.map(p => {
      const available = p.stockQuantity - p.reservedStock;
      const status = getStockStatus(available, p.reorderLevel);
      const cat = categories.find(c => c.id === p.categoryId)?.name || 'Unknown';
      return { ...p, available, statusObj: status, categoryName: cat };
    });
  }, [products, categories]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map(p => p.brand || 'Unbranded'));
    return Array.from(brands);
  }, [products]);



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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
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
          <Tab icon={<Timeline fontSize="small" sx={{ mr: 1 }} />} iconPosition="start" label="Smart Replenishment" />
        </Tabs>

        {/* Dashboard Tab */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <InventoryDashboard products={products} categories={categories} processedProducts={processedProducts} />
          </Box>
        )}

        {/* Current Stock Tab */}
        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <CurrentStock processedProducts={processedProducts} categories={categories} uniqueBrands={uniqueBrands} />
          </Box>
        )}

        {/* Stock Movements Tab */}
        {tab === 2 && (
          <Box sx={{ p: 3 }}>
            <StockMovements movements={movements} />
          </Box>
        )}

        {/* Smart Replenishment Tab */}
        {tab === 3 && (
          <Box sx={{ p: 3 }}>
            <InventoryForecast />
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select label="Adjustment Type *" fullWidth value={adjustForm.type} onChange={(e) => setAdjustForm({...adjustForm, type: e.target.value})}>
                  <MenuItem value="Stock Addition">Stock Addition (+)</MenuItem>
                  <MenuItem value="Stock Removal">Stock Removal (-)</MenuItem>
                  <MenuItem value="Manual Adjustment">Manual Adjustment (=)</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
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
