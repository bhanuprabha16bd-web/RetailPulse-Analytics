import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, InputLabel, MenuItem, Paper,
  Select, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TablePagination, TableRow,
  Tabs, TextField, Typography
} from '@mui/material';
import { Download, PlayArrow, Refresh, Save, Delete, Edit } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';

const reportTypes = [
  { value: 'sales', label: 'Sales Report' },
  { value: 'inventory', label: 'Inventory Report' },
  { value: 'customer', label: 'Customer Report' },
  { value: 'product-performance', label: 'Product Performance Report' },
  { value: 'stock-movement', label: 'Stock Movement Report' },
];

type Filters = { start_date: string; end_date: string; product_id: string; category_id: string; brand: string; customer_id: string; sales_status: string; stock_status: string; user_id: string };
type ReportResponse = { report_name: string; filters: Record<string, string | number>; rows: Record<string, unknown>[]; total: number; page: number; limit: number };
type Schedule = { id: number; report_type: string; filters: Record<string, unknown>; frequency: string; execution_time: string; recipients: string[]; format: string; is_active: boolean; last_run_at?: string; last_status?: string; last_error?: string };
type History = { id: number; report_type: string; generated_by: number; filters: Record<string, unknown>; format: string; status: string; error_message?: string; created_at: string };

const initialFilters: Filters = { start_date: '', end_date: '', product_id: '', category_id: '', brand: '', customer_id: '', sales_status: '', stock_status: '', user_id: '' };

function reportLabel(value: string) { return reportTypes.find(type => type.value === value)?.label || value; }
function humanize(value: string) { return value.replace(/_/g, ' '); }

export default function Reports() {
  const [tab, setTab] = useState(0);
  const [reportType, setReportType] = useState('sales');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [schedule, setSchedule] = useState({ frequency: 'Weekly', execution_time: '09:00', recipients: '', format: 'CSV', is_active: true });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const { user } = useAuth();
  const canManageSchedules = ['Company Owner', 'Company Admin', 'Super Admin'].includes(user?.role || '');

  const query = (extra: Record<string, string | number> = {}) => {
    const params = new URLSearchParams({ report_type: reportType, page: String(page + 1), limit: '25', sort_by: sortBy, sort_order: sortOrder, ...extra });
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    return params;
  };

  const loadReport = async () => {
    setLoading(true); setError('');
    try { setReport((await axiosPrivate.get<ReportResponse>('/reports/data', { params: query() })).data); }
    catch (err: any) { setError(err.response?.data?.detail || 'Unable to generate this report.'); }
    finally { setLoading(false); }
  };

  const loadSecondaryData = async () => {
    try {
      const [historyResponse, schedulesResponse] = await Promise.all([axiosPrivate.get<History[]>('/reports/history'), axiosPrivate.get<Schedule[]>('/reports/schedules')]);
      setHistory(historyResponse.data); setSchedules(schedulesResponse.data);
    } catch (err: any) { setError(err.response?.data?.detail || 'Unable to load report history.'); }
  };

  useEffect(() => { loadSecondaryData(); }, []);
  useEffect(() => { if (report) loadReport(); }, [page]);

  const updateFilter = (key: keyof Filters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(0); };
  const changeSort = (key: string) => { setSortOrder(sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc'); setSortBy(key); setPage(0); setTimeout(loadReport, 0); };

  const exportReport = async (format: 'CSV' | 'PDF') => {
    try {
      const response = await axiosPrivate.get('/reports/export', { params: query({ report_format: format }), responseType: 'blob' });
      const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = `${reportType}_report.${format.toLowerCase()}`; link.click(); URL.revokeObjectURL(url); loadSecondaryData();
    } catch (err: any) { setError(err.response?.data?.detail || 'Unable to export this report.'); }
  };

  const saveSchedule = async () => {
    if (!canManageSchedules) { setError('Only Company Admin, Company Owner, or Super Admin users can create schedules.'); return; }
    if (!schedule.recipients.trim()) { setError('Add at least one recipient email.'); return; }
    setSavingSchedule(true); setError(''); setScheduleSuccess('');
    try {
      const payload = { report_type: reportType, filters, ...schedule, recipients: schedule.recipients.split(',').map(item => item.trim()).filter(Boolean) };
      if (editing) await axiosPrivate.patch(`/reports/schedules/${editing}`, payload); else await axiosPrivate.post('/reports/schedules', payload);
      setEditing(null); setSchedule({ frequency: 'Weekly', execution_time: '09:00', recipients: '', format: 'CSV', is_active: true }); setScheduleSuccess('Schedule saved successfully.'); await loadSecondaryData();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map(item => item.msg).join(', ') : detail || 'Unable to save schedule.');
    } finally { setSavingSchedule(false); }
  };

  const editSchedule = (item: Schedule) => { setEditing(item.id); setReportType(item.report_type); setFilters({ ...initialFilters, ...(item.filters as Partial<Filters>) }); setSchedule({ frequency: item.frequency, execution_time: item.execution_time, recipients: item.recipients.join(', '), format: item.format, is_active: item.is_active }); setTab(1); };
  const deleteSchedule = async (id: number) => { try { await axiosPrivate.delete(`/reports/schedules/${id}`); loadSecondaryData(); } catch (err: any) { setError(err.response?.data?.detail || 'Unable to delete schedule.'); } };
  const runSchedule = async (id: number) => { try { await axiosPrivate.post(`/reports/schedules/${id}/run`); loadSecondaryData(); } catch (err: any) { setError(err.response?.data?.detail || 'Scheduled report failed.'); } };

  const renderFilters = () => <Paper variant="outlined" sx={{ p: 2, mb: 2 }}><Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, flexWrap: 'wrap' }}>
    <FormControl size="small" sx={{ minWidth: 220 }}><InputLabel>Report type</InputLabel><Select value={reportType} label="Report type" onChange={event => setReportType(event.target.value)}>{reportTypes.map(type => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}</Select></FormControl>
    <TextField size="small" type="date" label="From" value={filters.start_date} onChange={event => updateFilter('start_date', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
    <TextField size="small" type="date" label="To" value={filters.end_date} onChange={event => updateFilter('end_date', event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
    <TextField size="small" label="Product ID" value={filters.product_id} onChange={event => updateFilter('product_id', event.target.value)} />
    <TextField size="small" label="Category ID" value={filters.category_id} onChange={event => updateFilter('category_id', event.target.value)} />
    <TextField size="small" label="Brand" value={filters.brand} onChange={event => updateFilter('brand', event.target.value)} />
    <TextField size="small" label="Customer ID" value={filters.customer_id} onChange={event => updateFilter('customer_id', event.target.value)} />
    <FormControl size="small" sx={{ minWidth: 145 }}><InputLabel>Sales status</InputLabel><Select value={filters.sales_status} label="Sales status" onChange={event => updateFilter('sales_status', event.target.value)}><MenuItem value="">All</MenuItem>{['Paid', 'Pending', 'Overdue'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
    <FormControl size="small" sx={{ minWidth: 145 }}><InputLabel>Stock status</InputLabel><Select value={filters.stock_status} label="Stock status" onChange={event => updateFilter('stock_status', event.target.value)}><MenuItem value="">All</MenuItem>{['In Stock', 'Low Stock', 'Out of Stock'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
  </Box></Paper>;

  const renderReport = () => <>
    {renderFilters()}
    <Stack direction="row" spacing={1} sx={{ mb: 2 }}><Button variant="contained" startIcon={<Refresh />} onClick={loadReport}>Generate Report</Button><Button variant="outlined" startIcon={<Download />} disabled={!report} onClick={() => exportReport('CSV')}>CSV</Button><Button variant="outlined" startIcon={<Download />} disabled={!report} onClick={() => exportReport('PDF')}>PDF</Button></Stack>
    {report && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Generated {report.report_name} with {report.total} matching records. Applied filters: {Object.keys(report.filters).length ? Object.entries(report.filters).map(([key, value]) => `${humanize(key)}=${value}`).join(', ') : 'None'}</Typography>}
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>{loading ? <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box> : report?.rows.length ? <Table size="small"><TableHead><TableRow>{Object.keys(report.rows[0]).map(key => <TableCell key={key} onClick={() => changeSort(key)} sx={{ fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}>{humanize(key)} {sortBy === key ? (sortOrder === 'desc' ? '↓' : '↑') : ''}</TableCell>)}</TableRow></TableHead><TableBody>{report.rows.map((row, index) => <TableRow key={index}>{Object.keys(report.rows[0]).map(key => <TableCell key={key} sx={{ whiteSpace: 'nowrap' }}>{row[key] == null ? '-' : String(row[key])}</TableCell>)}</TableRow>)}</TableBody></Table> : <Box sx={{ p: 6, textAlign: 'center' }}><Typography color="text.secondary">Generate a report to view matching data.</Typography></Box>}{report && <TablePagination component="div" count={report.total} page={page} rowsPerPage={25} onPageChange={(_, nextPage) => setPage(nextPage)} rowsPerPageOptions={[25]} />}</Paper>
  </>;

  return <Box sx={{ p: { xs: 1, md: 3 } }}><Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', mb: 2 }}><Box><Typography variant="h4" sx={{ fontWeight: 800 }}>Reports</Typography><Typography color="text.secondary">Generate, export, and schedule operational reports from your business data.</Typography></Box></Box>{error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}{scheduleSuccess && <Alert severity="success" onClose={() => setScheduleSuccess('')} sx={{ mb: 2 }}>{scheduleSuccess}</Alert>}<Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}><Tab label="Generate Report" /><Tab label="Scheduled Reports" /><Tab label="Report History" /></Tabs>{tab === 0 && renderReport()}{tab === 1 && <Paper variant="outlined" sx={{ p: 2 }}><Typography variant="h6" sx={{ mb: 1 }}>{editing ? 'Edit schedule' : 'Create schedule'}</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Choose a report and filters, set the delivery frequency and time, add recipient emails separated by commas, then select Save.</Typography>{!canManageSchedules && <Alert severity="info" sx={{ mb: 2 }}>Your role cannot create or edit schedules. Ask a Company Admin or Company Owner.</Alert>}{renderFilters()}<Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, alignItems: { md: 'center' } }}><FormControl size="small"><InputLabel>Frequency</InputLabel><Select value={schedule.frequency} label="Frequency" onChange={event => setSchedule({ ...schedule, frequency: event.target.value })}><MenuItem value="Daily">Daily</MenuItem><MenuItem value="Weekly">Weekly</MenuItem><MenuItem value="Monthly">Monthly</MenuItem></Select></FormControl><TextField size="small" type="time" label="Execution time" value={schedule.execution_time} onChange={event => setSchedule({ ...schedule, execution_time: event.target.value })} slotProps={{ inputLabel: { shrink: true } }} /><TextField fullWidth size="small" label="Recipients (comma-separated)" value={schedule.recipients} onChange={event => setSchedule({ ...schedule, recipients: event.target.value })} /><FormControl size="small"><InputLabel>Format</InputLabel><Select value={schedule.format} label="Format" onChange={event => setSchedule({ ...schedule, format: event.target.value })}><MenuItem value="CSV">CSV</MenuItem><MenuItem value="PDF">PDF</MenuItem></Select></FormControl><Box sx={{ display: 'flex', alignItems: 'center' }}><Switch checked={schedule.is_active} onChange={event => setSchedule({ ...schedule, is_active: event.target.checked })} /><Typography variant="body2">Active</Typography></Box><Button variant="contained" disabled={!canManageSchedules || savingSchedule} startIcon={savingSchedule ? <CircularProgress size={18} /> : <Save />} onClick={saveSchedule}>{savingSchedule ? 'Saving...' : 'Save schedule'}</Button></Box><Table sx={{ mt: 3 }} size="small"><TableHead><TableRow><TableCell>Report</TableCell><TableCell>Frequency</TableCell><TableCell>Next time</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell></TableRow></TableHead><TableBody>{schedules.map(item => <TableRow key={item.id}><TableCell>{reportLabel(item.report_type)}</TableCell><TableCell>{item.frequency}</TableCell><TableCell>{item.execution_time}</TableCell><TableCell><Chip size="small" label={item.last_status || (item.is_active ? 'Active' : 'Inactive')} color={item.last_status === 'Failed' ? 'error' : item.is_active ? 'success' : 'default'} /></TableCell><TableCell><Button size="small" startIcon={<PlayArrow />} onClick={() => runSchedule(item.id)}>Run</Button><Button size="small" startIcon={<Edit />} onClick={() => editSchedule(item)}>Edit</Button><Button size="small" color="error" startIcon={<Delete />} onClick={() => deleteSchedule(item.id)}>Delete</Button></TableCell></TableRow>)}</TableBody></Table></Paper>}{tab === 2 && <Paper variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Report</TableCell><TableCell>Generated</TableCell><TableCell>Format</TableCell><TableCell>Status</TableCell><TableCell>Filters</TableCell></TableRow></TableHead><TableBody>{history.map(item => <TableRow key={item.id}><TableCell>{reportLabel(item.report_type)}</TableCell><TableCell>{new Date(item.created_at).toLocaleString()}</TableCell><TableCell>{item.format}</TableCell><TableCell><Chip size="small" label={item.status} color={item.status === 'Success' ? 'success' : 'error'} /></TableCell><TableCell>{Object.keys(item.filters).length ? JSON.stringify(item.filters) : 'None'}</TableCell></TableRow>)}</TableBody></Table>{!history.length && <Box sx={{ p: 6, textAlign: 'center' }}><Typography color="text.secondary">No reports have been generated yet.</Typography></Box>}</Paper>}</Box>;
}
