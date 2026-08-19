import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ForecastChartsProps {
  data: any;
}

const ForecastCharts: React.FC<ForecastChartsProps> = ({ data }) => {
  return (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 800 }}>Historical Sales vs Forecast</Typography>
            <Box sx={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={data.products}>
                  <XAxis dataKey="productName" hide />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="historicalSales" fill="#9bbff7" name="Historical Sales" />
                  <Bar dataKey="predictedDemand" fill="#2477e8" name="Predicted Demand" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 800 }}>Category Demand Trend</Typography>
            <Box sx={{ height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={data.categories}>
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="historicalSales" stroke="#9bbff7" name="Historical" />
                  <Line dataKey="predictedDemand" stroke="#21ae68" name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ForecastCharts;
