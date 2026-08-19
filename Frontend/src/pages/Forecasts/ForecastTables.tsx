import React from 'react';
import { Grid, Card, CardContent, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip, Box } from '@mui/material';

interface ForecastTablesProps {
  data: any;
  period: string;
  periodLabels: Record<string, string>;
}

const ForecastTables: React.FC<ForecastTablesProps> = ({ data, period, periodLabels }) => {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card>
          <CardContent>
            <Typography sx={{ mb: 1, fontWeight: 800 }}>Product Level Forecast — {periodLabels[period]}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Historical</TableCell>
                  <TableCell align="right">Predicted</TableCell>
                  <TableCell align="right">Growth</TableCell>
                  <TableCell>Accuracy</TableCell>
                  <TableCell>Recommendation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.products.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.productName}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell align="right">{product.currentStock}</TableCell>
                    <TableCell align="right">{product.historicalSales}</TableCell>
                    <TableCell align="right">{product.predictedDemand}</TableCell>
                    <TableCell align="right">{product.growth}%</TableCell>
                    <TableCell>{product.accuracy}%</TableCell>
                    <TableCell>
                      <Chip size="small" label={product.recommendation} color={product.recommendation.includes('Healthy') ? 'success' : product.recommendation.includes('Overstock') ? 'warning' : 'error'} />
                    </TableCell>
                  </TableRow>
                ))}
                {!data.products.length && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>No forecasts match the selected filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 800 }}>Category Level Forecast</Typography>
            {data.categories.map((category: any) => (
              <Box key={category.category} sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700 }}>{category.category}</Typography>
                <Typography variant="body2" color="text.secondary">Historical: {category.historicalSales} · Forecast: {category.predictedDemand}</Typography>
                <Typography variant="body2" color={category.growth >= 0 ? 'success.main' : 'error.main'}>{category.growth}% expected growth</Typography>
              </Box>
            ))}
            {!data.categories.length && (
              <Typography color="text.secondary" sx={{ py: 2 }}>No category forecasts to show.</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ForecastTables;
