import React from 'react';
import { Paper, Box, Typography, Chip, Divider, LinearProgress } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Email as EmailIcon,
  Payment as PaymentIcon,
  Api as ApiIcon,
  ImportExport as ImportIcon,
} from '@mui/icons-material';
import type { ComponentHealth } from '../../api/systemHealthApi';

interface Props {
  components: ComponentHealth[];
}

const componentIcons: Record<string, React.ReactNode> = {
  'Application API': <ApiIcon />,
  'Database': <StorageIcon />,
  'Background Jobs': <CloudIcon />,
  'Data Import Service': <ImportIcon />,
  'Email Service': <EmailIcon />,
  'Payment Gateway': <PaymentIcon />,
};

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'Healthy') return <Chip icon={<CheckCircleIcon />} label="Healthy" color="success" size="small" variant="outlined" />;
  if (status === 'Degraded') return <Chip icon={<WarningIcon />} label="Degraded" color="warning" size="small" variant="outlined" />;
  return <Chip icon={<ErrorIcon />} label="Unavailable" color="error" size="small" variant="outlined" />;
};

const ALL_COMPONENTS = ['Application API', 'Database', 'Background Jobs', 'Data Import Service', 'Email Service', 'Payment Gateway'];

const ComponentHealthPanel: React.FC<Props> = ({ components }) => {
  const componentMap = new Map(components.map((c) => [c.component, c]));

  const items = ALL_COMPONENTS.map((name) =>
    componentMap.get(name) || { component: name, status: 'Healthy', response_time_ms: null, error_message: null, checked_at: null }
  );

  const healthyCount = items.filter((c) => c.status === 'Healthy').length;
  const healthPct = (healthyCount / items.length) * 100;

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Component Health</Typography>
        <Typography variant="caption" color="text.secondary">{healthyCount}/{items.length} Healthy</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={healthPct}
        color={healthPct === 100 ? 'success' : healthPct >= 80 ? 'warning' : 'error'}
        sx={{ mb: 2, height: 6, borderRadius: 3 }}
      />
      {items.map((comp, idx) => (
        <Box key={comp.component}>
          {idx > 0 && <Divider />}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: 'text.secondary', display: 'flex' }}>{componentIcons[comp.component] || <ApiIcon />}</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{comp.component}</Typography>
                {comp.response_time_ms != null && (
                  <Typography variant="caption" color="text.secondary">{comp.response_time_ms}ms</Typography>
                )}
                {comp.error_message && (
                   <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>{comp.error_message}</Typography>
                )}
              </Box>
            </Box>
            <StatusIndicator status={comp.status} />
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

export default ComponentHealthPanel;
