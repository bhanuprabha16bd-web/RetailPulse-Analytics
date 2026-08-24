import React, { useEffect, useState } from 'react';
import { Alert, Box, Typography, Grid } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { axiosPrivate } from '../api/axios';
import { customersApi, CustomerAnalyticsResponse } from '../api/customers';
import { Store, Product, Category, Sale } from './HomeDashboard/HomeDashboardShared';
import HomeDashboardKPIs from './HomeDashboard/HomeDashboardKPIs';
import HomeDashboardRevenueChart from './HomeDashboard/HomeDashboardRevenueChart';
import HomeDashboardCategoryChart from './HomeDashboard/HomeDashboardCategoryChart';

const Dashboard = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      axiosPrivate.get('/stores/'), 
      axiosPrivate.get('/products/'), 
      axiosPrivate.get('/sales/'), 
      axiosPrivate.get('/categories/'),
      customersApi.getAnalytics()
    ])
      .then(([storesResponse, productsResponse, salesResponse, categoriesResponse, customersResponse]) => {
        setStores(storesResponse.data);
        setProducts(productsResponse.data);
        setSales(salesResponse.data);
        setCategories(categoriesResponse.data);
        setCustomerAnalytics(customersResponse);
      })
      .catch(() => setError('Unable to load dashboard data.'));
  }, []);

  if (!user) return null;

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }} gutterBottom>Welcome back, {user.name}!</Typography>
        <Typography variant="body1" color="text.secondary">Here&apos;s what&apos;s happening with your stores today.</Typography>
      </Box>

      <HomeDashboardKPIs 
        sales={sales} 
        stores={stores} 
        products={products} 
        categories={categories} 
        customerAnalytics={customerAnalytics} 
      />

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      <Grid container spacing={3}>
        <HomeDashboardRevenueChart sales={sales} />
        <HomeDashboardCategoryChart sales={sales} categories={categories} products={products} />
      </Grid>
    </Box>
  );
};

export default Dashboard;
