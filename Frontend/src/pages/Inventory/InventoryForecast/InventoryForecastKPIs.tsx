import { Card, CardContent, Typography, Grid } from '@mui/material';
import { Summary } from './InventoryForecastShared';

interface InventoryForecastKPIsProps {
  summary: Summary;
}

export default function InventoryForecastKPIs({ summary }: InventoryForecastKPIsProps) {
  const kpi = (title: string, value: number, color: string) => (
    <Card sx={{ borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{value}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>{kpi('Products Requiring Reorder', summary.reorderCount, '#ef4444')}</Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>{kpi('Stockout Risk', summary.stockoutRiskCount, '#f59e0b')}</Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>{kpi('Overstocked Products', summary.overstockedCount, '#8b5cf6')}</Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>{kpi('Healthy Products', summary.healthyCount, '#22c55e')}</Grid>
    </Grid>
  );
}
