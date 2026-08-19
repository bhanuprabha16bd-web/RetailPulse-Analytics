import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Sale } from './SalesShared';

interface SaleDeleteDialogProps {
  deleteTarget: Sale | null;
  saving: boolean;
  setDeleteTarget: (target: Sale | null) => void;
  deleteSale: () => void;
}

export default function SaleDeleteDialog({ deleteTarget, saving, setDeleteTarget, deleteSale }: SaleDeleteDialogProps) {
  return (
    <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Invoice?</DialogTitle>
      <DialogContent>
        <Typography>Delete invoice “{deleteTarget?.invoiceNumber}”? This will also revert product inventory quantities.</Typography>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={() => setDeleteTarget(null)}>Cancel</Button>
        <Button color="error" variant="contained" disabled={saving} onClick={deleteSale}>{saving ? 'Deleting…' : 'Delete Invoice'}</Button>
      </DialogActions>
    </Dialog>
  );
}
