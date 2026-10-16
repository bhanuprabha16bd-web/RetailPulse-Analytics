import React from 'react';
import { Grid, Paper, Box, Typography, Chip } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import type { SystemOverview } from '../../api/systemHealthApi';

interface Props {
  overview: SystemOverview;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  badge?: { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' };
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, color = 'primary.main', badge }) => (
  <Paper sx={{ p: 2.5, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
        <Typography variant="h4" color={color} sx={{ fontWeight: 'bold' }}>{value}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
        <Box sx={{ color, fontSize: 32, display: 'flex' }}>{icon}</Box>
        {badge && <Chip label={badge.label} color={badge.color} size="small" />}
      </Box>
    </Box>
  </Paper>
);

const HealthOverviewKPIs: React.FC<Props> = ({ overview }) => {
  const availability = overview.api_availability_pct;
  const availabilityColor = availability >= 99 ? 'success.main' : availability >= 95 ? 'warning.main' : 'error.main';
  const responseTimeColor = overview.avg_response_time_ms < 500 ? 'success.main' : overview.avg_response_time_ms < 2000 ? 'warning.main' : 'error.main';
  const overallColor = overview.overall_status === 'Healthy' ? 'success.main' : overview.overall_status === 'Degraded' ? 'warning.main' : 'error.main';

  return (
    <Grid container spacing={2.5}>
      {/* Overall Status */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper sx={{ p: 2.5, height: '100%', borderLeft: 4, borderColor: overallColor }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircleIcon sx={{ color: overallColor }} />
            <Typography variant="body2" color="text.secondary">Overall System Status</Typography>
          </Box>
          <Typography variant="h4" color={overallColor} sx={{ fontWeight: 'bold' }}>{overview.overall_status}</Typography>
          <Typography variant="caption" color="text.secondary">
            {overview.overall_status === 'Healthy' ? 'All systems operational' : 'Some issues detected'}
          </Typography>
        </Paper>
      </Grid>

      {/* API Availability */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="API Availability"
          value={`${overview.api_availability_pct.toFixed(1)}%`}
          subtitle={`${overview.total_api_requests} requests (last hour)`}
          icon={<SpeedIcon sx={{ fontSize: 32 }} />}
          color={availabilityColor}
          badge={{ label: availability >= 99 ? 'Up' : availability >= 95 ? 'Degraded' : 'Down', color: availability >= 99 ? 'success' : availability >= 95 ? 'warning' : 'error' }}
        />
      </Grid>

      {/* Avg Response Time */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Avg. API Response Time"
          value={`${overview.avg_response_time_ms.toFixed(0)} ms`}
          subtitle="Last hour average"
          icon={<SpeedIcon sx={{ fontSize: 32 }} />}
          color={responseTimeColor}
        />
      </Grid>

      {/* Failed API Requests */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Failed API Requests"
          value={overview.failed_api_requests}
          subtitle="Last hour"
          icon={<ErrorIcon sx={{ fontSize: 32 }} />}
          color={overview.failed_api_requests === 0 ? 'success.main' : overview.failed_api_requests < 10 ? 'warning.main' : 'error.main'}
        />
      </Grid>

      {/* Background Jobs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Paper sx={{ p: 2.5, height: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <WorkIcon color="primary" />
            <Typography variant="body2" color="text.secondary">Background Jobs (24h)</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{overview.jobs_completed + overview.jobs_failed}</Typography>
          <Typography variant="caption" color="text.secondary">Total processed</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            <Chip label={`${overview.jobs_completed} completed`} size="small" color="success" variant="outlined" />
            {overview.jobs_failed > 0 && <Chip label={`${overview.jobs_failed} failed`} size="small" color="error" variant="outlined" />}
          </Box>
        </Paper>
      </Grid>

      {/* Active / Pending Jobs */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Active / Pending Jobs"
          value={`${overview.jobs_active} / ${overview.jobs_pending}`}
          subtitle="Currently running / queued"
          icon={<WorkIcon sx={{ fontSize: 32 }} />}
          color="info.main"
        />
      </Grid>

      {/* Open Errors */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Open System Errors"
          value={overview.open_errors}
          subtitle="Unresolved errors"
          icon={<ErrorIcon sx={{ fontSize: 32 }} />}
          color={overview.open_errors === 0 ? 'success.main' : 'error.main'}
          badge={overview.open_errors === 0 ? { label: 'All Clear', color: 'success' } : undefined}
        />
      </Grid>

      {/* Open Incidents */}
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          title="Active Incidents"
          value={overview.open_incidents}
          subtitle="Open / Investigating"
          icon={<ErrorIcon sx={{ fontSize: 32 }} />}
          color={overview.open_incidents === 0 ? 'success.main' : 'warning.main'}
        />
      </Grid>
    </Grid>
  );
};

export default HealthOverviewKPIs;
