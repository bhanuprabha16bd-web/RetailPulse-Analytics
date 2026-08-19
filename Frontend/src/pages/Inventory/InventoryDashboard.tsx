import React, { useMemo } from 'react';
import { Box, Grid } from '@mui/material';
import DashboardKPIs from './Dashboard/DashboardKPIs';
import DashboardStatusChart from './Dashboard/DashboardStatusChart';
import DashboardCategoryChart from './Dashboard/DashboardCategoryChart';

interface Props {
  products: any[];
  categories: any[];
  processedProducts: any[];
}

const InventoryDashboard: React.FC<Props> = ({ products, processedProducts }) => {
  const totalProducts = products.length;
  const totalQuantity = products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const lowStockCount = processedProducts.filter(p => p.statusObj.label === 'Low Stock').length;
  const outOfStockCount = processedProducts.filter(p => p.statusObj.label === 'Out of Stock').length;

  const statusChartData = [
    { name: 'In Stock', value: totalProducts - lowStockCount - outOfStockCount, color: '#2e7d32' },
    { name: 'Low Stock', value: lowStockCount, color: '#ed6c02' },
    { name: 'Out of Stock', value: outOfStockCount, color: '#d32f2f' }
  ].filter(d => d.value > 0);

  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    processedProducts.forEach(p => {
      map.set(p.categoryName, (map.get(p.categoryName) || 0) + p.stockQuantity);
    });
    return Array.from(map.entries()).map(([name, quantity]) => ({ name, quantity }));
  }, [processedProducts]);

  return (
    <Box>
      <DashboardKPIs 
        totalProducts={totalProducts} 
        totalQuantity={totalQuantity} 
        lowStockCount={lowStockCount} 
        outOfStockCount={outOfStockCount} 
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardStatusChart statusChartData={statusChartData} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DashboardCategoryChart categoryChartData={categoryChartData} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default InventoryDashboard;
