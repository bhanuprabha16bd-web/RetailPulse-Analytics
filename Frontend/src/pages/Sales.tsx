import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography, Grid, Chip
} from '@mui/material';
import { Add, DeleteOutlined, Search, VisibilityOutlined } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Store { id: number; name: string; isActive: boolean }
interface CustomerOption { id: number; fullName: string; customerId: string; status: string }
interface Product { id: number; name: string; categoryId: number; unitPrice: number; status: boolean; stockQuantity: number; sku: string; }
interface Category { id: number; name: string; }
interface SaleItem {
  id: number; saleId: number; productId: number; categoryId: number;
  quantity: number; unitPrice: number; discount: number; tax: number; total: number;
  product: { name: string } | null;
  category: { name: string } | null;
}
interface Sale {
  id: number; invoiceNumber: string; storeId: number; customerName: string | null;
  totalAmount: number; salesChannel: string; paymentMethod: string; createdAt: string;
  paymentStatus: string; notes: string | null;
  store: { name: string } | null;
  items: SaleItem[];
}

interface SaleItemForm {
  id: string; // temp id for UI
  productId: string; quantity: string; unitPrice: string; discount: string; tax: string;
}

interface SaleForm {
  storeId: string; customerId: string; customerName: string; salesChannel: string; paymentMethod: string; paymentStatus: string; notes: string;
  items: SaleItemForm[];
}

const emptyItemForm = (): SaleItemForm => ({
  id: Math.random().toString(36).substr(2, 9),
  productId: '', quantity: '1', unitPrice: '', discount: '0', tax: '0'
});

const emptyForm: SaleForm = {
  storeId: '', customerId: '', customerName: '', salesChannel: 'Retail Store', paymentMethod: 'Cash', paymentStatus: 'Paid', notes: '',
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
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  
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
      axiosPrivate.get<CustomerOption[]>('/customers/'),
      axiosPrivate.get<Category[]>('/categories/')
    ])
      .then(([salesRes, storesRes, productsRes, customersRes, categoriesRes]) => {
        setSales(salesRes.data);
        setStores(storesRes.data);
        setProducts(productsRes.data);
        setCustomers(customersRes.data);
        setCategories(categoriesRes.data);
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
    let filtered = sales.filter((sale) => {
      if (query && !(
        sale.invoiceNumber.toLowerCase().includes(query) || 
        (sale.customerName && sale.customerName.toLowerCase().includes(query)) ||
        sale.items.some(item => item.product?.name.toLowerCase().includes(query))
      )) return false;
      
      if (filterStatus && sale.paymentStatus !== filterStatus) return false;
      if (filterPayment && sale.paymentMethod !== filterPayment) return false;
      if (filterDateStart && new Date(sale.createdAt) < new Date(filterDateStart)) return false;
      if (filterDateEnd && new Date(sale.createdAt) > new Date(filterDateEnd + 'T23:59:59')) return false;

      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'amount_desc') return b.totalAmount - a.totalAmount;
      if (sortBy === 'amount_asc') return a.totalAmount - b.totalAmount;
      if (sortBy === 'customer_asc') return (a.customerName || '').localeCompare(b.customerName || '');
      return 0;
    });

    return filtered;
  }, [sales, search, filterStatus, filterPayment, filterDateStart, filterDateEnd, sortBy]);

  const handleExportCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Customer', 'Channel', 'Payment Method', 'Status', 'Total Amount', 'Items Count'];
    const rows = visibleSales.map(s => [
      s.invoiceNumber,
      new Date(s.createdAt).toLocaleDateString(),
      `"${s.customerName || 'N/A'}"`,
      s.salesChannel,
      s.paymentMethod,
      s.paymentStatus,
      s.totalAmount,
      s.items.length
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_export_${new Date().getTime()}.csv`;
    link.click();
  };

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
      const qty = Number(item.quantity);
      if (qty <= 0) {
        setError('Quantity must be greater than zero.'); return;
      }
      const product = products.find(p => p.id === Number(item.productId));
      if (product && qty > product.stockQuantity) {
        setError(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`); return;
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
        paymentStatus: form.paymentStatus,
        notes: form.notes,
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

  const billingSummary = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    
    form.items.forEach(item => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const d = Number(item.discount) || 0;
      const t = Number(item.tax) || 0;
      
      subtotal += (q * p);
      totalDiscount += d;
      totalTax += t;
    });
    
    return {
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal: Math.max(0, subtotal - totalDiscount + totalTax)
    };
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
        <Stack direction="row" spacing={2} sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap', gap: 1 }}>
          <TextField size="small" label="Search invoice, customer, product" value={search} onChange={(e) => setSearch(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ minWidth: 250, flexGrow: 1 }} />
          
          <TextField size="small" type="date" label="Start Date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="End Date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          
          <TextField size="small" select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Overdue">Overdue</MenuItem>
          </TextField>
        
          <TextField size="small" select label="Payment" value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value="">All Methods</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Card">Card</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
          </TextField>

          <TextField size="small" select label="Sort By" value={sortBy} onChange={(e) => setSortBy(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="date_desc">Newest First</MenuItem>
            <MenuItem value="date_asc">Oldest First</MenuItem>
            <MenuItem value="amount_desc">Highest Amount</MenuItem>
            <MenuItem value="amount_asc">Lowest Amount</MenuItem>
            <MenuItem value="customer_asc">Customer (A-Z)</MenuItem>
          </TextField>
        
          <Button variant="outlined" onClick={handleExportCSV}>Export CSV</Button>
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
                  <TableCell>Status</TableCell>
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
                    <TableCell>
                      <Chip size="small" label={sale.paymentStatus} color={sale.paymentStatus === 'Paid' ? 'success' : sale.paymentStatus === 'Pending' ? 'warning' : 'error'} />
                    </TableCell>
                    <TableCell align="right">{sale.items.length}</TableCell>
                    <TableCell align="right">{currency.format(sale.totalAmount)}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => setDetail(sale)}><VisibilityOutlined fontSize="small" /></IconButton>
                      <IconButton color="error" onClick={() => setDeleteTarget(sale)}><DeleteOutlined fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {!visibleSales.length && (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5 }}>No sales found.</TableCell></TableRow>
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Payment Status" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Overdue">Overdue</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth multiline rows={2} label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Grid>
            </Grid>

            <Divider><Typography variant="body2" color="text.secondary">Items</Typography></Divider>

            {form.items.map((item, index) => {
              const selectedProduct = products.find(p => p.id === Number(item.productId));
              const categoryName = categories.find(c => c.id === selectedProduct?.categoryId)?.name || '—';
              
              return (
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
                           {p.name}
                         </MenuItem>
                      ))}
                    </TextField>
                    {selectedProduct && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                        <Chip size="small" label={`SKU: ${selectedProduct.sku}`} />
                        <Chip size="small" label={`Category: ${categoryName}`} />
                        <Chip size="small" label={`Stock: ${selectedProduct.stockQuantity}`} color={selectedProduct.stockQuantity < 10 ? 'warning' : 'default'} />
                      </Stack>
                    )}
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField required fullWidth type="number" label="Quantity" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} slotProps={{ htmlInput: { min: 1, step: 1, max: selectedProduct?.stockQuantity || undefined } }} error={Number(item.quantity) <= 0 || (!!selectedProduct && Number(item.quantity) > selectedProduct.stockQuantity)} helperText={Number(item.quantity) <= 0 ? 'Must be > 0' : (selectedProduct && Number(item.quantity) > selectedProduct.stockQuantity ? `Max ${selectedProduct.stockQuantity}` : '')} />
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
            )})}

            <Button startIcon={<Add />} onClick={addItem} sx={{ alignSelf: 'flex-start' }}>Add Another Item</Button>

            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mt: 2 }}>
              <Typography variant="subtitle1" align="right" color="text.secondary">
                Subtotal: {currency.format(billingSummary.subtotal)}
              </Typography>
              <Typography variant="subtitle1" align="right" color="text.secondary">
                Discount: -{currency.format(billingSummary.totalDiscount)}
              </Typography>
              <Typography variant="subtitle1" align="right" color="text.secondary">
                Tax: +{currency.format(billingSummary.totalTax)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h5" align="right" sx={{ fontWeight: 'bold' }}>
                Grand Total: {currency.format(billingSummary.grandTotal)}
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
        <DialogContent sx={{ p: { xs: 2, md: 5 } }}>
          {detail && (
            <Stack spacing={4}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>INVOICE</Typography>
                  <Typography variant="body2" color="text.secondary">#{detail.invoiceNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">Date: {new Date(detail.createdAt).toLocaleDateString()}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>RetailPulse</Typography>
                  <Typography variant="body2" color="text.secondary">Store: {detail.store?.name || 'Unknown'}</Typography>
                  <Typography variant="body2" color="text.secondary">Channel: {detail.salesChannel}</Typography>
                </Box>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary">Bill To</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{detail.customerName || 'Walk-in Customer'}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="overline" color="text.secondary">Payment Info</Typography>
                  <Typography variant="body2">Method: {detail.paymentMethod}</Typography>
                  <Typography variant="body2">
                    Status: 
                    <Chip size="small" label={detail.paymentStatus} color={detail.paymentStatus === 'Paid' ? 'success' : detail.paymentStatus === 'Pending' ? 'warning' : 'error'} sx={{ ml: 1 }} />
                  </Typography>
                </Box>
              </Box>

              <TableContainer variant="outlined" component={Box} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Discount</TableCell>
                      <TableCell align="right">Tax</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2">{item.product?.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.category?.name}</Typography>
                        </TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{currency.format(item.unitPrice)}</TableCell>
                        <TableCell align="right">{currency.format(item.discount)}</TableCell>
                        <TableCell align="right">{currency.format(item.tax)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{currency.format(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  {detail.notes && (
                    <>
                      <Typography variant="overline" color="text.secondary">Notes</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{detail.notes}</Typography>
                    </>
                  )}
                </Box>
                <Box sx={{ minWidth: 250, width: { xs: '100%', sm: 'auto' } }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body2">{currency.format(detail.totalAmount - detail.items.reduce((sum, item) => sum + item.tax - item.discount, 0))}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Tax</Typography>
                      <Typography variant="body2">{currency.format(detail.items.reduce((sum, item) => sum + item.tax, 0))}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Discount</Typography>
                      <Typography variant="body2" color="success.main">-{currency.format(detail.items.reduce((sum, item) => sum + item.discount, 0))}</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Total</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{currency.format(detail.totalAmount)}</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, md: 5 }, pb: { xs: 2, md: 5 } }}>
          <Button onClick={() => window.print()} variant="outlined" sx={{ mr: 'auto' }}>Print</Button>
          <Button onClick={() => setDetail(null)} variant="contained">Close</Button>
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
