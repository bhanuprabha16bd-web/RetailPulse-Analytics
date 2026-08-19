import { Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { ProductForm, Product, Category } from './ProductsShared';

interface ProductFormDialogProps {
  dialogOpen: boolean;
  editing: Product | null;
  saving: boolean;
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  setDialogOpen: (val: boolean) => void;
  save: () => void;
  categories: Category[];
}

export default function ProductFormDialog({
  dialogOpen, editing, saving, form, setForm, setDialogOpen, save, categories
}: ProductFormDialogProps) {
  return (
    <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? 'Edit product' : 'Add product'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField required fullWidth label="Product name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <TextField required fullWidth label="SKU" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select required fullWidth label="Category" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
              {categories.filter((category) => category.status || String(category.id) === form.categoryId).map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="Brand" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} />
          </Stack>
          <TextField label="Product description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} multiline minRows={3} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField required fullWidth type="number" label="Unit price" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />
            <TextField fullWidth type="number" label="Cost price" value={form.costPrice} onChange={(event) => setForm({ ...form, costPrice: event.target.value })} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField required fullWidth type="number" label="Initial stock quantity" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            <TextField required fullWidth label="Unit of measure" value={form.unitOfMeasure} onChange={(event) => setForm({ ...form, unitOfMeasure: event.target.value })} />
            <TextField select fullWidth label="Product status" value={form.status ? 'active' : 'inactive'} onChange={(event) => setForm({ ...form, status: event.target.value === 'active' })}>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save product'}</Button>
      </DialogActions>
    </Dialog>
  );
}
