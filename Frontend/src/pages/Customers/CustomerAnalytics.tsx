import { useState, useEffect } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { customersApi, Customer, CustomerAnalyticsResponse } from '../../api/customers';
import CustomerAnalyticsKPIs from './Analytics/CustomerAnalyticsKPIs';
import CustomerAnalyticsCharts from './Analytics/CustomerAnalyticsCharts';
import CustomerAnalyticsSidebar from './Analytics/CustomerAnalyticsSidebar';

export default function CustomerAnalytics() {
  const [data, setData] = useState<CustomerAnalyticsResponse | null>(null);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;
  if (!data) return null;



  return (
    <Box sx={{ maxWidth: 1680, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2.5, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} size="small">Customers</Button>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Customer Management &amp; Analytics</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ ml: { md: 10 } }}>Manage customers and gain powerful insights.</Typography>
        </Box>
        <Chip label="Live customer data" color="success" size="small" variant="outlined" />
      </Stack>

      <CustomerAnalyticsKPIs data={data} />

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, xl: 9 }}>
          <CustomerAnalyticsCharts data={data} />
        </Grid>

        <Grid size={{ xs: 12, xl: 3 }}>
          <CustomerAnalyticsSidebar data={data} recentCustomers={recentCustomers} />
        </Grid>
      </Grid>
    </Box>
  );
}
