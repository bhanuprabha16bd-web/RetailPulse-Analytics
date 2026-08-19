import { Grid, Card, CardContent, Typography } from '@mui/material';

interface ForecastKPIsProps {
  data: any;
}

const ForecastKPIs: React.FC<ForecastKPIsProps> = ({ data }) => {
  const kpi = (title: string, value: string | number, color: string) => (
    <Card sx={{ borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{value}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>{kpi('Total Predicted Demand', data.kpis.totalPredictedDemand, '#2477e8')}</Grid>
      <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>{kpi('Products Expected to Run Out', data.kpis.runOut, '#f58a1f')}</Grid>
      <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>{kpi('High Growth Products', data.kpis.highGrowth, '#21ae68')}</Grid>
      <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>{kpi('Slow Moving Products', data.kpis.slowMoving, '#944bc9')}</Grid>
      <Grid size={{ xs: 12, sm: 6, md: 'grow' }}>{kpi('Forecast Accuracy', `${data.kpis.accuracy}%`, '#0ba5a5')}</Grid>
    </Grid>
  );
};

export default ForecastKPIs;
