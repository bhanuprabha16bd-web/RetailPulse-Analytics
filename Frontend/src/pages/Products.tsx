import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, IconButton, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, DeleteOutlined, EditOutlined, Search, VisibilityOutlined } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Category { id: number; name: string; status: boolean }
interface Product {
  id: number; name: string; sku: string; categoryId: number; brand: string | null; description: string | null;
  unitPrice: number; costPrice: number | null; stockQuantity: number; unitOfMeasure: string; status: boolean; createdAt: string;
}
interface ProductForm {
  name: string; sku: string; categoryId: string; brand: string; description: string; unitPrice: string;
  costPrice: string; stockQuantity: string; unitOfMeasure: string; status: boolean;
}
const emptyForm: ProductForm = { name: '', sku: '', categoryId: '', brand: '', description: '', unitPrice: '', costPrice: '', stockQuantity: '0', unitOfMeasure: 'Unit', status: true };
const adminRoles = ['Super Admin', 'Company Owner', 'Company Admin'];
const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' });

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('Recently Added');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const loadData = () => {
    setLoading(true);
    Promise.all([axiosPrivate.get<Product[]>('/products/'), axiosPrivate.get<Category[]>('/categories/')])
      .then(([productResponse, categoryResponse]) => { setProducts(productResponse.data); setCategories(categoryResponse.data); setError(null); })
      .catch((requestError) => setError(requestError.response?.data?.detail || 'Unable to load product data.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (adminRoles.includes(user?.role ?? '')) loadData(); }, [user?.role]);

  const brands = useMemo(() => Array.from(new Set(products.map((product) => product.brand).filter((brand): brand is string => Boolean(brand)))).sort(), [products]);
  const visibleProducts = useMemo(() => {
    const query = search.toLowerCase().trim();
    let filtered = products.filter((product) => (!query || [product.name, product.sku, product.brand ?? ''].some((value) => value.toLowerCase().includes(query)))
      && (!categoryFilter || String(product.categoryId) === categoryFilter) && (!brandFilter || product.brand === brandFilter)
      && (!statusFilter || String(product.status) === statusFilter));
      
    switch (sortBy) {
      case 'Name (A-Z)':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'Name (Z-A)':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'Price (Low to High)':
        filtered.sort((a, b) => a.unitPrice - b.unitPrice);
        break;
      case 'Price (High to Low)':
        filtered.sort((a, b) => b.unitPrice - a.unitPrice);
        break;
      case 'Recently Added':
      default:
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
    }
    return filtered;
  }, [products, search, categoryFilter, brandFilter, statusFilter, sortBy]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, categoryId: String(categories.find((category) => category.status)?.id ?? '') }); setDialogOpen(true); };
  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({ name: product.name, sku: product.sku, categoryId: String(product.categoryId), brand: product.brand ?? '', description: product.description ?? '', unitPrice: String(product.unitPrice), costPrice: product.costPrice === null ? '' : String(product.costPrice), stockQuantity: String(product.stockQuantity), unitOfMeasure: product.unitOfMeasure, status: product.status });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!form.name.trim() || !form.sku.trim() || !form.categoryId || !form.unitPrice || !form.unitOfMeasure.trim()) { setError('Complete all required product fields.'); return; }
    if (Number(form.unitPrice) <= 0) { setError('Unit price must be greater than zero.'); return; }
    if (form.costPrice !== '' && Number(form.costPrice) > Number(form.unitPrice)) { setError('Cost price cannot exceed unit price.'); return; }
    if (Number(form.stockQuantity) < 0) { setError('Stock quantity cannot be negative.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), sku: form.sku.trim(), categoryId: Number(form.categoryId), brand: form.brand.trim() || null, description: form.description.trim() || null, unitPrice: Number(form.unitPrice), costPrice: form.costPrice === '' ? null : Number(form.costPrice), stockQuantity: Number(form.stockQuantity), unitOfMeasure: form.unitOfMeasure.trim(), status: form.status };
      if (editing) await axiosPrivate.put(`/products/${editing.id}`, payload); else await axiosPrivate.post('/products/', payload);
      setDialogOpen(false); loadData();
    } catch (requestError: any) { setError(requestError.response?.data?.detail || 'Unable to save product.'); } finally { setSaving(false); }
  };
  const deleteProduct = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try { await axiosPrivate.delete(`/products/${deleteTarget.id}`); setDeleteTarget(null); loadData(); }
    catch (requestError: any) { setError(requestError.response?.data?.detail || 'Unable to delete product.'); setDeleteTarget(null); } finally { setSaving(false); }
  };
  const toggleStatus = async (product: Product) => {
    setSaving(true);
    try { await axiosPrivate.put(`/products/${product.id}`, { ...product, status: !product.status }); loadData(); }
    catch (requestError: any) { setError(requestError.response?.data?.detail || 'Unable to update product status.'); } finally { setSaving(false); }
  };

  if (!adminRoles.includes(user?.role ?? '')) return <Alert severity="error">Product management is available to Company Admins only.</Alert>;

  return <Box>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
      <Box><Typography variant="h4" fontWeight="bold" gutterBottom>Products</Typography><Typography color="text.secondary">Manage your company’s product master data.</Typography></Box>
      <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add product</Button>
    </Stack>
    {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
    <Paper>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField size="small" label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ minWidth: { xs: '100%', md: 260 } }} />
        <TextField select size="small" label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} sx={{ minWidth: 160 }}><MenuItem value="">All categories</MenuItem>{categories.map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Brand" value={brandFilter} onChange={(event) => setBrandFilter(event.target.value)} sx={{ minWidth: 150 }}><MenuItem value="">All brands</MenuItem>{brands.map((brand) => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}</TextField>
        <TextField select size="small" label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} sx={{ minWidth: 140 }}><MenuItem value="">All statuses</MenuItem><MenuItem value="true">Active</MenuItem><MenuItem value="false">Inactive</MenuItem></TextField>
        <TextField select size="small" label="Sort By" value={sortBy} onChange={(event) => setSortBy(event.target.value)} sx={{ minWidth: 160 }}><MenuItem value="Recently Added">Recently Added</MenuItem><MenuItem value="Name (A-Z)">Name (A-Z)</MenuItem><MenuItem value="Name (Z-A)">Name (Z-A)</MenuItem><MenuItem value="Price (Low to High)">Price (Low to High)</MenuItem><MenuItem value="Price (High to Low)">Price (High to Low)</MenuItem></TextField>
      </Stack>
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box> : <TableContainer><Table>
        <TableHead><TableRow><TableCell>Product</TableCell><TableCell>SKU</TableCell><TableCell>Category</TableCell><TableCell>Brand</TableCell><TableCell align="right">Unit price</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>{visibleProducts.map((product) => <TableRow key={product.id} hover><TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell><TableCell>{product.sku}</TableCell><TableCell>{categories.find(c => c.id === product.categoryId)?.name || 'Unknown'}</TableCell><TableCell>{product.brand || '—'}</TableCell><TableCell align="right">{currency.format(product.unitPrice)}</TableCell><TableCell><Chip label={product.status ? 'Active' : 'Inactive'} color={product.status ? 'success' : 'default'} size="small" onClick={() => toggleStatus(product)} disabled={saving} /></TableCell><TableCell align="right"><IconButton aria-label={`View ${product.name}`} onClick={() => setDetail(product)}><VisibilityOutlined fontSize="small" /></IconButton><IconButton aria-label={`Edit ${product.name}`} onClick={() => openEdit(product)}><EditOutlined fontSize="small" /></IconButton><IconButton aria-label={`Delete ${product.name}`} color="error" onClick={() => setDeleteTarget(product)}><DeleteOutlined fontSize="small" /></IconButton></TableCell></TableRow>)}
        {!visibleProducts.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}>No products match the current filters.</TableCell></TableRow>}</TableBody>
      </Table></TableContainer>}
    </Paper>
    <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth><DialogTitle>{editing ? 'Edit product' : 'Add product'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField required fullWidth label="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><TextField required fullWidth label="SKU" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField select required fullWidth label="Category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>{categories.filter((category) => category.status || String(category.id) === form.categoryId).map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}</TextField><TextField fullWidth label="Brand" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></Stack>
      <TextField label="Product description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} multiline minRows={3} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField required fullWidth type="number" label="Unit price" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} /><TextField fullWidth type="number" label="Cost price" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} /></Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField required fullWidth type="number" label="Initial stock quantity" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} slotProps={{ htmlInput: { min: 0, step: 1 } }} /><TextField required fullWidth label="Unit of measure" value={form.unitOfMeasure} onChange={(event) => setForm({ ...form, unitOfMeasure: event.target.value })} /><TextField select fullWidth label="Product status" value={form.status ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, status: event.target.value === 'active' })}><MenuItem value="active">Active</MenuItem><MenuItem value="inactive">Inactive</MenuItem></TextField></Stack>
    </Stack></DialogContent><DialogActions><Button disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save product'}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="sm" fullWidth><DialogTitle>{detail?.name}</DialogTitle><DialogContent>{detail && <Stack spacing={1.5}><Typography color="text.secondary">SKU: {detail.sku}</Typography><Divider /><Typography><b>Category:</b> {categories.find(c => c.id === detail.categoryId)?.name || 'Unknown'}</Typography><Typography><b>Brand:</b> {detail.brand || '—'}</Typography><Typography><b>Description:</b> {detail.description || '—'}</Typography><Typography><b>Unit price:</b> {currency.format(detail.unitPrice)}</Typography><Typography><b>Cost price:</b> {detail.costPrice === null ? '—' : currency.format(detail.costPrice)}</Typography><Typography><b>Initial stock:</b> {detail.stockQuantity} {detail.unitOfMeasure}</Typography><Typography><b>Status:</b> {detail.status ? 'Active' : 'Inactive'}</Typography></Stack>}</DialogContent><DialogActions><Button onClick={() => setDetail(null)}>Close</Button></DialogActions></Dialog>
    <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth><DialogTitle>Delete product?</DialogTitle><DialogContent><Typography>Delete “{deleteTarget?.name}”? This cannot be undone.</Typography></DialogContent><DialogActions><Button disabled={saving} onClick={() => setDeleteTarget(null)}>Cancel</Button><Button color="error" variant="contained" disabled={saving} onClick={deleteProduct}>{saving ? 'Deleting…' : 'Delete'}</Button></DialogActions></Dialog>
  </Box>;
};

export default Products;
