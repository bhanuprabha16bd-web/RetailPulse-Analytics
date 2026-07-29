import { useState, useEffect } from 'react';
import {
  Avatar, Box, Button, Card, CardContent, CircularProgress, Divider, Grid,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
  Alert, Chip, useTheme
} from '@mui/material';
import {
  ArrowBack, AttachMoney, Groups, PersonAdd, Repeat, ShoppingCart,
  TrendingUp, PeopleAltOutlined
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { customersApi, Customer, CustomerAnalyticsResponse } from '../../api/customers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#2878f0', '#3bb66b', '#f4a621', '#9552d4', '#ef596f', '#18a4a4'];
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

type KPIProps = {
  title: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
  color: string;
};

const KPICard = ({ title, value, note, icon, color }: KPIProps) => (
  <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
    <CardContent sx={{ p: '12px !important' }}>
      <Stack direction="row" spacing={1.2} alignItems="center">
        <Avatar sx={{ width: 34, height: 34, bgcolor: color }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ lineHeight: 1.1, display: 'block' }}>{title}</Typography>
          <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.3, whiteSpace: 'nowrap' }}>{value}</Typography>
        </Box>
      </Stack>
      <Typography variant="caption" color="success.main" sx={{ display: 'block', textAlign: 'right', mt: .5 }}>{note}</Typography>
    </CardContent>
  </Card>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ height: 205 }}>{children}</Box>
    </CardContent>
  </Card>
);

export default function CustomerAnalytics() {
  const [data, setData] = useState<CustomerAnalyticsResponse | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    Promise.all([
      customersApi.getAnalytics(),
      customersApi.getCustomers({ sortBy: 'customer_since', sortOrder: 'desc' })
    ])
      .then(([analytics, customers]) => {
        setData(analytics);
        setRecentCustomers(customers.slice(0, 5));
        setError(null);
      })
      .catch((err: any) => setError(err.response?.data?.detail || 'Failed to load customer analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Alert severity="error">{error}</Alert></Box>;
  if (!data) return null;

  const kpis: KPIProps[] = [
    { title: 'Total Customers', value: data.totalCustomers.toLocaleString(), note: 'All time', icon: <Groups fontSize="small" />, color: '#2878f0' },
    { title: 'Active Customers', value: data.activeCustomers.toLocaleString(), note: 'Currently active', icon: <PeopleAltOutlined fontSize="small" />, color: '#21ae68' },
    { title: 'New Customers (This Month)', value: data.newCustomers.toLocaleString(), note: 'Current month', icon: <PersonAdd fontSize="small" />, color: '#9552d4' },
    { title: 'Returning Customers', value: data.returningCustomers.toLocaleString(), note: 'More than 1 order', icon: <Repeat fontSize="small" />, color: '#f19719' },
    { title: 'Average Customer Spend', value: currency.format(data.averageCustomerSpend), note: 'Per customer', icon: <AttachMoney fontSize="small" />, color: '#11a99b' },
    { title: 'Total Revenue Generated', value: currency.format(data.totalRevenue), note: 'Linked customer sales', icon: <TrendingUp fontSize="small" />, color: '#e8a719' },
    { title: 'Avg. Purchase Frequency', value: data.averagePurchaseFrequency.toFixed(2), note: 'Orders per customer', icon: <ShoppingCart fontSize="small" />, color: '#e94e68' },
  ];

  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1} sx={{ mb: 2.5 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} size="small">Customers</Button>
            <Typography variant="h5" fontWeight={800}>Customer Management &amp; Analytics</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ ml: { md: 10 } }}>Manage customers and gain powerful insights.</Typography>
        </Box>
        <Chip label="Live customer data" color="success" size="small" variant="outlined" />
      </Stack>

      <Grid container spacing={1.25} sx={{ mb: 1.5 }}>
        {kpis.map((kpi) => <Grid item xs={12} sm={6} md={4} lg key={kpi.title}><KPICard {...kpi} /></Grid>)}
      </Grid>

      <Grid container spacing={1.5}>
        <Grid item xs={12} xl={9}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2, mb: 1.5 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.25 }}>Customer Analytics</Typography>
              <Grid container spacing={1.25}>
                <Grid item xs={12} md={6} lg={3}>
                  <ChartCard title="Customer Growth Trend"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.growthTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><RechartsTooltip /><Line type="monotone" dataKey="value" stroke={theme.palette.primary.main} strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></ChartCard>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <ChartCard title="New vs Returning Customers"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.newVsReturning} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={42} outerRadius={67} paddingAngle={3}>{data.newVsReturning.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 2 }} /><RechartsTooltip /></PieChart></ResponsiveContainer></ChartCard>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <ChartCard title="Revenue by Customer Type"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.revenueByType} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={42} outerRadius={67} paddingAngle={3}>{data.revenueByType.map((entry, index) => <Cell key={entry.name} fill={COLORS[(index + 2) % COLORS.length]} />)}</Pie><Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 2 }} /><RechartsTooltip formatter={(value: number) => currency.format(value)} /></PieChart></ResponsiveContainer></ChartCard>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <ChartCard title="Top 10 Customers by Revenue"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.topCustomers.slice(0, 5)} layout="vertical" margin={{ left: 4 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} /><RechartsTooltip formatter={(value: number) => currency.format(value)} /><Bar dataKey="value" fill={theme.palette.primary.main} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></ChartCard>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <ChartCard title="Customer Purchase Frequency"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.purchaseFrequencyDistribution}><XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={0} /><YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="value" fill="#2878f0" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <ChartCard title="Customer Distribution by Location"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.locationDistribution.slice(0, 6)} layout="vertical" margin={{ left: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={62} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="value" fill="#6b8ce8" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></ChartCard>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <ChartCard title="Monthly Customer Acquisition"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthlyAcquisition}><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="value" fill="#2b7ce9" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                  <ChartCard title="Customer Spending Distribution"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.spendingDistribution} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={42} outerRadius={67} paddingAngle={3}>{data.spendingDistribution.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Legend iconSize={8} wrapperStyle={{ fontSize: 9, paddingTop: 2 }} /><RechartsTooltip /></PieChart></ResponsiveContainer></ChartCard>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Customer Segmentation</Typography>
              <Table size="small"><TableHead><TableRow><TableCell>Segment</TableCell><TableCell>Criteria</TableCell><TableCell align="right">Customers</TableCell></TableRow></TableHead><TableBody>
                {data.segmentDistribution.map((segment, index) => <TableRow key={segment.name}><TableCell><Stack direction="row" spacing={.75} alignItems="center"><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[index] }} />{segment.name}</Stack></TableCell><TableCell>{['0–1 orders', '2–4 orders', '5–9 orders', '10+ orders'][index] ?? '—'}</TableCell><TableCell align="right">{segment.value}</TableCell></TableRow>)}
              </TableBody></Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} xl={3}>
          <Stack spacing={1.5}>
            <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle2" fontWeight={800}>Top Customers</Typography><Button size="small" onClick={() => navigate('/customers')}>View all</Button></Stack>
                {data.topCustomers.slice(0, 5).map((customer, index) => <Stack key={customer.name} direction="row" alignItems="center" spacing={1} sx={{ py: .8 }}><Avatar sx={{ width: 27, height: 27, bgcolor: COLORS[index], fontSize: 12 }}>{customer.name.charAt(0)}</Avatar><Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>{customer.name}</Typography><Typography variant="caption" fontWeight={700}>{currency.format(customer.value)}</Typography></Stack>)}
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="subtitle2" fontWeight={800}>Recent Customers</Typography><Button size="small" onClick={() => navigate('/customers')}>View all</Button></Stack>
                {recentCustomers.map((customer) => <Stack key={customer.id} direction="row" alignItems="center" spacing={1} sx={{ py: .8 }}><Avatar sx={{ width: 27, height: 27, bgcolor: 'primary.light', fontSize: 12 }}>{customer.fullName.charAt(0)}</Avatar><Box sx={{ flexGrow: 1, minWidth: 0 }}><Typography variant="body2" noWrap>{customer.fullName}</Typography><Typography variant="caption" color="text.secondary">{customer.city || 'Location unavailable'}</Typography></Box><Tooltip title={customer.status}><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: customer.status === 'Active' ? 'success.main' : 'text.disabled' }} /></Tooltip></Stack>)}
              </CardContent>
            </Card>
            <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Quick Actions</Typography>
                <Stack spacing={1}><Button variant="contained" size="small" onClick={() => navigate('/customers')}>Add New Customer</Button><Button variant="outlined" size="small" onClick={() => navigate('/customers')}>View Customer List</Button></Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
