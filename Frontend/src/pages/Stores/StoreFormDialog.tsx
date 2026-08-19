import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { StoreForm, Store } from './StoresShared';

interface StoreFormDialogProps {
  dialogOpen: boolean;
  editing: Store | null;
  saving: boolean;
  form: StoreForm;
  setForm: (form: StoreForm) => void;
  setDialogOpen: (val: boolean) => void;
  saveStore: () => void;
}

export default function StoreFormDialog({ dialogOpen, editing, saving, form, setForm, setDialogOpen, saveStore }: StoreFormDialogProps) {
  return (
    <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? 'Edit store' : 'Add store'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus required label="Store name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField required label="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          <TextField select label="Status" value={form.isActive ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, isActive: event.target.value === 'active' })} slotProps={{ select: { native: true } }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={saveStore} disabled={saving}>{saving ? 'Saving…' : 'Save store'}</Button>
      </DialogActions>
    </Dialog>
  );
}
