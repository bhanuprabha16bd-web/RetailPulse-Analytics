import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Store } from './StoresShared';

interface StoreDeleteDialogProps {
  deleteTarget: Store | null;
  saving: boolean;
  setDeleteTarget: (target: Store | null) => void;
  deleteStore: () => void;
}

export default function StoreDeleteDialog({ deleteTarget, saving, setDeleteTarget, deleteStore }: StoreDeleteDialogProps) {
  return (
    <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Delete store?</DialogTitle>
      <DialogContent><Typography>Delete “{deleteTarget?.name}”? This cannot be undone.</Typography></DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
        <Button color="error" variant="contained" onClick={deleteStore} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</Button>
      </DialogActions>
    </Dialog>
  );
}
