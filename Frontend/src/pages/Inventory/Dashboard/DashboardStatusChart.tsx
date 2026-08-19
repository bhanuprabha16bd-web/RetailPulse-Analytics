import { Paper, Typography } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardStatusChartProps {
  statusChartData: { name: string; value: number; color: string }[];
}

export default function DashboardStatusChart({ statusChartData }: DashboardStatusChartProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: 360 }}>
      <Typography variant="h6" sx={{ mb: 2 }} align="center">Stock Status Distribution</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
            {statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
          </Pie>
          <RechartsTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}
