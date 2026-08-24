import React from 'react';
import { Typography, Paper, Box, Grid } from '@mui/material';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Sale, Category, Product } from './HomeDashboardShared';

interface HomeDashboardCategoryChartProps {
  sales: Sale[];
  categories: Category[];
  products: Product[];
}

const HomeDashboardCategoryChart: React.FC<HomeDashboardCategoryChartProps> = ({ sales, categories, products }) => {
  const salesByCategory = Object.values(sales.reduce<Record<string, { name: string; value: number }>>((acc, sale) => {
    sale.items.forEach(item => {
      let categoryId = item.categoryId || item.product?.categoryId;
      if (!categoryId && item.productId) {
        const product = products.find(p => p.id === item.productId);
        if (product) categoryId = product.categoryId;
      }
      const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name || 'Unknown' : 'Uncategorized';
      const itemTotal = item.total ?? ((item.quantity || 0) * (item.unitPrice || 0) - (item.discount || 0) + (item.tax || 0));
      acc[categoryName] = { name: categoryName, value: (acc[categoryName]?.value ?? 0) + itemTotal };
    });
    return acc;
  }, {}));

  return (
    <Grid size={{ xs: 12, md: 4 }}>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
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
  );
};

export default HomeDashboardCategoryChart;
