import { Dialog, DialogTitle, DialogContent, Box, DialogActions, Button, TextField, MenuItem } from '@mui/material';

export type CustomerFormState = {
  firstName: string; lastName: string; email: string; phone: string;
  address: string; city: string; state: string; country: string; postalCode: string;
  customerType: 'Retail' | 'Wholesale' | 'Corporate'; status: 'Active' | 'Inactive'
};

interface CustomerFormDialogProps {
  open: boolean;
  saving: boolean;
  editing: boolean;
  form: CustomerFormState;
  errors: Partial<Record<keyof CustomerFormState, string>>;
  setOpen: (val: boolean) => void;
  change: (key: keyof CustomerFormState, value: string) => void;
  save: () => void;
}

export default function CustomerFormDialog({
  open, saving, editing, form, errors, setOpen, change, save
}: CustomerFormDialogProps) {
  
  const field = (key: keyof CustomerFormState, label: string, options?: string[]) => (
    <TextField 
      fullWidth 
      required={['firstName','lastName','email','phone','address','city','state','country','postalCode'].includes(key)} 
      label={label} 
      value={form[key]} 
      onChange={e => change(key, e.target.value)} 
      error={Boolean(errors[key])} 
      helperText={errors[key]} 
      select={Boolean(options)} 
      type={key === 'email' ? 'email' : undefined}
    >
      {options?.map(x => <MenuItem key={x} value={x}>{x}</MenuItem>)}
    </TextField>
  );

  return (
    <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {field('firstName','First Name')}
          {field('lastName','Last Name')}
          {field('email','Email')}
          {field('phone','Phone Number')}
          <Box sx={{ gridColumn: { sm: 'span 2' } }}>{field('address','Address')}</Box>
          {field('city','City')}
          {field('state','State')}
          {field('country','Country')}
          {field('postalCode','Postal Code')}
          {field('customerType','Customer Type',['Retail','Wholesale','Corporate'])}
          {field('status','Status',['Active','Inactive'])}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update Customer' : 'Save Customer'}</Button>
      </DialogActions>
    </Dialog>
  );
}
