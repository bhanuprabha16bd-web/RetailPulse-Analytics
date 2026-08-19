import { Paper, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface DashboardCategoryChartProps {
  categoryChartData: { name: string; quantity: number }[];
}

export default function DashboardCategoryChart({ categoryChartData }: DashboardCategoryChartProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: 360 }}>
      <Typography variant="h6" sx={{ mb: 2 }} align="center">Inventory by Category</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={categoryChartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <RechartsTooltip />
          <Bar dataKey="quantity" fill="#1976d2" name="Total Quantity" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
