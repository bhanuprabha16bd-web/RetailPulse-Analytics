import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

interface AnalyticsChartsProps {
  kpis: any;
  COLORS: string[];
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ kpis, COLORS }) => {
  return (
    <>
      {/* Charts Row 1 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" mb={2}>Revenue Trend</Typography>
            {kpis.revenue_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={kpis.revenue_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#1976d2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No trend data available.</Typography></Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" mb={2}>Top Selling Products</Typography>
            {kpis.top_products.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={kpis.top_products} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <RechartsTooltip />
                  <Bar dataKey="quantity_sold" fill="#2e7d32" name="Qty Sold" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No product data available.</Typography></Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" mb={2} align="center">Sales by Payment Method</Typography>
            {kpis.sales_by_payment.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={kpis.sales_by_payment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {kpis.sales_by_payment.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend iconType="square" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No payment data.</Typography></Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" mb={2} align="center">Sales by Channel</Typography>
            {kpis.sales_by_channel.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={kpis.sales_by_channel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {kpis.sales_by_channel.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[(i+2) % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No channel data.</Typography></Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" mb={2} align="center">Inventory by Category</Typography>
            {kpis.inventory_by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={kpis.inventory_by_category}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="quantity" fill="#9c27b0" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No inventory data.</Typography></Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
};

export default AnalyticsCharts;
