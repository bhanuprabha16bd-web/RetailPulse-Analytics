import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Category, CategoryForm, emptyForm, adminRoles } from './Categories/CategoriesShared';
import CategoriesTable from './Categories/CategoriesTable';
import CategoryFormDialog from './Categories/CategoryFormDialog';
import CategoryDeleteDialog from './Categories/CategoryDeleteDialog';

const Categories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const loadCategories = () => {
    setLoading(true);
    axiosPrivate.get<Category[]>('/categories/')
      .then((response) => { setCategories(response.data); setError(null); })
      .catch((requestError) => setError(requestError.response?.data?.detail || 'Unable to load categories.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (adminRoles.includes(user?.role ?? '')) loadCategories();
  }, [user?.role]);

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? categories.filter((category) => category.name.toLowerCase().includes(query)) : categories;
  }, [categories, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({ name: category.name, description: category.description ?? '', status: category.status });
    setDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!form.name.trim()) { setError('Category name is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() || null };
      if (editing) await axiosPrivate.put(`/categories/${editing.id}`, payload);
      else await axiosPrivate.post('/categories/', payload);
      setDialogOpen(false);
      loadCategories();
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Unable to save category.');
    } finally { setSaving(false); }
  };

  const deleteCategory = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await axiosPrivate.delete(`/categories/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadCategories();
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Unable to delete category.');
      setDeleteTarget(null);
    } finally { setSaving(false); }
  };

  if (!adminRoles.includes(user?.role ?? '')) {
    return <Alert severity="error">Category management is available to Company Admins only.</Alert>;
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>Categories</Typography>
          <Typography color="text.secondary">Manage the product categories used across your company.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add category</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField size="small" label="Search categories" value={search} onChange={(event) => setSearch(event.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ minWidth: { xs: '100%', sm: 300 } }} />
        </Box>
        <CategoriesTable 
          loading={loading} visibleCategories={visibleCategories} search={search} 
          openEdit={openEdit} setDeleteTarget={setDeleteTarget} 
        />
      </Paper>
      <CategoryFormDialog 
        dialogOpen={dialogOpen} editing={editing} saving={saving} 
        form={form} setForm={setForm} setDialogOpen={setDialogOpen} saveCategory={saveCategory} 
      />
      <CategoryDeleteDialog 
        deleteTarget={deleteTarget} saving={saving} 
        setDeleteTarget={setDeleteTarget} deleteCategory={deleteCategory} 
      />
    </Box>
  );
};

export default Categories;
