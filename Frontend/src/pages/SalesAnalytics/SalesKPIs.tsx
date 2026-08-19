import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton } from '@mui/material';
import { money } from './SalesShared';

interface SalesKPIsProps {
  metrics: [string, number, boolean, React.ReactNode, string][];
  loading: boolean;
  data: any;
}

const SalesKPIs: React.FC<SalesKPIsProps> = ({ metrics, loading, data }) => {
  return (
    <Grid container spacing={1.5} sx={{ mb: 2 }}>
      {metrics.map(([label, value, isMoney, icon, accent]) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={String(label)}>
          <Card variant="outlined" sx={{ minHeight: 108 }}>
            <CardContent sx={{ p: '14px !important' }}>
              {loading && !data ? (
                <Skeleton width="70%" height={50} />
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
                    <Box sx={{ p: .8, borderRadius: 2, color: accent, bgcolor: `${accent}18`, display: 'flex' }}>
                      {icon}
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ mt: .8, fontWeight: 800 }}>
                    {isMoney ? money(Number(value)) : Number(value).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="success.main">▲ Updated for selection</Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default SalesKPIs;
