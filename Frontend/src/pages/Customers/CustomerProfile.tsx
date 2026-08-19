import { useState, useEffect, type ComponentProps, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Chip, CircularProgress, Grid as MuiGrid, Stack as MuiStack, Typography as MuiTypography } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { customersApi, CustomerStatsResponse, CustomerTimelineEvent } from '../../api/customers';
import CustomerProfileSidebar from './Profile/CustomerProfileSidebar';
import CustomerProfileBusinessInfo from './Profile/CustomerProfileBusinessInfo';
import CustomerProfileTables from './Profile/CustomerProfileTables';
import CustomerProfileTimeline from './Profile/CustomerProfileTimeline';

type LegacyGridProps = ComponentProps<typeof MuiGrid> & {
  item?: boolean;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
};

const Grid = ({ item: _item, xs, sm, md, lg, size, ...props }: LegacyGridProps) => {
  const legacySize = xs !== undefined || sm !== undefined || md !== undefined || lg !== undefined
    ? { xs, sm, md, lg }
    : undefined;
  return <MuiGrid {...props} size={size ?? legacySize} />;
};

type LegacyTypographyProps = ComponentProps<typeof MuiTypography> & {
  fontWeight?: string | number;
  textAlign?: CSSProperties['textAlign'];
};

const Typography = ({ fontWeight, textAlign, sx, ...props }: LegacyTypographyProps) => (
  <MuiTypography {...props} sx={{ ...(sx as any), fontWeight, textAlign }} />
);

type LegacyStackProps = ComponentProps<typeof MuiStack> & { flexWrap?: CSSProperties['flexWrap'] };

const Stack = ({ flexWrap, sx, ...props }: LegacyStackProps) => (
  <MuiStack {...props} sx={{ ...(sx as any), flexWrap }} />
);

const CustomerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CustomerStatsResponse | null>(null);
  const [timeline, setTimeline] = useState<CustomerTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      customersApi.getCustomer(parseInt(id)),
      customersApi.getTimeline(parseInt(id))
    ])
      .then(([res, timelineRes]) => {
        setData(res);
        setTimeline(timelineRes);
        setError(null);
      })
      .catch((err: any) => {
        setError(err.response?.data?.detail || 'Failed to load customer profile.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  }

  if (error || !data) {
    return (
      <Box>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} sx={{ mb: 2 }}>Back to Customers</Button>
        <Alert severity="error">{error || 'Customer not found'}</Alert>
      </Box>
    );
  }

  const { customer, totalOrders, totalRevenueGenerated, averageOrderValue, totalQuantityPurchased, lastPurchaseDate, firstPurchaseDate, recentOrders, recentPurchases, recentPayments, mostFrequentlyPurchasedProducts, favoriteCategory, favoriteProduct, purchaseFrequencyDays } = data;

  const segmentColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    'New Customer': 'default',
    'Regular Customer': 'info',
    'Loyal Customer': 'primary',
    'VIP Customer': 'warning'
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')}>Back</Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{customer.fullName}'s Profile</Typography>
        <Chip label={customer.status} color={customer.status === 'Active' ? 'success' : 'default'} />
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column - Customer Details */}
        <Grid item xs={12} md={4}>
          <CustomerProfileSidebar 
            customer={customer} 
            segmentColors={segmentColors} 
          />
        </Grid>

        {/* Right Column - Analytics & Transactions */}
        <Grid item xs={12} md={8}>
          <CustomerProfileBusinessInfo 
            totalOrders={totalOrders}
            totalRevenueGenerated={totalRevenueGenerated}
            averageOrderValue={averageOrderValue}
            favoriteCategory={favoriteCategory}
            favoriteProduct={favoriteProduct}
            purchaseFrequencyDays={purchaseFrequencyDays}
            firstPurchaseDate={firstPurchaseDate}
            lastPurchaseDate={lastPurchaseDate}
            totalQuantityPurchased={totalQuantityPurchased}
          />
          
          <CustomerProfileTables 
            recentOrders={recentOrders}
            recentPurchases={recentPurchases}
            recentPayments={recentPayments}
            mostFrequentlyPurchasedProducts={mostFrequentlyPurchasedProducts}
          />
          
          <CustomerProfileTimeline timeline={timeline} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomerProfile;
