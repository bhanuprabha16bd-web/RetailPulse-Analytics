import React, { useState } from 'react';
import { Paper, Box, Typography, CircularProgress, Alert } from '@mui/material';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { systemHealthApi } from '../../api/systemHealthApi';

const SystemPerformanceChart: React.FC = () => {
  const [hours, setHours] = useState<number>(24);

  const { data, isLoading, error } = useQuery({
    queryKey: ['systemHealthTrends', hours],
    queryFn: () => systemHealthApi.getApiTrends(hours),
    refetchInterval: 60_000,
  });

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const chartData = (data?.trends || []).map((t) => ({
    time: formatTime(t.timestamp),
    responseTime: t.avg_response_time_ms,
    errorRate: t.error_rate_pct,
    requests: t.total_requests,
  }));

  return (
    <Paper sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          System Performance (Last {hours} Hours)
        </Typography>
        <ToggleButtonGroup
          value={hours}
          exclusive
          onChange={(_, val: number | null) => val && setHours(val)}
          size="small"
        >
          {[{ v: 6, l: '6h' }, { v: 24, l: '24h' }, { v: 48, l: '48h' }, { v: 168, l: '7d' }].map(({ v, l }) => (
            <ToggleButton key={v} value={v}>{l}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="warning">Could not load performance trends. Data will appear after some API traffic is recorded.</Alert>
      )}
      {!isLoading && !error && chartData.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <Typography variant="body2" color="text.secondary">
            No performance data yet. Data will appear as API requests are processed.
          </Typography>
        </Box>
      )}
      {!isLoading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [
                name === 'responseTime' ? `${value} ms` : `${value}%`,
                name === 'responseTime' ? 'Avg Response Time' : 'Error Rate',
              ] as any}
            />
            <Legend
              formatter={(value: string) => value === 'responseTime' ? 'API Response Time (ms)' : 'Error Rate (%)'}
            />
            <Line yAxisId="left" type="monotone" dataKey="responseTime" stroke="#1976d2" strokeWidth={2} dot={false} name="responseTime" />
            <Line yAxisId="right" type="monotone" dataKey="errorRate" stroke="#d32f2f" strokeWidth={2} dot={false} name="errorRate" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

export default SystemPerformanceChart;
