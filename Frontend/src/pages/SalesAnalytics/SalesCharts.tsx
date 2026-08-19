import { Grid, Paper, Box, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { ChartLoading, money, paymentColors } from './SalesShared';

interface SalesChartsProps {
  data: any;
  loading: boolean;
  interval: string;
  setInterval: (v: any) => void;
}

const SalesCharts: React.FC<SalesChartsProps> = ({ data, loading, interval, setInterval }) => {
  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 330 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Sales Overview</Typography>
            <ToggleButtonGroup size="small" exclusive value={interval} onChange={(_, v) => v && setInterval(v)}>
              <ToggleButton value="daily">Daily</ToggleButton>
              <ToggleButton value="weekly">Weekly</ToggleButton>
              <ToggleButton value="monthly">Monthly</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <ChartLoading loading={loading} empty={!data?.sales_overview.length}>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={data?.sales_overview}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(value) => money(Number(value ?? 0))} />
                <Line dataKey="revenue" name="Revenue" stroke="#7c3aed" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </ChartLoading>
        </Paper>
      </Grid>
      
      <Grid size={{ xs: 12, lg: 4 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 330 }}>
          <Typography variant="h6">Sales vs Orders</Typography>
          <ChartLoading loading={loading} empty={!data?.sales_vs_orders.length}>
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart data={data?.sales_vs_orders} margin={{ top: 16, right: 10, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" interval="preserveStartEnd" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="revenue" width={42} tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}`} />
                <YAxis yAxisId="orders" hide />
                <Tooltip formatter={(value, name) => [name === 'Revenue' ? money(Number(value ?? 0)) : Number(value ?? 0).toLocaleString(), String(name)]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="revenue" dataKey="revenue" name="Revenue" fill="#4f6bed" radius={[3, 3, 0, 0]} />
                <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartLoading>
        </Paper>
      </Grid>
      
      <Grid size={{ xs: 12, lg: 4 }}>
        <Paper variant="outlined" sx={{ p: 2, height: 330 }}>
          <Typography variant="h6">Payment Method Analysis</Typography>
          <ChartLoading loading={loading} empty={!data?.payment_analysis.length}>
            <Box sx={{ height: '90%', display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="58%" height="100%">
                <PieChart>
                  <Pie data={data?.payment_analysis} dataKey="revenue" nameKey="method" innerRadius={48} outerRadius={75}>
                    {(data?.payment_analysis ?? []).map((_: any, i: number) => <Cell key={i} fill={paymentColors[i % paymentColors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => money(Number(value ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
              <Box>
                {(data?.payment_analysis ?? []).map((p: any, i: number) => (
                  <Typography key={p.method} variant="caption" sx={{ display: 'block', mb: 1 }}>
                    <Box component="span" sx={{ color: paymentColors[i], mr: .7 }}>●</Box>
                    {p.method} <b>{money(p.revenue)}</b>
                  </Typography>
                ))}
              </Box>
            </Box>
          </ChartLoading>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default SalesCharts;
