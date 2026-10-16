import React, { useState } from 'react';
import { Box, Grid, Typography, Tabs, Tab, Chip, IconButton, Tooltip, CircularProgress, Alert, Button, Paper } from '@mui/material';
import {
  Refresh as RefreshIcon, CheckCircle as CheckCircleIcon, Warning as WarningIcon,
  Error as ErrorIcon, PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemHealthApi } from '../../api/systemHealthApi';

import HealthOverviewKPIs from './HealthOverviewKPIs';
import ComponentHealthPanel from './ComponentHealthPanel';
import SystemPerformanceChart from './SystemPerformanceChart';
import ApiPerformanceTable from './ApiPerformanceTable';
import BackgroundJobsTable from './BackgroundJobsTable';
import SystemErrorsSection from './SystemErrorsSection';
import IncidentsSection from './IncidentsSection';
import ThresholdSettings from './ThresholdSettings';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
const TabPanel = ({ children, index, value }: TabPanelProps) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>{value === index && children}</div>
);

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'Healthy') return <CheckCircleIcon color="success" />;
  if (status === 'Degraded') return <WarningIcon color="warning" />;
  return <ErrorIcon color="error" />;
};

const SystemHealth: React.FC = () => {
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();

  const { data: overview, isLoading, error, refetch } = useQuery({
    queryKey: ['systemHealthOverview'],
    queryFn: systemHealthApi.getOverview,
    refetchInterval: 60_000,
  });

  const healthCheckMutation = useMutation({
    mutationFn: systemHealthApi.runHealthCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemHealthOverview'] });
      queryClient.invalidateQueries({ queryKey: ['systemHealthComponents'] });
    },
  });

  const statusColor = (status: string) =>
    status === 'Healthy' ? 'success' : status === 'Degraded' ? 'warning' : 'error';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>System Health Monitoring</Typography>
          <Typography variant="body2" color="text.secondary">Monitor application health, performance and operational status</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {overview && (
            <Chip
              icon={<StatusIcon status={overview.overall_status} />}
              label={`System ${overview.overall_status}`}
              color={statusColor(overview.overall_status) as 'success' | 'warning' | 'error'}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          )}
          {overview?.last_health_check && (
            <Typography variant="caption" color="text.secondary">
              Last Check: {new Date(overview.last_health_check).toLocaleString()}
            </Typography>
          )}
          <Tooltip title="Run Health Check">
            <IconButton onClick={() => healthCheckMutation.mutate()} disabled={healthCheckMutation.isPending} color="primary">
              {healthCheckMutation.isPending ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={() => { refetch(); queryClient.invalidateQueries({ queryKey: ['systemHealthComponents'] }); }} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load system health data. Please try again.</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : overview ? (
        <>
          <HealthOverviewKPIs overview={overview} />

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <SystemPerformanceChart />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <ComponentHealthPanel components={overview.components} />

              {/* Recent Alerts */}
              <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Recent Alerts</Typography>
                {overview.recent_alerts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No recent alerts</Typography>
                ) : (
                  overview.recent_alerts.slice(0, 5).map((alert) => {
                    const priorityColor = alert.priority === 'Critical' ? 'error' : alert.priority === 'High' ? 'warning' : alert.priority === 'Medium' ? 'info' : 'default';
                    return (
                      <Box key={alert.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{alert.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(alert.created_at).toLocaleString()}</Typography>
                        </Box>
                        <Chip label={alert.priority} size="small" color={priorityColor as 'error' | 'warning' | 'info' | 'default'} />
                      </Box>
                    );
                  })
                )}
              </Paper>

              {/* System Information */}
              <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>System Information</Typography>
                {[{ label: 'Application Version', value: 'v1.8.0' }, { label: 'Environment', value: 'Production' }].map(({ label, value }) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  <Button size="small" variant="outlined" startIcon={<PlayArrowIcon />}
                    onClick={() => healthCheckMutation.mutate()} disabled={healthCheckMutation.isPending}
                  >Run Health Check</Button>
                  <Button size="small" variant="outlined" onClick={() => setTab(4)}>Manage Thresholds</Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Box sx={{ mt: 3 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }} variant="scrollable" scrollButtons="auto">
              <Tab label="API Performance" />
              <Tab label="Background Jobs" />
              <Tab label="System Errors" />
              <Tab label="Incidents" />
              <Tab label="Thresholds" />
            </Tabs>
            <TabPanel value={tab} index={0}><ApiPerformanceTable /></TabPanel>
            <TabPanel value={tab} index={1}><BackgroundJobsTable /></TabPanel>
            <TabPanel value={tab} index={2}><SystemErrorsSection /></TabPanel>
            <TabPanel value={tab} index={3}><IncidentsSection /></TabPanel>
            <TabPanel value={tab} index={4}><ThresholdSettings /></TabPanel>
          </Box>
        </>
      ) : null}
    </Box>
  );
};

export default SystemHealth;
