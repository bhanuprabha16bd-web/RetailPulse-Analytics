import React from 'react';
import { Typography, Paper, Box, Grid } from '@mui/material';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Sale } from './HomeDashboardShared';

interface HomeDashboardRevenueChartProps {
  sales: Sale[];
}

const HomeDashboardRevenueChart: React.FC<HomeDashboardRevenueChartProps> = ({ sales }) => {
  const salesByDay = Object.values(sales.reduce<Record<string, { name: string; revenue: number }>>((days, sale) => {
    const date = new Date(sale.createdAt);
    const key = date.toISOString().slice(0, 10);
    days[key] = {
      name: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date),
      revenue: (days[key]?.revenue ?? 0) + sale.totalAmount,
    };
    return days;
  }, {})).slice(-7);

  return (
    <Grid size={{ xs: 12, md: 8 }}>
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
  );
};

export default HomeDashboardRevenueChart;
