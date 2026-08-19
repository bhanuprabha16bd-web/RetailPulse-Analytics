import { useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { customersApi, Customer } from '../../api/customers';
import { useAuth } from '../../context/AuthContext';
import CustomersListFilters from './List/CustomersListFilters';
import CustomersListTable from './List/CustomersListTable';
import CustomerFormDialog from './List/CustomerFormDialog';
import CustomerDeleteDialog from './List/CustomerDeleteDialog';

type Form = { firstName: string; lastName: string; email: string; phone: string; address: string; city: string; state: string; country: string; postalCode: string; customerType: 'Retail' | 'Wholesale' | 'Corporate'; status: 'Active' | 'Inactive' };
const empty: Form = { firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', country: '', postalCode: '', customerType: 'Retail', status: 'Active' };
const roles = ['Super Admin', 'Company Owner', 'Company Admin', 'Analyst'];
const segmentColors: Record<string, 'default' | 'info' | 'primary' | 'secondary'> = { 'New Customer': 'info', 'Regular Customer': 'default', 'Loyal Customer': 'primary', 'VIP Customer': 'secondary' };

export default function CustomersList() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(''); const [segment, setSegment] = useState(''); const [status, setStatus] = useState(''); const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Customer | null>(null); const [target, setTarget] = useState<Customer | null>(null); const [form, setForm] = useState<Form>(empty); const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const load = () => { setLoading(true); customersApi.getCustomers({ search, statusFilter: status }).then(data => { setCustomers(data); setError(null); }).catch((e: any) => setError(e.response?.data?.detail || 'Failed to load customers. Please try again.')).finally(() => setLoading(false)); };
  useEffect(() => { if (!roles.includes(user?.role ?? '')) return; const timer = window.setTimeout(load, 250); return () => clearTimeout(timer); }, [user?.role, search, status]);
  const shown = segment ? customers.filter(c => c.segment === segment) : customers;
  const change = (key: keyof Form, value: string) => { setForm(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: undefined })); };
  const validate = () => { const next: Partial<Record<keyof Form, string>> = {}; (['firstName','lastName','email','phone','address','city','state','country','postalCode'] as const).forEach(k => { if (!form[k].trim()) next[k] = 'This field is required.'; }); if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.'; if (form.phone && !/^\+?[0-9][0-9 ()-]{6,19}$/.test(form.phone)) next.phone = 'Enter a valid phone number.'; setErrors(next); return !Object.keys(next).length; };
  const create = () => { setEditing(null); setForm(empty); setErrors({}); setOpen(true); };
  const edit = (c: Customer) => { const name = c.fullName.trim().split(/\s+/); setEditing(c); setForm({ ...empty, firstName: name.shift() || '', lastName: name.join(' '), email: c.email || '', phone: c.phone || '', address: c.address || '', city: c.city || '', state: c.state || '', country: c.country || '', postalCode: c.postalCode || '', customerType: c.customerType, status: c.status }); setErrors({}); setOpen(true); };
  const save = async () => { if (!validate()) { setError('Please correct the highlighted fields.'); return; } setSaving(true); const body = { fullName: `${form.firstName.trim()} ${form.lastName.trim()}`, email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim(), city: form.city.trim(), state: form.state.trim(), country: form.country.trim(), postalCode: form.postalCode.trim(), customerType: form.customerType, preferredSalesChannel: 'Retail Store' as const, status: form.status }; try { editing ? await customersApi.updateCustomer(editing.id, body) : await customersApi.createCustomer(body); setOpen(false); load(); } catch (e: any) { setError(e.response?.data?.detail || 'Failed to save customer. Please try again.'); } finally { setSaving(false); } };
  const remove = async () => { if (!target) return; setSaving(true); try { await customersApi.deleteCustomer(target.id); setTarget(null); load(); } catch (e: any) { setError(e.response?.data?.detail || 'Failed to remove customer.'); } finally { setSaving(false); } };
  if (!roles.includes(user?.role ?? '')) return <Alert severity="error">Customer management is available to authorized roles only.</Alert>;

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Customers</Typography>
          <Typography color="text.secondary">Manage your customer database.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={create}>Add Customer</Button>
      </Stack>
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      <Paper>
        <CustomersListFilters 
          search={search} setSearch={setSearch}
          segment={segment} setSegment={setSegment}
          status={status} setStatus={setStatus}
          segmentColors={segmentColors}
        />
        <CustomersListTable 
          loading={loading} shown={shown} segmentColors={segmentColors}
          edit={edit} setTarget={setTarget} create={create}
        />
      </Paper>
      <CustomerFormDialog 
        open={open} saving={saving} editing={Boolean(editing)}
        form={form} errors={errors} setOpen={setOpen}
        change={change} save={save}
      />
      <CustomerDeleteDialog 
        open={Boolean(target)} saving={saving}
        setTarget={setTarget} remove={remove}
      />
    </Box>
  );
}
