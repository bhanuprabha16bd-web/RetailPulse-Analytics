import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Category } from './CategoriesShared';

interface CategoryDeleteDialogProps {
  deleteTarget: Category | null;
  saving: boolean;
  setDeleteTarget: (target: Category | null) => void;
  deleteCategory: () => void;
}

export default function CategoryDeleteDialog({ deleteTarget, saving, setDeleteTarget, deleteCategory }: CategoryDeleteDialogProps) {
  return (
    <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Delete category?</DialogTitle>
      <DialogContent>
        <Typography>Delete “{deleteTarget?.name}”? This cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
        <Button color="error" variant="contained" onClick={deleteCategory} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</Button>
      </DialogActions>
    </Dialog>
  );
}
