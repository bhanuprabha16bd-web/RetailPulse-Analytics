import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Add, DeleteOutlined, EditOutlined, Search } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface Store {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

interface StoreForm { name: string; location: string; isActive: boolean }
const emptyForm: StoreForm = { name: '', location: '', isActive: true };
const adminRoles = ['Super Admin', 'Company Owner', 'Company Admin'];

const Stores = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Store | null>(null);
  const [editing, setEditing] = useState<Store | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);

  const loadStores = () => {
    setLoading(true);
    axiosPrivate.get<Store[]>('/stores/')
      .then((response) => { setStores(response.data); setError(null); })
      .catch((requestError) => setError(requestError.response?.data?.detail || 'Unable to load stores.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (adminRoles.includes(user?.role ?? '')) loadStores();
  }, [user?.role]);

  const visibleStores = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? stores.filter((store) => store.name.toLowerCase().includes(query) || store.location.toLowerCase().includes(query)) : stores;
  }, [stores, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (store: Store) => {
    setEditing(store);
    setForm({ name: store.name, location: store.location, isActive: store.isActive });
    setDialogOpen(true);
  };

  const saveStore = async () => {
    if (!form.name.trim()) { setError('Store name is required.'); return; }
    if (!form.location.trim()) { setError('Store location is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), location: form.location.trim() };
      if (editing) await axiosPrivate.put(`/stores/${editing.id}`, payload);
      else await axiosPrivate.post('/stores/', payload);
      setDialogOpen(false);
      loadStores();
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Unable to save store.');
    } finally { setSaving(false); }
  };

  const deleteStore = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await axiosPrivate.delete(`/stores/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadStores();
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Unable to delete store. You might have existing sales linked to this store.');
      setDeleteTarget(null);
    } finally { setSaving(false); }
  };

  if (!adminRoles.includes(user?.role ?? '')) {
    return <Alert severity="error">Store management is available to Company Admins only.</Alert>;
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }} spacing={2}>
        <Box><Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>Stores</Typography><Typography color="text.secondary">Manage your retail and online store locations.</Typography></Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add store</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField size="small" label="Search stores" value={search} onChange={(event) => setSearch(event.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ minWidth: { xs: '100%', sm: 300 } }} />
        </Box>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box> : (
          <TableContainer><Table>
            <TableHead><TableRow><TableCell>Store Name</TableCell><TableCell>Location</TableCell><TableCell>Date Added</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {visibleStores.map((store) => <TableRow key={store.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{store.name}</TableCell>
                <TableCell>{store.location}</TableCell>
                <TableCell>{new Date(store.createdAt).toLocaleDateString()}</TableCell>
                <TableCell><Chip size="small" label={store.isActive ? 'Active' : 'Inactive'} color={store.isActive ? 'success' : 'default'} /></TableCell>
                <TableCell align="right"><IconButton aria-label={`Edit ${store.name}`} onClick={() => openEdit(store)}><EditOutlined fontSize="small" /></IconButton><IconButton aria-label={`Delete ${store.name}`} color="error" onClick={() => setDeleteTarget(store)}><DeleteOutlined fontSize="small" /></IconButton></TableCell>
              </TableRow>)}
              {!visibleStores.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}>{search ? 'No stores match your search.' : 'No stores have been created yet.'}</TableCell></TableRow>}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit store' : 'Add store'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus required label="Store name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField required label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          <TextField select label="Status" value={form.isActive ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })} slotProps={{ select: { native: true } }}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </TextField>
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={saveStore} disabled={saving}>{saving ? 'Saving…' : 'Save store'}</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete store?</DialogTitle>
        <DialogContent><Typography>Delete “{deleteTarget?.name}”? This cannot be undone.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={deleteStore} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Stores;
