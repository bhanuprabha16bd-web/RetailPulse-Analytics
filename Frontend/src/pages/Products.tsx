import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, InputAdornment, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Product, ProductForm, Category, emptyForm, adminRoles } from './Products/ProductsShared';
import ProductsTable from './Products/ProductsTable';
import ProductFormDialog from './Products/ProductFormDialog';
import ProductDetailDialog from './Products/ProductDetailDialog';
import ProductDeleteDialog from './Products/ProductDeleteDialog';

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

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>Products</Typography>
          <Typography color="text.secondary">Manage your product catalog.</Typography>
        </Box>
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
        
        <ProductsTable 
          loading={loading} visibleProducts={visibleProducts} categories={categories} 
          saving={saving} toggleStatus={toggleStatus} 
          setDetail={setDetail} openEdit={openEdit} setDeleteTarget={setDeleteTarget} 
        />
      </Paper>

      <ProductFormDialog 
        dialogOpen={dialogOpen} editing={editing} saving={saving} 
        form={form} setForm={setForm} setDialogOpen={setDialogOpen} save={save} 
        categories={categories} 
      />

      <ProductDetailDialog 
        detail={detail} setDetail={setDetail} categories={categories} 
      />

      <ProductDeleteDialog 
        deleteTarget={deleteTarget} saving={saving} 
        setDeleteTarget={setDeleteTarget} deleteProduct={deleteProduct} 
      />
    </Box>
  );
};

export default Products;
