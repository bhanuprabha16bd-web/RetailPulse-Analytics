import React, { useState } from 'react';
import {
  Paper, Box, Typography, Grid, TextField, Button, CircularProgress, Alert, Divider,
  Chip, InputAdornment,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemHealthApi, type MonitoringThreshold } from '../../api/systemHealthApi';

const THRESHOLD_LABELS: Record<string, { label: string; unit: string; description: string; min: number; max: number }> = {
  api_error_rate_pct: { label: 'API Error Rate Threshold', unit: '%', description: 'Alert when API error rate exceeds this percentage over the last hour', min: 1, max: 50 },
  avg_response_time_ms: { label: 'Average Response Time Threshold', unit: 'ms', description: 'Alert when average API response time exceeds this value over the last hour', min: 100, max: 10000 },
  job_failure_count_1h: { label: 'Job Failure Count Threshold', unit: 'jobs', description: 'Alert when background job failures exceed this count in the last hour', min: 1, max: 100 },
  db_response_time_ms: { label: 'Database Response Time Threshold', unit: 'ms', description: 'Alert when database response time exceeds this value', min: 100, max: 5000 },
  health_check_interval_minutes: { label: 'Health Check Interval', unit: 'min', description: 'How often (in minutes) the system runs automatic health checks', min: 1, max: 60 },
};

const ThresholdSettings: React.FC = () => {
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['monitoringThresholds'],
    queryFn: systemHealthApi.getThresholds,
  });

  const updateMutation = useMutation({
    mutationFn: (thresholds: Record<string, number>) => systemHealthApi.updateThresholds(thresholds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoringThresholds'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setEditValues({});
    },
  });

  const handleSave = () => {
    const thresholds: Record<string, number> = {};
    Object.entries(editValues).forEach(([key, val]) => {
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) thresholds[key] = parsed;
    });
    if (Object.keys(thresholds).length > 0) updateMutation.mutate(thresholds);
  };

  const getCurrentValue = (threshold: MonitoringThreshold): string =>
    editValues[threshold.threshold_key] !== undefined ? editValues[threshold.threshold_key] : String(threshold.threshold_value);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Failed to load monitoring thresholds.</Alert>;

  const isDirtyTotal = Object.keys(editValues).length;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Alert Thresholds Configuration</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure thresholds that trigger system alerts and notifications. Changes apply immediately and are recorded in the audit log.
      </Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>Thresholds updated successfully!</Alert>}

      <Grid container spacing={2}>
        {(data?.thresholds || []).map((threshold) => {
          const config = THRESHOLD_LABELS[threshold.threshold_key];
          if (!config) return null;
          const currentValue = getCurrentValue(threshold);
          const isDirty = editValues[threshold.threshold_key] !== undefined &&
            editValues[threshold.threshold_key] !== String(threshold.threshold_value);

          return (
            <Grid key={threshold.id} size={{ xs: 12, sm: 6 }}>
              <Paper sx={{ p: 2.5, height: '100%', outline: isDirty ? '2px solid' : 'none', outlineColor: 'primary.main' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{config.label}</Typography>
                  {isDirty && <Chip label="Modified" color="primary" size="small" />}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>{config.description}</Typography>
                <TextField
                  size="small" type="number" fullWidth value={currentValue}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [threshold.threshold_key]: e.target.value }))}
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">{config.unit}</InputAdornment> },
                    htmlInput: { min: config.min, max: config.max, step: threshold.threshold_key.endsWith('_pct') ? 0.5 : 1 },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Range: {config.min}–{config.max} {config.unit}</Typography>
                  <Typography variant="caption" color="text.secondary">Current: {threshold.threshold_value} {config.unit}</Typography>
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 2 }}>
        <Button variant="outlined" onClick={() => setEditValues({})} disabled={!isDirtyTotal}>Reset Changes</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!isDirtyTotal || updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save Thresholds'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Alert Deduplication</Typography>
        <Typography variant="body2" color="text.secondary">
          The system automatically deduplicates alerts to avoid repeatedly notifying users for the same unresolved issue.
          Alerts for the same condition are suppressed for 1 hour after the first notification.
          When a component returns to a healthy state, alert recovery is logged.
        </Typography>
      </Box>
    </Box>
  );
};

export default ThresholdSettings;
