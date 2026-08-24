import React from 'react';
import { Grid, Card, CardContent, Box, Typography } from '@mui/material';
import { TrendingUp, Store as StoreIcon, Inventory as InventoryIcon, AttachMoney, Category as CategoryIcon } from '@mui/icons-material';
import { Store, Product, Category, Sale } from './HomeDashboardShared';
import { CustomerAnalyticsResponse } from '../../api/customers';

interface HomeDashboardKPIsProps {
  sales: Sale[];
  stores: Store[];
  products: Product[];
  categories: Category[];
  customerAnalytics: CustomerAnalyticsResponse | null;
}

const StatCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography color="text.secondary" variant="subtitle2" sx={{ fontWeight: 'bold' }}>{title}</Typography>
        <Box sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', p: 1, borderRadius: 2, display: 'flex' }}>{icon}</Box>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>{value}</Typography>
      <Typography variant="body2" color="text.secondary">Current company data</Typography>
    </CardContent>
  </Card>
);

const HomeDashboardKPIs: React.FC<HomeDashboardKPIsProps> = ({ sales, stores, products, categories, customerAnalytics }) => {
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' });

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="TOTAL REVENUE" value={currency.format(totalRevenue)} icon={<AttachMoney />} /></Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="SALES" value={String(sales.length)} icon={<TrendingUp />} /></Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="ACTIVE STORES" value={String(stores.filter((store) => store.is_active).length)} icon={<StoreIcon />} /></Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}><StatCard title="TOTAL CUSTOMERS" value={String(customerAnalytics?.totalCustomers || 0)} icon={<StoreIcon />} /></Grid>
      <Grid size={{ xs: 12, sm: 4 }}><StatCard title="ACTIVE CUSTOMERS" value={String(customerAnalytics?.activeCustomers || 0)} icon={<TrendingUp />} /></Grid>
      <Grid size={{ xs: 12, sm: 4 }}><StatCard title="TOTAL PRODUCTS" value={String(products.length)} icon={<InventoryIcon />} /></Grid>
      <Grid size={{ xs: 12, sm: 4 }}><StatCard title="TOTAL CATEGORIES" value={String(categories.length)} icon={<CategoryIcon />} /></Grid>
    </Grid>
  );
};

export default HomeDashboardKPIs;
