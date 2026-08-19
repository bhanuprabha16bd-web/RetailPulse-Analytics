import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

interface AnalyticsKPIsProps {
  kpis: any;
  navigateWithFilter: (path: string) => void;
}

const AnalyticsKPIs: React.FC<AnalyticsKPIsProps> = ({ kpis, navigateWithFilter }) => {
  return (
    <Grid container spacing={3} mb={4}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', cursor: 'pointer', '&:hover': { opacity: 0.9 } }} onClick={() => navigateWithFilter('/sales')}>
          <CardContent>
            <Typography variant="subtitle2" opacity={0.8}>Total Revenue</Typography>
            <Typography variant="h4">{formatCurrency(kpis.total_revenue)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText', cursor: 'pointer', '&:hover': { opacity: 0.9 } }} onClick={() => navigateWithFilter('/sales')}>
          <CardContent>
            <Typography variant="subtitle2" opacity={0.8}>Total Orders</Typography>
            <Typography variant="h4">{kpis.total_orders.toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText', cursor: 'pointer', '&:hover': { opacity: 0.9 } }} onClick={() => navigateWithFilter('/sales')}>
          <CardContent>
            <Typography variant="subtitle2" opacity={0.8}>Avg Order Value</Typography>
            <Typography variant="h4">{formatCurrency(kpis.average_order_value)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', cursor: 'pointer', '&:hover': { opacity: 0.9 } }} onClick={() => navigateWithFilter('/products')}>
          <CardContent>
            <Typography variant="subtitle2" opacity={0.8}>Total Products Sold</Typography>
            <Typography variant="h4">{kpis.total_products_sold.toLocaleString()}</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => navigateWithFilter('/inventory')}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">Total Inventory Value</Typography>
            <Typography variant="h4" color="primary.main">{formatCurrency(kpis.total_inventory_value)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'warning.main' } }} onClick={() => navigateWithFilter('/inventory')}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">Low Stock Products</Typography>
            <Typography variant="h4" color="warning.main">{kpis.low_stock_products}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'error.main' } }} onClick={() => navigateWithFilter('/inventory')}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">Out of Stock</Typography>
            <Typography variant="h4" color="error.main">{kpis.out_of_stock_products}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'info.main' } }} onClick={() => navigateWithFilter('/categories')}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">Total Categories</Typography>
            <Typography variant="h4">{kpis.total_categories}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AnalyticsKPIs;
