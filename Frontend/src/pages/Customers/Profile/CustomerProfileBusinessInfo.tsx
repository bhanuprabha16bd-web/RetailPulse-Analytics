import React from 'react';
import { Grid, Paper, Typography, Card, CardContent, Divider } from '@mui/material';
import { ShoppingCart, AttachMoney, TrendingUp, Category, Stars, Update } from '@mui/icons-material';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

interface CustomerProfileBusinessInfoProps {
  totalOrders: number;
  totalRevenueGenerated: number;
  averageOrderValue: number;
  favoriteCategory: string | null;
  favoriteProduct: string | null;
  purchaseFrequencyDays: number | null;
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
  totalQuantityPurchased: number;
}

const CustomerProfileBusinessInfo: React.FC<CustomerProfileBusinessInfoProps> = ({
  totalOrders, totalRevenueGenerated, averageOrderValue, favoriteCategory, favoriteProduct, purchaseFrequencyDays, firstPurchaseDate, lastPurchaseDate, totalQuantityPurchased
}) => {
  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>Business Information</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <ShoppingCart fontSize="large" sx={{ mb: 1, opacity: 0.8 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{totalOrders}</Typography>
            <Typography variant="body2">Total Orders</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'success.light', color: 'success.contrastText' }}>
            <AttachMoney fontSize="large" sx={{ mb: 1, opacity: 0.8 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{formatCurrency(totalRevenueGenerated)}</Typography>
            <Typography variant="body2">Lifetime Revenue</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'info.light', color: 'info.contrastText' }}>
            <TrendingUp fontSize="large" sx={{ mb: 1, opacity: 0.8 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{formatCurrency(averageOrderValue)}</Typography>
            <Typography variant="body2">Average Order Value</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Category color="primary" sx={{ mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center' }}>{favoriteCategory || '—'}</Typography>
            <Typography variant="body2" color="text.secondary">Favorite Category</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Stars color="secondary" sx={{ mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center' }}>{favoriteProduct || '—'}</Typography>
            <Typography variant="body2" color="text.secondary">Favorite Product</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <Update color="action" sx={{ mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'center' }}>{purchaseFrequencyDays ? `${purchaseFrequencyDays.toFixed(1)} days` : '—'}</Typography>
            <Typography variant="body2" color="text.secondary">Purchase Frequency</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Purchase History</Typography>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid size={6}>
              <Typography variant="body2" color="text.secondary">First Purchase Date</Typography>
              <Typography variant="body1">{firstPurchaseDate ? new Date(firstPurchaseDate).toLocaleDateString() : '—'}</Typography>
            </Grid>
            <Grid size={6}>
              <Typography variant="body2" color="text.secondary">Last Purchase Date</Typography>
              <Typography variant="body1">{lastPurchaseDate ? new Date(lastPurchaseDate).toLocaleDateString() : '—'}</Typography>
            </Grid>
            <Grid size={12}>
              <Typography variant="body2" color="text.secondary">Total Quantity Purchased</Typography>
              <Typography variant="body1">{totalQuantityPurchased} items</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </>
  );
};

export default CustomerProfileBusinessInfo;
