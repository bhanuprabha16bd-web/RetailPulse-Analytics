import React, { useEffect, useState } from 'react';
import { Alert, Box, Typography, Paper, Grid, Card, CardContent } from '@mui/material';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { TrendingUp, Store as StoreIcon, Inventory as InventoryIcon, AttachMoney, Category as CategoryIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { axiosPrivate } from '../api/axios';

interface Store { is_active: boolean }
interface Product { status: boolean }
interface Category { id: number; name: string }
interface SaleItem { categoryId: number; total: number; product?: { categoryId: number } | null }
interface Sale { totalAmount: number; createdAt: string; items: SaleItem[] }

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

const Dashboard = () => {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([axiosPrivate.get('/stores/'), axiosPrivate.get('/products/'), axiosPrivate.get('/sales/'), axiosPrivate.get('/categories/')])
      .then(([storesResponse, productsResponse, salesResponse, categoriesResponse]) => {
        setStores(storesResponse.data);
        setProducts(productsResponse.data);
        setSales(salesResponse.data);
        setCategories(categoriesResponse.data);
      })
      .catch(() => setError('Unable to load dashboard data.'));
  }, []);

  if (!user) return null;

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  const salesByDay = Object.values(sales.reduce<Record<string, { name: string; revenue: number }>>((days, sale) => {
    const date = new Date(sale.createdAt);
    const key = date.toISOString().slice(0, 10);
    days[key] = {
      name: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date),
      revenue: (days[key]?.revenue ?? 0) + sale.totalAmount,
    };
    return days;
  }, {})).slice(-7);

  const salesByCategory = Object.values(sales.reduce<Record<string, { name: string; value: number }>>((acc, sale) => {
    sale.items.forEach(item => {
      const categoryId = item.categoryId;
      const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name || 'Unknown' : 'Uncategorized';
      acc[categoryName] = { name: categoryName, value: (acc[categoryName]?.value ?? 0) + item.total };
    });
    return acc;
  }, {}));

  const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' });

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }} gutterBottom>Welcome back, {user.name}!</Typography>
        <Typography variant="body1" color="text.secondary">Here&apos;s what&apos;s happening with your stores today.</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}><StatCard title="TOTAL REVENUE" value={currency.format(totalRevenue)} icon={<AttachMoney />} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="SALES" value={String(sales.length)} icon={<TrendingUp />} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="ACTIVE STORES" value={String(stores.filter((store) => store.is_active).length)} icon={<StoreIcon />} /></Grid>
        <Grid item xs={12} sm={6} md={3}><StatCard title="TOTAL CATEGORIES" value={String(categories.length)} icon={<CategoryIcon />} /></Grid>
        <Grid item xs={12} sm={4}><StatCard title="TOTAL PRODUCTS" value={String(products.length)} icon={<InventoryIcon />} /></Grid>
        <Grid item xs={12} sm={4}><StatCard title="ACTIVE PRODUCTS" value={String(products.filter(p => p.status).length)} icon={<InventoryIcon />} /></Grid>
        <Grid item xs={12} sm={4}><StatCard title="INACTIVE PRODUCTS" value={String(products.filter(p => !p.status).length)} icon={<InventoryIcon />} /></Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Revenue over time</Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByDay} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '400px', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Sales by Category</Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByCategory} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
