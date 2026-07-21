import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, DeleteOutlined, EditOutlined, Search } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Category {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
  productCount: number;
}

interface CategoryForm { name: string; description: string; status: boolean }
const emptyForm: CategoryForm = { name: '', description: '', status: true };
const adminRoles = ['Super Admin', 'Company Owner', 'Company Admin'];

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
        <Box><Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>Categories</Typography><Typography color="text.secondary">Manage the product categories used across your company.</Typography></Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add category</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField size="small" label="Search categories" value={search} onChange={(event) => setSearch(event.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ minWidth: { xs: '100%', sm: 300 } }} />
        </Box>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box> : (
          <TableContainer><Table>
            <TableHead><TableRow><TableCell>Category name</TableCell><TableCell>Description</TableCell><TableCell align="center">Products</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {visibleCategories.map((category) => <TableRow key={category.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{category.name}</TableCell>
                <TableCell sx={{ maxWidth: 380 }}>{category.description || '—'}</TableCell>
                <TableCell align="center">{category.productCount}</TableCell>
                <TableCell><Chip size="small" label={category.status ? 'Active' : 'Inactive'} color={category.status ? 'success' : 'default'} /></TableCell>
                <TableCell align="right"><IconButton aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}><EditOutlined fontSize="small" /></IconButton><IconButton aria-label={`Delete ${category.name}`} color="error" onClick={() => setDeleteTarget(category)}><DeleteOutlined fontSize="small" /></IconButton></TableCell>
              </TableRow>)}
              {!visibleCategories.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}>{search ? 'No categories match your search.' : 'No categories have been created yet.'}</TableCell></TableRow>}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit category' : 'Add category'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus required label="Category name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 500 } }} />
          <TextField select label="Status" value={form.status ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, status: event.target.value === 'active' })} slotProps={{ select: { native: true } }}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </TextField>
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveCategory} disabled={saving}>{saving ? 'Saving…' : 'Save category'}</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete category?</DialogTitle>
        <DialogContent><Typography>Delete “{deleteTarget?.name}”? This cannot be undone.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={deleteCategory} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Categories;
