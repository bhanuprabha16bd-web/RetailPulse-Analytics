import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Skeleton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { ImportStats as ImportStatsType } from '../../api/importApi';

interface ImportStatsProps {
  stats?: ImportStatsType;
  isLoading: boolean;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  growth: number | null;
  color: string;
}> = ({ title, value, icon, growth, color }) => (
  <Card sx={{ borderRadius: 2, height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography color="textSecondary" variant="subtitle2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
          {growth !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {growth >= 0 ? (
                <ArrowUpwardIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
              ) : (
                <ArrowDownwardIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
              )}
              <Typography variant="body2" color={growth >= 0 ? 'success.main' : 'error.main'}>
                {Math.abs(growth)}% vs last 30d
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}15`, color }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const ImportStats: React.FC<ImportStatsProps> = ({ stats, isLoading }) => {
  if (isLoading || !stats) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={i}>
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          title="Total Imports"
          value={stats.totalImports}
          icon={<CloudUploadIcon />}
          growth={stats.totalGrowth}
          color="#3f51b5"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircleIcon />}
          growth={stats.completedGrowth}
          color="#4caf50"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          title="Completed with Errors"
          value={stats.completedWithErrors}
          icon={<WarningIcon />}
          growth={null}
          color="#ff9800"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          title="Failed"
          value={stats.failed}
          icon={<CancelIcon />}
          growth={stats.failedGrowth}
          color="#f44336"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
        <StatCard
          title="Last Import"
          value={stats.lastImport?.importType || '-'}
          icon={<AccessTimeIcon />}
          growth={null}
          color="#9c27b0"
        />
      </Grid>
    </Grid>
  );
};

export default ImportStats;
