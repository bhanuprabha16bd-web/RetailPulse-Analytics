import { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CircularProgress, 
  Alert, 
  Grid, 
  Stack, 
  Button, 
  useTheme 
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { customersApi, CustomerAnalyticsResponse } from '../../api/customers';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const KPICard = ({ title, value, prefix = '' }: { title: string; value: string | number; prefix?: string }) => (
  <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
    <CardContent>
      <Typography color="text.secondary" variant="subtitle2" gutterBottom fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
        {title}
      </Typography>
      <Typography variant="h4" fontWeight="bold">
        {prefix}{value}
      </Typography>
    </CardContent>
  </Card>
);

export default function CustomerAnalytics() {
  const [data, setData] = useState<CustomerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customersApi.getAnalytics();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load customer analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Alert severity="error">{error}</Alert></Box>;
  if (!data) return null;

  return (
    <Box p={3} maxWidth="xl" mx="auto">
      <Stack direction="row" alignItems="center" spacing={2} mb={4}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} variant="outlined" size="small">
          Back
        </Button>
        <Typography variant="h4" fontWeight="bold">Customer Analytics</Typography>
      </Stack>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Total Customers" value={data.totalCustomers} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Active Customers" value={data.activeCustomers} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="New Customers (MTD)" value={data.newCustomers} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Returning Customers" value={data.returningCustomers} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KPICard title="Average Spend" value={data.averageCustomerSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })} prefix="₹" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KPICard title="Total Revenue" value={data.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })} prefix="₹" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KPICard title="Avg Purchase Freq" value={data.averagePurchaseFrequency.toFixed(1)} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Customer Growth Trend */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Customer Growth Trend</Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.growthTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: 8 }} />
                    <Line type="monotone" dataKey="value" stroke={theme.palette.primary.main} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Segment Distribution */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Customer Segmentation</Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.segmentDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {data.segmentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Acquisition */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Monthly Acquisition</Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyAcquisition}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="value" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue by Customer Type */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Revenue by Customer Type</Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.revenueByType} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {data.revenueByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top 10 Customers */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={2}>Top 10 Customers by Revenue</Typography>
              <Box height={400}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topCustomers} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} />
                    <RechartsTooltip formatter={(value: number) => `₹${value.toLocaleString()}`} contentStyle={{ borderRadius: 8 }} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="value" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
