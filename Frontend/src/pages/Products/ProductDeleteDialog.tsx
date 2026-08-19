import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Product } from './ProductsShared';

interface ProductDeleteDialogProps {
  deleteTarget: Product | null;
  saving: boolean;
  setDeleteTarget: (target: Product | null) => void;
  deleteProduct: () => void;
}

export default function ProductDeleteDialog({ deleteTarget, saving, setDeleteTarget, deleteProduct }: ProductDeleteDialogProps) {
  return (
    <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Delete product?</DialogTitle>
      <DialogContent>
        <Typography>Delete “{deleteTarget?.name}”? This cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={() => setDeleteTarget(null)}>Cancel</Button>
        <Button color="error" variant="contained" disabled={saving} onClick={deleteProduct}>{saving ? 'Deleting…' : 'Delete'}</Button>
      </DialogActions>
    </Dialog>
  );
}
