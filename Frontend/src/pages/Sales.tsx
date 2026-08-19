import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, InputAdornment, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Sale, SaleForm, SaleItemForm, emptyForm, emptyItemForm, manageRoles, Store, CustomerOption, Product, Category } from './Sales/SalesShared';
import SalesTable from './Sales/SalesTable';
import SaleCreateDialog from './Sales/SaleCreateDialog';
import SaleDetailDialog from './Sales/SaleDetailDialog';
import SaleDeleteDialog from './Sales/SaleDeleteDialog';

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
        
        <SalesTable 
          loading={loading} visibleSales={visibleSales} 
          setDetail={setDetail} setDeleteTarget={setDeleteTarget} 
        />
      </Paper>

      <SaleCreateDialog 
        dialogOpen={dialogOpen} saving={saving} form={form} setForm={setForm} 
        setDialogOpen={setDialogOpen} save={save} 
        stores={stores} customers={customers} products={products} categories={categories} 
        handleItemChange={handleItemChange} addItem={addItem} removeItem={removeItem} 
        billingSummary={billingSummary} 
      />

      <SaleDetailDialog 
        detail={detail} setDetail={setDetail} 
      />

      <SaleDeleteDialog 
        deleteTarget={deleteTarget} saving={saving} 
        setDeleteTarget={setDeleteTarget} deleteSale={deleteSale} 
      />
    </Box>
  );
};

export default Sales;
