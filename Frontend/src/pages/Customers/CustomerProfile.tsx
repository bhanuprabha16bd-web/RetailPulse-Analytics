import { useState, useEffect, type ComponentProps, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, CircularProgress, Divider, Grid as MuiGrid, Paper,
  Stack as MuiStack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography as MuiTypography, Chip, Alert
} from '@mui/material';
import { ArrowBack, Email, Phone, LocationOn, CalendarToday, ShoppingCart, AttachMoney, TrendingUp, Stars, Category, Update } from '@mui/icons-material';
import { customersApi, CustomerStatsResponse, CustomerTimelineEvent } from '../../api/customers';

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
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Personal & Contact Information</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 100 }}>Customer ID:</Typography>
                  <Typography variant="body1" fontWeight={500}>{customer.customerId}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email color="action" fontSize="small" />
                  <Typography variant="body2">{customer.email || 'N/A'}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone color="action" fontSize="small" />
                  <Typography variant="body2">{customer.phone || 'N/A'}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <LocationOn color="action" fontSize="small" sx={{ mt: 0.3 }} />
                  <Typography variant="body2">
                    {[customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(', ') || 'N/A'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday color="action" fontSize="small" />
                  <Typography variant="body2">
                    {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : 'N/A'} 
                    {customer.gender ? ` • ${customer.gender}` : ''}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 100 }}>Customer Type:</Typography>
                  <Typography variant="body2">{customer.customerType}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 100 }}>Status:</Typography>
                  <Typography variant="body2">{customer.status}</Typography>
                </Box>
              </Stack>

              <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Segmentation</Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ rowGap: 1 }}>
                <Chip label={customer.segment} color={segmentColors[customer.segment] || 'default'} size="small" />
                <Chip label={customer.customerType} variant="outlined" size="small" />
                <Chip label={customer.preferredSalesChannel} variant="outlined" size="small" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Analytics & Transactions */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" sx={{ mb: 1 }}>Business Information</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* KPI Cards */}
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <ShoppingCart fontSize="large" sx={{ mb: 1, opacity: 0.8 }} />
                <Typography variant="h4" fontWeight="bold">{totalOrders}</Typography>
                <Typography variant="body2">Total Orders</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
                <AttachMoney fontSize="large" sx={{ mb: 1, opacity: 0.8 }} />
                <Typography variant="h4" fontWeight="bold">${totalRevenueGenerated.toFixed(2)}</Typography>
                <Typography variant="body2">Lifetime Revenue</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
                <TrendingUp fontSize="large" sx={{ mb: 1, opacity: 0.8 }} />
                <Typography variant="h4" fontWeight="bold">₹{averageOrderValue.toFixed(2)}</Typography>
                <Typography variant="body2">Average Order Value</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
                <Category color="primary" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight="bold" textAlign="center">{favoriteCategory || '—'}</Typography>
                <Typography variant="body2" color="text.secondary">Favorite Category</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
                <Stars color="secondary" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight="bold" textAlign="center">{favoriteProduct || '—'}</Typography>
                <Typography variant="body2" color="text.secondary">Favorite Product</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
                <Update color="action" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight="bold" textAlign="center">{purchaseFrequencyDays ? `${purchaseFrequencyDays.toFixed(1)} days` : '—'}</Typography>
                <Typography variant="body2" color="text.secondary">Purchase Frequency</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Purchase History</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">First Purchase Date</Typography>
                  <Typography variant="body1">{firstPurchaseDate ? new Date(firstPurchaseDate).toLocaleDateString() : '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Last Purchase Date</Typography>
                  <Typography variant="body1">{lastPurchaseDate ? new Date(lastPurchaseDate).toLocaleDateString() : '—'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Total Quantity Purchased</Typography>
                  <Typography variant="body1">{totalQuantityPurchased} items</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            {/* Recent Orders */}
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recent Orders</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Invoice Number</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell align="right">Items</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentOrders.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>{tx.invoiceNumber}</TableCell>
                            <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell align="right">{tx.itemsCount}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>${tx.totalAmount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        {recentOrders.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3 }}>No orders found.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Purchases */}
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recent Purchases</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Product</TableCell><TableCell>Invoice</TableCell><TableCell align="right">Quantity</TableCell></TableRow></TableHead>
                      <TableBody>
                        {recentPurchases.map((purchase) => (
                          <TableRow key={purchase.id}>
                            <TableCell>{purchase.productName}</TableCell>
                            <TableCell>{purchase.invoiceNumber}</TableCell>
                            <TableCell align="right">{purchase.quantity}</TableCell>
                          </TableRow>
                        ))}
                        {!recentPurchases.length && <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No purchases found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Payments */}
            <Grid item xs={12} md={6}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Recent Payments</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead><TableRow><TableCell>Invoice</TableCell><TableCell>Method</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
                      <TableBody>
                        {recentPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{payment.invoiceNumber}</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>${payment.totalAmount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        {!recentPayments.length && <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No payments found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Top Products Table */}
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Most Frequently Purchased Products</Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product Name</TableCell>
                          <TableCell align="right">Quantity Purchased</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {mostFrequentlyPurchasedProducts.map((p, index) => (
                          <TableRow key={index}>
                            <TableCell>{p.productName}</TableCell>
                            <TableCell align="right">{p.count}</TableCell>
                          </TableRow>
                        ))}
                        {mostFrequentlyPurchasedProducts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 3 }}>No products purchased yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Timeline */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Card elevation={2}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Customer Timeline</Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {timeline.length > 0 ? (
                    <Box sx={{ ml: 1, borderLeft: '2px solid', borderColor: 'divider', pl: 3, position: 'relative' }}>
                      {timeline.map((event) => (
                        <Box key={event.id} sx={{ mb: 3, position: 'relative' }}>
                          <Box sx={{
                            position: 'absolute',
                            left: -32,
                            top: 4,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            border: '2px solid white',
                            boxShadow: '0 0 0 1px #e0e0e0'
                          }} />
                          <Typography variant="body1" fontWeight="bold">{event.action}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(event.timestamp).toLocaleString()} • {event.user}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No timeline events found.</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
        </Grid>
      </Grid>
    </Box>
  );
};

export default CustomerProfile;
