import React from 'react';
import { Card, CardContent, Grid, Typography } from '@mui/material';
import { AuditLog } from '../../api/auditApi';

interface AuditStatsProps {
  logs: AuditLog[];
  total: number; // Total number of logs matching the current filter (across all pages)
}

const AuditStats: React.FC<AuditStatsProps> = ({ logs, total }) => {
  // Calculate how many logs on the current page are marked as "Success"
  const successCount = logs.filter(log => log.status === 'Success').length;
  // Calculate how many logs on the current page failed
  const failedCount = logs.filter(log => log.status !== 'Success').length;

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {/* Total Activities Card */}
      <Grid item xs={12} sm={4}>
        <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6">Total Activities (All Time)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{total}</Typography>
          </CardContent>
        </Card>
      </Grid>
      {/* Successful Actions Card */}
      <Grid item xs={12} sm={4}>
        <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
          <CardContent>
            <Typography variant="h6">Successful Actions (Page)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{successCount}</Typography>
          </CardContent>
        </Card>
      </Grid>
      {/* Failed Actions Card */}
      <Grid item xs={12} sm={4}>
        <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
          <CardContent>
            <Typography variant="h6">Failed Actions (Page)</Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{failedCount}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AuditStats;
