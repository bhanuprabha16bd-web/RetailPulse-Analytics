import React from 'react';
import { Grid, Card, CardContent, Typography, Table, TableHead, TableBody, TableRow, TableCell, Stack, Box, useTheme } from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { ChartCard, COLORS, currency } from './CustomerAnalyticsShared';

interface CustomerAnalyticsChartsProps {
  data: any;
}

const CustomerAnalyticsCharts: React.FC<CustomerAnalyticsChartsProps> = ({ data }) => {
  const theme = useTheme();
  
  return (
    <>
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2, mb: 1.5 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="subtitle2" sx={{ mb: 1.25, fontWeight: 800 }}>Customer Analytics</Typography>
          <Grid container spacing={1.25}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <ChartCard title="Customer Growth Trend"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.growthTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><RechartsTooltip /><Line type="monotone" dataKey="value" stroke={theme.palette.primary.main} strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <ChartCard title="New vs Returning Customers"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.newVsReturning} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={42} outerRadius={67} paddingAngle={3}>{data.newVsReturning.map((entry: any, index: number) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 2 }} /><RechartsTooltip /></PieChart></ResponsiveContainer></ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <ChartCard title="Revenue by Customer Type"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.revenueByType} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={42} outerRadius={67} paddingAngle={3}>{data.revenueByType.map((entry: any, index: number) => <Cell key={entry.name} fill={COLORS[(index + 2) % COLORS.length]} />)}</Pie><Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 2 }} /><RechartsTooltip formatter={(value) => currency.format(typeof value === 'number' ? value : 0)} /></PieChart></ResponsiveContainer></ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <ChartCard title="Top 10 Customers by Revenue"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.topCustomers.slice(0, 5)} layout="vertical" margin={{ left: 4 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} /><RechartsTooltip formatter={(value) => currency.format(typeof value === 'number' ? value : 0)} /><Bar dataKey="value" fill={theme.palette.primary.main} radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <ChartCard title="Customer Purchase Frequency"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.purchaseFrequencyDistribution}><XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={0} /><YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="value" fill="#2878f0" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <ChartCard title="Customer Distribution by Location"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.locationDistribution.slice(0, 6)} layout="vertical" margin={{ left: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={62} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="value" fill="#6b8ce8" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <ChartCard title="Monthly Customer Acquisition"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthlyAcquisition}><XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} /><RechartsTooltip /><Bar dataKey="value" fill="#2b7ce9" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <ChartCard title="Customer Spending Distribution"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.spendingDistribution} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={42} outerRadius={67} paddingAngle={3}>{data.spendingDistribution.map((entry: any, index: number) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Legend iconSize={8} wrapperStyle={{ fontSize: 9, paddingTop: 2 }} /><RechartsTooltip /></PieChart></ResponsiveContainer></ChartCard>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>Customer Segmentation</Typography>
          <Table size="small"><TableHead><TableRow><TableCell>Segment</TableCell><TableCell>Criteria</TableCell><TableCell align="right">Customers</TableCell></TableRow></TableHead><TableBody>
            {data.segmentDistribution.map((segment: any, index: number) => <TableRow key={segment.name}><TableCell><Stack direction="row" spacing={.75} sx={{ alignItems: 'center' }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[index] }} />{segment.name}</Stack></TableCell><TableCell>{['0–1 orders', '2–4 orders', '5–9 orders', '10+ orders'][index] ?? '—'}</TableCell><TableCell align="right">{segment.value}</TableCell></TableRow>)}
          </TableBody></Table>
        </CardContent>
      </Card>
    </>
  );
};

export default CustomerAnalyticsCharts;
