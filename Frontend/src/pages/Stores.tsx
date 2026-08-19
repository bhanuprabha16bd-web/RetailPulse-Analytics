import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Store, StoreForm, emptyForm, adminRoles } from './Stores/StoresShared';
import StoresTable from './Stores/StoresTable';
import StoreFormDialog from './Stores/StoreFormDialog';
import StoreDeleteDialog from './Stores/StoreDeleteDialog';

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
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>Stores</Typography>
          <Typography color="text.secondary">Manage your retail and online store locations.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add store</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField size="small" label="Search stores" value={search} onChange={(event) => setSearch(event.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} sx={{ minWidth: { xs: '100%', sm: 300 } }} />
        </Box>
        <StoresTable 
          loading={loading} visibleStores={visibleStores} search={search} 
          openEdit={openEdit} setDeleteTarget={setDeleteTarget} 
        />
      </Paper>
      <StoreFormDialog 
        dialogOpen={dialogOpen} editing={editing} saving={saving} 
        form={form} setForm={setForm} setDialogOpen={setDialogOpen} saveStore={saveStore} 
      />
      <StoreDeleteDialog 
        deleteTarget={deleteTarget} saving={saving} 
        setDeleteTarget={setDeleteTarget} deleteStore={deleteStore} 
      />
    </Box>
  );
};

export default Stores;
