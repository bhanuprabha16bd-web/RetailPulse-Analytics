
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

interface CustomerDeleteDialogProps {
  open: boolean;
  saving: boolean;
  setTarget: (val: any) => void;
  remove: () => void;
}

export default function CustomerDeleteDialog({
  open, saving, setTarget, remove
}: CustomerDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={() => !saving && setTarget(null)}>
      <DialogTitle>Remove customer?</DialogTitle>
      <DialogContent>This customer will be hidden from the active database and retained for reporting.</DialogContent>
      <DialogActions>
        <Button onClick={() => setTarget(null)}>Cancel</Button>
        <Button color="error" variant="contained" onClick={remove} disabled={saving}>Remove</Button>
      </DialogActions>
    </Dialog>
  );
}
