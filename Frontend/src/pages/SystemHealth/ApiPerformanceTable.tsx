import React, { useState } from 'react';
import {
  Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TablePagination, Chip, TextField, MenuItem, Select,
  FormControl, InputLabel, IconButton, Tooltip, CircularProgress, Alert,
  Grid, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { systemHealthApi } from '../../api/systemHealthApi';

const getStatusColor = (code: number): 'success' | 'warning' | 'error' | 'default' => {
  if (code >= 200 && code < 400) return 'success';
  if (code === 400 || code === 422) return 'warning';
  if (code >= 400) return 'error';
  return 'default';
};

const ApiPerformanceTable: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [endpointFilter, setEndpointFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [isErrorFilter, setIsErrorFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['apiMetrics', page, rowsPerPage, endpointFilter, methodFilter, isErrorFilter, startDate, endDate],
    queryFn: () =>
      systemHealthApi.getApiMetrics({
        page: page + 1,
        limit: rowsPerPage,
        endpoint: endpointFilter || undefined,
        method: methodFilter || undefined,
        is_error: isErrorFilter === 'true' ? true : isErrorFilter === 'false' ? false : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['endpointSummary'],
    queryFn: systemHealthApi.getEndpointSummary,
  });

  if (error) return <Alert severity="error">Failed to load API metrics.</Alert>;

  return (
    <Box>
      {/* Endpoint Summary */}
      {summaryData && summaryData.summary.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Top Endpoints (Last 24 Hours)
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Endpoint</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Requests</TableCell>
                <TableCell align="right">Avg Response (ms)</TableCell>
                <TableCell align="right">Error Rate</TableCell>
                <TableCell align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summaryData.summary.slice(0, 5).map((row) => (
                <TableRow key={`${row.endpoint}-${row.method}`} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {row.endpoint}
                    </Typography>
                  </TableCell>
                  <TableCell><Chip label={row.method} size="small" variant="outlined" /></TableCell>
                  <TableCell align="right">{row.count}</TableCell>
                  <TableCell align="right">{row.avg_response_time_ms.toFixed(0)} ms</TableCell>
                  <TableCell align="right">{row.error_rate_pct.toFixed(1)}%</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={row.error_rate_pct < 1 ? 'Healthy' : row.error_rate_pct < 5 ? 'Degraded' : 'High Error'}
                      color={row.error_rate_pct < 1 ? 'success' : row.error_rate_pct < 5 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              size="small" fullWidth placeholder="Filter by endpoint..."
              value={endpointFilter}
              onChange={(e) => { setEndpointFilter(e.target.value); setPage(0); }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Method</InputLabel>
              <Select value={methodFilter} label="Method" onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={isErrorFilter} label="Status" onChange={(e) => { setIsErrorFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="false">Success</MenuItem>
                <MenuItem value="true">Error</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField size="small" fullWidth label="Start Date" type="date" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" fullWidth label="End Date" type="date" value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Tooltip title="Refresh">
                <IconButton onClick={() => refetch()} size="small"><RefreshIcon /></IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Endpoint</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Status Code</TableCell>
                <TableCell align="right">Response Time</TableCell>
                <TableCell>Error Category</TableCell>
                <TableCell>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell>
                </TableRow>
              ) : data?.metrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No API metrics recorded yet. Metrics are collected automatically as the API is used.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data?.metrics.map((metric) => (
                  <TableRow key={metric.id} hover sx={{ bgcolor: metric.is_error ? 'error.50' : 'inherit' }}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{metric.endpoint}</Typography>
                    </TableCell>
                    <TableCell><Chip label={metric.method} size="small" variant="outlined" /></TableCell>
                    <TableCell align="right">
                      <Chip label={metric.status_code} size="small"
                        color={getStatusColor(metric.status_code)}
                        variant={metric.is_error ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2"
                        color={metric.response_time_ms > 2000 ? 'error.main' : metric.response_time_ms > 500 ? 'warning.main' : 'text.primary'}
                        sx={{ fontWeight: metric.response_time_ms > 2000 ? 600 : 400 }}
                      >
                        {metric.response_time_ms} ms
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {metric.error_category
                        ? <Chip label={metric.error_category} size="small" color="error" variant="outlined" />
                        : <Typography variant="body2" color="text.secondary">–</Typography>
                      }
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(metric.created_at).toLocaleString()}</Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data && (
          <TablePagination
            component="div" count={data.total} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        )}
      </Paper>
    </Box>
  );
};

export default ApiPerformanceTable;
