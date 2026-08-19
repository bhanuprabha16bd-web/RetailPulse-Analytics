import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { CategoryForm, Category } from './CategoriesShared';

interface CategoryFormDialogProps {
  dialogOpen: boolean;
  editing: Category | null;
  saving: boolean;
  form: CategoryForm;
  setForm: (form: CategoryForm) => void;
  setDialogOpen: (val: boolean) => void;
  saveCategory: () => void;
}

export default function CategoryFormDialog({ dialogOpen, editing, saving, form, setForm, setDialogOpen, saveCategory }: CategoryFormDialogProps) {
  return (
    <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? 'Edit category' : 'Add category'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField autoFocus required label="Category name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} multiline minRows={3} slotProps={{ htmlInput: { maxLength: 500 } }} />
          <TextField select label="Status" value={form.status ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, status: event.target.value === 'active' })} slotProps={{ select: { native: true } }}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={saveCategory} disabled={saving}>{saving ? 'Saving…' : 'Save category'}</Button>
      </DialogActions>
    </Dialog>
  );
}
