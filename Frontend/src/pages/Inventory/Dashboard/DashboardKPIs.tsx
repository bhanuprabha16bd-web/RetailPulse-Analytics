import { Grid, Card, CardContent, Typography } from '@mui/material';

interface DashboardKPIsProps {
  totalProducts: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function DashboardKPIs({
  totalProducts, totalQuantity, lowStockCount, outOfStockCount
}: DashboardKPIsProps) {
  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Products</Typography>
            <Typography variant="h3">{totalProducts}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Total Quantity</Typography>
            <Typography variant="h3">{totalQuantity}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Low Stock Products</Typography>
            <Typography variant="h3">{lowStockCount}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ bgcolor: 'error.main', color: 'error.contrastText' }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>Out of Stock</Typography>
            <Typography variant="h3">{outOfStockCount}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
