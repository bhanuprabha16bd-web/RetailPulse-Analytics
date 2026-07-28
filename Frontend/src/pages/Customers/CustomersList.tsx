import { useState, useEffect, useMemo } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, InputAdornment, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, MenuItem, Grid, Tooltip
} from '@mui/material';
import { Add, DeleteOutlined, EditOutlined, Search, Visibility, Dashboard as DashboardIcon, Download as DownloadIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { customersApi, Customer } from '../../api/customers';
import { useAuth } from '../../context/AuthContext';

const emptyForm: Partial<Customer> = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  state: '',
  country: '',
  customerType: 'Retail',
  preferredSalesChannel: 'Retail Store',
  status: 'Active'
};

const adminRoles = ['Super Admin', 'Company Owner', 'Company Admin', 'Analyst'];

const CustomersList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>(emptyForm);
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    customerType: '',
    statusFilter: '',
    city: '',
    state: '',
    country: '',
    regDateStart: '',
    regDateEnd: '',
    sortBy: 'customer_since',
    sortOrder: 'desc'
  });

  const loadCustomers = () => {
    setLoading(true);
    const params: any = {};
    if (search) params.search = search;
    if (filters.customerType) params.customerType = filters.customerType;
    if (filters.statusFilter) params.statusFilter = filters.statusFilter;
    if (filters.city) params.city = filters.city;
    if (filters.state) params.state = filters.state;
    if (filters.country) params.country = filters.country;
    if (filters.regDateStart) params.regDateStart = filters.regDateStart;
    if (filters.regDateEnd) params.regDateEnd = filters.regDateEnd;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    customersApi.getCustomers(params)
      .then((data) => { setCustomers(data); setError(null); })
      .catch((err: any) => setError(err.response?.data?.detail || 'Unable to load customers.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (adminRoles.includes(user?.role ?? '')) {
      // Debounce search slightly
      const timer = setTimeout(() => {
        loadCustomers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user?.role, search, filters]);

  const handleExport = async () => {
    try {
      const blob = await customersApi.exportCustomersList();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customers_list.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      setError('Unable to export customers list.');
    }
  };

  const visibleCustomers = customers; // Using API-side search/filtering now

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      fullName: customer.fullName,
      email: customer.email || '',
      phone: customer.phone || '',
      dateOfBirth: customer.dateOfBirth ? customer.dateOfBirth.split('T')[0] : '',
      gender: customer.gender || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || '',
      customerType: customer.customerType,
      preferredSalesChannel: customer.preferredSalesChannel,
      status: customer.status
    });
    setDialogOpen(true);
  };

  const saveCustomer = async () => {
    if (!form.fullName?.trim()) { setError('Full name is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      
      if (editing) await customersApi.updateCustomer(editing.id, payload);
      else await customersApi.createCustomer(payload);
      
      setDialogOpen(false);
      loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to save customer.');
    } finally { setSaving(false); }
  };

  const deleteCustomer = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await customersApi.deleteCustomer(deleteTarget.id);
      setDeleteTarget(null);
      loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to delete customer. They might have existing sales.');
      setDeleteTarget(null);
    } finally { setSaving(false); }
  };

  const toggleStatus = async (customer: Customer) => {
    try {
      await customersApi.toggleStatus(customer.id);
      loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to update status.');
    }
  };

  if (!adminRoles.includes(user?.role ?? '')) {
    return <Alert severity="error">Customer management is available to authorized roles only.</Alert>;
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>Customers</Typography>
          <Typography color="text.secondary">Manage your customer database and view insights.</Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>Export</Button>
          <Button variant="outlined" startIcon={<DashboardIcon />} onClick={() => navigate('/customers/analytics')}>Dashboard</Button>
          <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Customer</Button>
        </Stack>
      </Stack>
      
      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField 
            size="small" 
            label="Search customers (Name, Email, Phone, ID)" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }} 
            sx={{ minWidth: { xs: '100%', sm: 400 }, flexGrow: 1 }} 
          />
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </Button>
        </Box>
        
        {showFilters && (
          <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4} md={3}>
                <TextField select fullWidth size="small" label="Type" value={filters.customerType} onChange={(e) => setFilters({...filters, customerType: e.target.value})}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Retail">Retail</MenuItem>
                  <MenuItem value="Wholesale">Wholesale</MenuItem>
                  <MenuItem value="Corporate">Corporate</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField select fullWidth size="small" label="Status" value={filters.statusFilter} onChange={(e) => setFilters({...filters, statusFilter: e.target.value})}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField select fullWidth size="small" label="Sort By" value={filters.sortBy} onChange={(e) => setFilters({...filters, sortBy: e.target.value})}>
                  <MenuItem value="customer_since">Customer Since</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="total_spend">Total Spend</MenuItem>
                  <MenuItem value="total_orders">Total Orders</MenuItem>
                  <MenuItem value="last_purchase">Last Purchase</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField select fullWidth size="small" label="Order" value={filters.sortOrder} onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}>
                  <MenuItem value="desc">Descending</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField fullWidth size="small" label="City" value={filters.city} onChange={(e) => setFilters({...filters, city: e.target.value})} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField fullWidth size="small" type="date" label="Registered After" slotProps={{ inputLabel: { shrink: true } }} value={filters.regDateStart} onChange={(e) => setFilters({...filters, regDateStart: e.target.value})} />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <TextField fullWidth size="small" type="date" label="Registered Before" slotProps={{ inputLabel: { shrink: true } }} value={filters.regDateEnd} onChange={(e) => setFilters({...filters, regDateEnd: e.target.value})} />
              </Grid>
              <Grid item xs={12} sm={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
                <Button variant="text" color="primary" onClick={() => setFilters({ customerType: '', statusFilter: '', city: '', state: '', country: '', regDateStart: '', regDateEnd: '', sortBy: 'customer_since', sortOrder: 'desc' })}>
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleCustomers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{customer.customerId}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{customer.fullName}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{customer.email || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{customer.phone || '—'}</Typography>
                    </TableCell>
                    <TableCell><Chip size="small" label={customer.customerType} variant="outlined" /></TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={customer.status} 
                        color={customer.status === 'Active' ? 'success' : 'default'} 
                        onClick={() => toggleStatus(customer)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Profile">
                        <IconButton onClick={() => navigate(`/customers/${customer.id}`)}>
                          <Visibility fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Customer">
                        <IconButton onClick={() => openEdit(customer)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Customer">
                        <IconButton color="error" onClick={() => setDeleteTarget(customer)}>
                          <DeleteOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {!visibleCustomers.length && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      {search ? 'No customers match your search.' : 'No customers have been added yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth required label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth select label="Customer Type" value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value as any })}>
                  <MenuItem value="Retail">Retail</MenuItem>
                  <MenuItem value="Wholesale">Wholesale</MenuItem>
                  <MenuItem value="Corporate">Corporate</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth select label="Preferred Channel" value={form.preferredSalesChannel} onChange={(e) => setForm({ ...form, preferredSalesChannel: e.target.value as any })}>
                  <MenuItem value="Retail Store">Retail Store</MenuItem>
                  <MenuItem value="Online Store">Online Store</MenuItem>
                  <MenuItem value="Marketplace">Marketplace</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField fullWidth label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveCustomer} disabled={saving}>{saving ? 'Saving…' : 'Save Customer'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !saving && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Customer?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete <strong>{deleteTarget?.fullName}</strong>? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteCustomer} disabled={saving}>{saving ? 'Deleting…' : 'Delete'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomersList;
