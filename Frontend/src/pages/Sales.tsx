import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography, Grid
} from '@mui/material';
import { Add, DeleteOutlined, Search, VisibilityOutlined } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Store { id: number; name: string; isActive: boolean }
interface CustomerOption { id: number; fullName: string; customerId: string; status: string }
interface Product { id: number; name: string; categoryId: number; unitPrice: number; status: boolean; stockQuantity: number }
interface SaleItem {
  id: number; saleId: number; productId: number; categoryId: number;
  quantity: number; unitPrice: number; discount: number; tax: number; total: number;
  product: { name: string } | null;
  category: { name: string } | null;
}
interface Sale {
  id: number; invoiceNumber: string; storeId: number; customerName: string | null;
  totalAmount: number; salesChannel: string; paymentMethod: string; createdAt: string;
  store: { name: string } | null;
  items: SaleItem[];
}

interface SaleItemForm {
  id: string; // temp id for UI
  productId: string; quantity: string; unitPrice: string; discount: string; tax: string;
}

interface SaleForm {
  storeId: string; customerId: string; customerName: string; salesChannel: string; paymentMethod: string;
  items: SaleItemForm[];
}

const emptyItemForm = (): SaleItemForm => ({
  id: Math.random().toString(36).substr(2, 9),
  productId: '', quantity: '1', unitPrice: '', discount: '0', tax: '0'
});

const emptyForm: SaleForm = {
  storeId: '', customerId: '', customerName: '', salesChannel: 'Retail Store', paymentMethod: 'Cash',
  items: [emptyItemForm()]
};

const manageRoles = ['Super Admin', 'Company Owner', 'Company Admin', 'Analyst'];
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [form, setForm] = useState<SaleForm>(emptyForm);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      axiosPrivate.get<Sale[]>('/sales/'),
      axiosPrivate.get<Store[]>('/stores/'),
      axiosPrivate.get<Product[]>('/products/'),
      axiosPrivate.get<CustomerOption[]>('/customers/')
    ])
      .then(([salesRes, storesRes, productsRes, customersRes]) => {
        setSales(salesRes.data);
        setStores(storesRes.data);
        setProducts(productsRes.data);
        setCustomers(customersRes.data);
        setError(null);
      })
      .catch((err) => setError(err.response?.data?.detail || 'Unable to load sales data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (manageRoles.includes(user?.role ?? '')) loadData();
  }, [user?.role]);

  const visibleSales = useMemo(() => {
    const query = search.toLowerCase().trim();
    let filtered = sales.filter((sale) => 
      !query || 
      sale.invoiceNumber.toLowerCase().includes(query) || 
      (sale.customerName && sale.customerName.toLowerCase().includes(query)) ||
      sale.items.some(item => item.product?.name.toLowerCase().includes(query))
    );
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  }, [sales, search]);

  const openCreate = () => {
    setForm({
      ...emptyForm,
      storeId: String(stores.find(s => s.isActive)?.id ?? ''),
      customerId: '',
      items: [{
        ...emptyItemForm(),
        productId: String(products.find(p => p.status && p.stockQuantity > 0)?.id ?? '')
      }]
    });
    setDialogOpen(true);
  };

  const handleItemChange = (id: string, field: keyof SaleItemForm, value: string) => {
    setForm(prev => {
      const newItems = prev.items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'productId') {
            const product = products.find(p => p.id === Number(value));
            if (product) updated.unitPrice = String(product.unitPrice);
          }
          return updated;
        }
        return item;
      });
      return { ...prev, items: newItems };
    });
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItemForm(), productId: String(products.find(p => p.status && p.stockQuantity > 0)?.id ?? '') }]
    }));
  };

  const removeItem = (id: string) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(item => item.id !== id) }));
  };

  const save = async () => {
    if (!form.storeId) { setError('Store is required.'); return; }
    if (form.items.length === 0) { setError('Add at least one product.'); return; }
    
    for (const item of form.items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        setError('Complete all product item fields.'); return;
      }
    }
    
    setSaving(true);
    try {
      const payload = {
        storeId: Number(form.storeId),
        customerId: form.customerId ? Number(form.customerId) : null,
        customerName: form.customerName.trim() || null,
        salesChannel: form.salesChannel,
        paymentMethod: form.paymentMethod,
        items: form.items.map(i => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          discount: Number(i.discount),
          tax: Number(i.tax)
        }))
      };

      await axiosPrivate.post('/sales/', payload);
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to save sale.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSale = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await axiosPrivate.delete(`/sales/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to delete sale.');
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const calculatedTotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const d = Number(item.discount) || 0;
      const t = Number(item.tax) || 0;
      return sum + Math.max(0, (q * p) - d + t);
    }, 0);
  }, [form.items]);

  if (!manageRoles.includes(user?.role ?? '')) {
    return <Alert severity="error">Sales management is available to Company Admins and Analysts only.</Alert>;
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>Sales Management</Typography>
          <Typography color="text.secondary">Record and manage multi-item invoices.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Create Invoice</Button>
      </Stack>
      
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField size="small" label="Search invoice, customer, product" value={search} onChange={(e) => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ minWidth: { xs: '100%', md: 300 } }} />
        </Stack>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Channel</TableCell>
                  <TableCell align="right">Items</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleSales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{sale.invoiceNumber}</TableCell>
                    <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.customerName || '—'}</TableCell>
                    <TableCell>{sale.salesChannel}</TableCell>
                    <TableCell align="right">{sale.items.length}</TableCell>
                    <TableCell align="right">{currency.format(sale.totalAmount)}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => setDetail(sale)}><VisibilityOutlined fontSize="small" /></IconButton>
                      <IconButton color="error" onClick={() => setDeleteTarget(sale)}><DeleteOutlined fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!visibleSales.length && (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}>No sales found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Create New Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select required fullWidth label="Store" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
                  {stores.filter(s => s.isActive || String(s.id) === form.storeId).map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Customer" value={form.customerId} onChange={(e) => {
                  const selectedCustomer = customers.find(customer => customer.id === Number(e.target.value));
                  setForm({ ...form, customerId: e.target.value, customerName: selectedCustomer?.fullName ?? '' });
                }}>
                  <MenuItem value="">Walk-in / unlinked sale</MenuItem>
                  {customers.filter(customer => customer.status === 'Active').map((customer) => (
                    <MenuItem key={customer.id} value={String(customer.id)}>
                      {customer.fullName} ({customer.customerId})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {!form.customerId && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Walk-in customer name (optional)" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Sales Channel" value={form.salesChannel} onChange={(e) => setForm({ ...form, salesChannel: e.target.value })}>
                  <MenuItem value="Retail Store">Retail Store</MenuItem>
                  <MenuItem value="Online Store">Online Store</MenuItem>
                  <MenuItem value="Marketplace">Marketplace</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Payment Method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Card">Card</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Divider><Typography variant="body2" color="text.secondary">Items</Typography></Divider>

            {form.items.map((item, index) => (
              <Box key={item.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">Item {index + 1}</Typography>
                  {form.items.length > 1 && (
                    <IconButton size="small" color="error" onClick={() => removeItem(item.id)}><DeleteOutlined /></IconButton>
                  )}
                </Stack>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField select required fullWidth label="Product" value={item.productId} onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}>
                      {products.map((p) => (
                         <MenuItem key={p.id} value={String(p.id)} disabled={!p.status || p.stockQuantity <= 0}>
                           {p.name} (Stock: {p.stockQuantity})
                         </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField required fullWidth type="number" label="Quantity" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField required fullWidth type="number" label="Unit Price" value={item.unitPrice} onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField fullWidth type="number" label="Discount" value={item.discount} onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField fullWidth type="number" label="Tax" value={item.tax} onChange={(e) => handleItemChange(item.id, 'tax', e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />
                  </Grid>
                </Grid>
              </Box>
            ))}

            <Button startIcon={<Add />} onClick={addItem} sx={{ alignSelf: 'flex-start' }}>Add Another Item</Button>

            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="h6" align="right">
                Total Invoice Amount: {currency.format(calculatedTotal)}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Generate Invoice'}</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>Invoice: {detail?.invoiceNumber}</DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}><Typography color="text.secondary">Date: {new Date(detail.createdAt).toLocaleString()}</Typography></Grid>
                <Grid size={{ xs: 6 }}><Typography align="right"><b>Customer:</b> {detail.customerName || '—'}</Typography></Grid>
                <Grid size={{ xs: 6 }}><Typography><b>Store:</b> {detail.store?.name || 'Unknown'}</Typography></Grid>
                <Grid size={{ xs: 6 }}><Typography align="right"><b>Channel:</b> {detail.salesChannel}</Typography></Grid>
              </Grid>
              <Divider />
              <Typography variant="h6">Items</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Discount</TableCell>
                      <TableCell align="right">Tax</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product?.name}</TableCell>
                        <TableCell>{item.category?.name}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{currency.format(item.unitPrice)}</TableCell>
                        <TableCell align="right">{currency.format(item.discount)}</TableCell>
                        <TableCell align="right">{currency.format(item.tax)}</TableCell>
                        <TableCell align="right">{currency.format(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="h5" sx={{ mt: 2 }} align="right"><b>Total:</b> {currency.format(detail.totalAmount)}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Invoice?</DialogTitle>
        <DialogContent>
          <Typography>Delete invoice “{deleteTarget?.invoiceNumber}”? This will also revert product inventory quantities.</Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={saving} onClick={deleteSale}>{saving ? 'Deleting…' : 'Delete Invoice'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Sales;
