import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Grid, MenuItem, Paper,
  Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Download, Refresh, Print, AccountBalanceWallet, CalendarMonth, LocalOffer, ReceiptLong, ShoppingCart, Paid } from '@mui/icons-material';
import {
  Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { axiosPrivate } from '../api/axios';
import { useQuery } from '@tanstack/react-query';

type Interval = 'daily' | 'weekly' | 'monthly';
type ProductSort = 'revenue' | 'units_sold';

interface AnalyticsData {
  kpis: { total_revenue: number; total_orders: number; average_order_value: number; total_items_sold: number; total_discount: number; total_tax: number };
  sales_overview: { period: string; revenue: number }[];
  sales_vs_orders: { period: string; revenue: number; orders: number }[];
  top_products: { name: string; units_sold: number; revenue: number }[];
  top_customers: { name: string; orders: number; total_spend: number; average_order_value: number }[];
  payment_analysis: { method: string; revenue: number; orders: number }[];
  recent_sales: { invoice: string; date: string; customer: string; amount: number; payment_method: string; status: string }[];
}

const money = (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
const emptyData: AnalyticsData = { kpis: { total_revenue: 0, total_orders: 0, average_order_value: 0, total_items_sold: 0, total_discount: 0, total_tax: 0 }, sales_overview: [], sales_vs_orders: [], top_products: [], top_customers: [], payment_analysis: [], recent_sales: [] };
const paymentColors = ['#5865f2', '#7d8ff7', '#aab8ff', '#f4ad36', '#cbd5e1'];

export default function SalesAnalytics() {
  const [interval, setInterval] = useState<Interval>('daily');
  const [productSort, setProductSort] = useState<ProductSort>('revenue');
  const [filters, setFilters] = useState({ start_date: '', end_date: '', product_id: '', category_id: '', customer_id: '', sales_channel: '', payment_method: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const buildParams = () => {
      const params = new URLSearchParams({ interval, product_sort: productSort });
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params.set(key, key === 'start_date' ? `${value}T00:00:00` : key === 'end_date' ? `${value}T23:59:59` : value);
      });
      return params;
  };
  const analyticsQuery = useQuery({ queryKey: ['sales-analytics', interval, productSort, appliedFilters], queryFn: async () => (await axiosPrivate.get<AnalyticsData>(`/analytics/sales?${buildParams()}`)).data, staleTime: 30_000 });
  const optionsQuery = useQuery({ queryKey: ['sales-analytics-filters'], queryFn: async () => { const [products, categories, customers] = await Promise.all([axiosPrivate.get('/products/'), axiosPrivate.get('/categories/'), axiosPrivate.get('/customers/')]); return { products: products.data, categories: categories.data, customers: customers.data }; }, staleTime: 5 * 60_000 });
  const data = analyticsQuery.data ?? null;
  const loading = analyticsQuery.isLoading || analyticsQuery.isFetching;
  const error = analyticsQuery.error instanceof Error ? analyticsQuery.error.message : '';
  const filterOptions = optionsQuery.data ?? { products: [], categories: [], customers: [] };
  const applyFilters = () => {
    if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) return;
    setAppliedFilters(filters);
  };
  const selectPeriod = (period: string) => {
    const end = new Date(); const start = new Date();
    if (period === 'today') start.setHours(0, 0, 0, 0);
    if (period === '7') start.setDate(end.getDate() - 6);
    if (period === '30') start.setDate(end.getDate() - 29);
    if (period === 'month') start.setDate(1);
    if (period === 'last-month') { start.setMonth(end.getMonth() - 1, 1); end.setDate(0); }
    const toInput = (date: Date) => date.toISOString().slice(0, 10);
    const next = period === 'custom' ? { ...filters, start_date: '', end_date: '' } : { ...filters, start_date: toInput(start), end_date: toInput(end) };
    setFilters(next); setAppliedFilters(next);
  };

  const products = useMemo(() => [...(data?.top_products ?? [])].sort((a, b) => b[productSort] - a[productSort]), [data, productSort]);
  const metrics: [string, number, boolean, ReactNode, string][] = [
    ['Total Revenue', data?.kpis.total_revenue ?? 0, true, <AccountBalanceWallet />, '#8b5cf6'], ['Total Orders', data?.kpis.total_orders ?? 0, false, <CalendarMonth />, '#3b82f6'],
    ['Average Order Value', data?.kpis.average_order_value ?? 0, true, <ShoppingCart />, '#f97316'], ['Total Items Sold', data?.kpis.total_items_sold ?? 0, false, <ReceiptLong />, '#22c55e'],
    ['Total Discount', data?.kpis.total_discount ?? 0, true, <LocalOffer />, '#ec4899'], ['Total Tax', data?.kpis.total_tax ?? 0, true, <Paid />, '#6366f1'],
  ];
  const exportCsv = () => {
    const report = data ?? emptyData;
    const rows = [
      ['Metric', 'Value'], ...metrics.map(([label, value]) => [label, String(value)]), [],
      ['Top Products'], ['Product', 'Units Sold', 'Revenue'], ...products.map(p => [p.name, String(p.units_sold), String(p.revenue)]), [],
      ['Top Customers'], ['Customer', 'Orders', 'Total Spend', 'Average Order Value'], ...report.top_customers.map(c => [c.name, String(c.orders), String(c.total_spend), String(c.average_order_value)]),
    ];
    const content = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    link.download = 'sales-analytics.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', mb: 3, flexWrap: 'wrap' }}>
      <Box><Typography variant="h4" fontWeight={700}>Sales Analytics</Typography><Typography color="text.secondary">Revenue, order, product and customer performance at a glance.</Typography></Box>
      <Box sx={{ display: 'flex', gap: 1 }}><Button variant="outlined" startIcon={<Refresh />} onClick={() => analyticsQuery.refetch()} disabled={loading}>Refresh</Button><Button variant="outlined" startIcon={<Download />} onClick={exportCsv} disabled={!data}>Export CSV</Button><Button variant="contained" startIcon={<Print />} onClick={() => window.print()} disabled={!data}>Export PDF</Button></Box>
    </Box>

    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup size="small" exclusive onChange={(_, value) => value && selectPeriod(value)}><ToggleButton value="today">Today</ToggleButton><ToggleButton value="7">Last 7 Days</ToggleButton><ToggleButton value="30">Last 30 Days</ToggleButton><ToggleButton value="month">This Month</ToggleButton><ToggleButton value="last-month">Last Month</ToggleButton><ToggleButton value="custom">Custom</ToggleButton></ToggleButtonGroup>
        <TextField size="small" label="Start date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
        <TextField size="small" label="End date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
        <TextField size="small" select label="Product" sx={{ minWidth: 145 }} value={filters.product_id} onChange={e => setFilters({ ...filters, product_id: e.target.value })}><MenuItem value="">All products</MenuItem>{filterOptions.products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}</TextField>
        <TextField size="small" select label="Category" sx={{ minWidth: 145 }} value={filters.category_id} onChange={e => setFilters({ ...filters, category_id: e.target.value })}><MenuItem value="">All categories</MenuItem>{filterOptions.categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>
        <TextField size="small" select label="Customer" sx={{ minWidth: 145 }} value={filters.customer_id} onChange={e => setFilters({ ...filters, customer_id: e.target.value })}><MenuItem value="">All customers</MenuItem>{filterOptions.customers.map(c => <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>)}</TextField>
        <TextField size="small" select label="Channel" sx={{ minWidth: 150 }} value={filters.sales_channel} onChange={e => setFilters({ ...filters, sales_channel: e.target.value })}><MenuItem value="">All channels</MenuItem><MenuItem value="Retail Store">Retail Store</MenuItem><MenuItem value="Online Store">Online Store</MenuItem><MenuItem value="Marketplace">Marketplace</MenuItem></TextField>
        <TextField size="small" select label="Payment" sx={{ minWidth: 145 }} value={filters.payment_method} onChange={e => setFilters({ ...filters, payment_method: e.target.value })}><MenuItem value="">All methods</MenuItem><MenuItem value="Cash">Cash</MenuItem><MenuItem value="Card">Card</MenuItem><MenuItem value="UPI">UPI</MenuItem><MenuItem value="Bank Transfer">Bank Transfer</MenuItem></TextField>
        <Button variant="contained" onClick={applyFilters} disabled={loading || (!!filters.start_date && !!filters.end_date && filters.start_date > filters.end_date)}>Apply filters</Button>
      </Box>
    </Paper>
    {!!filters.start_date && !!filters.end_date && filters.start_date > filters.end_date && <Alert severity="warning" sx={{ mb: 2 }}>Start date must be before or equal to end date.</Alert>}
    {error && <Alert severity="error" sx={{ mb: 3 }}>Unable to load sales analytics. Please refresh or adjust your filters.</Alert>}

    <Grid container spacing={1.5} sx={{ mb: 2 }}>{metrics.map(([label, value, isMoney, icon, accent]) => <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={String(label)}><Card variant="outlined" sx={{ minHeight: 108 }}><CardContent sx={{ p: '14px !important' }}>{loading && !data ? <Skeleton width="70%" height={50} /> : <><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="caption" fontWeight={600} color="text.secondary">{label}</Typography><Box sx={{ p: .8, borderRadius: 2, color: accent, bgcolor: `${accent}18`, display: 'flex' }}>{icon}</Box></Box><Typography variant="h6" mt={.8} fontWeight={800}>{isMoney ? money(Number(value)) : Number(value).toLocaleString()}</Typography><Typography variant="caption" color="success.main">▲ Updated for selection</Typography></>}</CardContent></Card></Grid>)}</Grid>

    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, lg: 4 }}><Paper variant="outlined" sx={{ p: 2, height: 330 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="h6">Sales Overview</Typography><ToggleButtonGroup size="small" exclusive value={interval} onChange={(_, v) => v && setInterval(v)}><ToggleButton value="daily">Daily</ToggleButton><ToggleButton value="weekly">Weekly</ToggleButton><ToggleButton value="monthly">Monthly</ToggleButton></ToggleButtonGroup></Box><ChartLoading loading={loading} empty={!data?.sales_overview.length}><ResponsiveContainer width="100%" height="90%"><LineChart data={data?.sales_overview}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis tickFormatter={v => `$${v}`} /><Tooltip formatter={(v: number) => money(v)} /><Line dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={3} /></LineChart></ResponsiveContainer></ChartLoading></Paper></Grid>
      <Grid size={{ xs: 12, lg: 4 }}><Paper variant="outlined" sx={{ p: 2, height: 330 }}><Typography variant="h6">Sales vs Orders</Typography><ChartLoading loading={loading} empty={!data?.sales_vs_orders.length}><ResponsiveContainer width="100%" height="90%"><ComposedChart data={data?.sales_vs_orders} margin={{ top: 16, right: 10, left: 4, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" interval="preserveStartEnd" tick={{ fontSize: 10 }} /><YAxis yAxisId="revenue" width={42} tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} /><YAxis yAxisId="orders" hide /><Tooltip formatter={(value: number, name: string) => [name === 'Revenue' ? money(value) : value.toLocaleString(), name]} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar yAxisId="revenue" dataKey="revenue" name="Revenue" fill="#4f6bed" radius={[3, 3, 0, 0]} /><Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></ChartLoading></Paper></Grid>
      <Grid size={{ xs: 12, lg: 4 }}><Paper variant="outlined" sx={{ p: 2, height: 330 }}><Typography variant="h6">Payment Method Analysis</Typography><ChartLoading loading={loading} empty={!data?.payment_analysis.length}><Box sx={{ height: '90%', display: 'flex', alignItems: 'center' }}><ResponsiveContainer width="58%" height="100%"><PieChart><Pie data={data?.payment_analysis} dataKey="revenue" nameKey="method" innerRadius={48} outerRadius={75}>{(data?.payment_analysis ?? []).map((_, i) => <Cell key={i} fill={paymentColors[i % paymentColors.length]} />)}</Pie><Tooltip formatter={(v: number) => money(v)} /></PieChart></ResponsiveContainer><Box>{(data?.payment_analysis ?? []).map((p, i) => <Typography key={p.method} variant="caption" display="block" mb={1}><Box component="span" sx={{ color: paymentColors[i], mr: .7 }}>●</Box>{p.method} <b>{money(p.revenue)}</b></Typography>)}</Box></Box></ChartLoading></Paper></Grid>
    </Grid>

    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 6 }}><Paper variant="outlined" sx={{ p: 2 }}><Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="h6">Top Performing Products</Typography><ToggleButtonGroup size="small" exclusive value={productSort} onChange={(_, v) => v && setProductSort(v)}><ToggleButton value="revenue">Revenue</ToggleButton><ToggleButton value="units_sold">Quantity</ToggleButton></ToggleButtonGroup></Box><DataTable headers={['Product', 'Units Sold', 'Revenue']} rows={products.map(p => [p.name, p.units_sold.toLocaleString(), money(p.revenue)])} loading={loading} /></Paper></Grid>
      <Grid size={{ xs: 12, lg: 4 }}><Paper variant="outlined" sx={{ p: 2 }}><Typography variant="h6">Customer Revenue Analysis</Typography><DataTable headers={['Customer', 'Orders', 'Total Spend', 'Avg. Order Value']} rows={(data?.top_customers ?? []).map(c => [c.name, c.orders.toLocaleString(), money(c.total_spend), money(c.average_order_value)])} loading={loading} /></Paper></Grid>
      <Grid size={{ xs: 12, lg: 4 }}><Paper variant="outlined" sx={{ p: 2 }}><Typography variant="h6">Recent Sales</Typography><DataTable headers={['Order ID', 'Customer', 'Amount']} rows={(data?.recent_sales ?? []).map(s => [s.invoice, s.customer, money(s.amount)])} loading={loading} /></Paper></Grid>
    </Grid>
  </Box>;
}

function ChartLoading({ loading, empty, children }: { loading: boolean; empty: boolean; children: React.ReactNode }) { if (loading) return <Box sx={{ height: '90%', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>; if (empty) return <Box sx={{ height: '90%', display: 'grid', placeItems: 'center' }}><Typography color="text.secondary">No sales data for this selection.</Typography></Box>; return <>{children}</>; }
function DataTable({ headers, rows, loading }: { headers: string[]; rows: string[][]; loading: boolean }) { return <TableContainer><Table size="small"><TableHead><TableRow>{headers.map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{loading ? <TableRow><TableCell colSpan={headers.length}><Skeleton /></TableCell></TableRow> : rows.length ? rows.map((row, i) => <TableRow key={`${row[0]}-${i}`}>{row.map((cell, j) => <TableCell key={j} align={j ? 'right' : 'left'}>{cell}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={headers.length} align="center">No data available.</TableCell></TableRow>}</TableBody></Table></TableContainer>; }
