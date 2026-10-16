import React, { useState } from 'react';
import {
  Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TablePagination, Chip, TextField, MenuItem, Select,
  FormControl, InputLabel, IconButton, Tooltip, CircularProgress, Alert,
  Grid, InputAdornment, Button,
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemHealthApi } from '../../api/systemHealthApi';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const SEVERITY_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  Critical: 'error', High: 'error', Medium: 'warning', Low: 'info',
};
const STATUS_COLORS: Record<string, 'error' | 'warning' | 'success'> = {
  Open: 'error', Investigating: 'warning', Resolved: 'success',
};
const PIE_COLORS = ['#1976d2', '#9c27b0', '#f44336', '#ff9800', '#4caf50'];

const SystemErrorsSection: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [componentFilter, setComponentFilter] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['systemErrors', page, rowsPerPage, severityFilter, categoryFilter, statusFilter, componentFilter],
    queryFn: () => systemHealthApi.getErrors({
      page: page + 1, limit: rowsPerPage,
      severity: severityFilter || undefined,
      category: categoryFilter || undefined,
      status: statusFilter || undefined,
      component: componentFilter || undefined,
    }),
  });

  const { data: distribution } = useQuery({
    queryKey: ['errorDistribution'],
    queryFn: systemHealthApi.getErrorDistribution,
  });

  const updateMutation = useMutation({
    mutationFn: ({ errorId, errData }: { errorId: number; errData: { status?: string } }) =>
      systemHealthApi.updateError(errorId, errData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemErrors'] });
      queryClient.invalidateQueries({ queryKey: ['systemHealthOverview'] });
      queryClient.invalidateQueries({ queryKey: ['errorDistribution'] });
    },
  });

  if (error) return <Alert severity="error">Failed to load system errors.</Alert>;

  const pieData = (distribution?.distribution || []).filter((d) => d.count > 0);

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {pieData.length > 0 && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, height: 260 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Error Distribution</Typography>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="count" nameKey="category"
                    cx="50%" cy="50%" outerRadius={70}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
        <Grid size={{ xs: 12, md: pieData.length > 0 ? 8 : 12 }}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField size="small" fullWidth placeholder="Filter by component..."
                  value={componentFilter}
                  onChange={(e) => { setComponentFilter(e.target.value); setPage(0); }}
                  slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select value={severityFilter} label="Severity" onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}>
                    <MenuItem value="">All</MenuItem>
                    {['Critical', 'High', 'Medium', 'Low'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={categoryFilter} label="Category" onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}>
                    <MenuItem value="">All</MenuItem>
                    {['API Error', 'Database Error', 'Job Failure', 'External API', 'Auth Error', 'Validation Error'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                    <MenuItem value="">All</MenuItem>
                    {['Open', 'Investigating', 'Resolved'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined"
                    onClick={() => { setSeverityFilter(''); setCategoryFilter(''); setStatusFilter(''); setComponentFilter(''); setPage(0); }}
                  >Clear</Button>
                  <Tooltip title="Refresh">
                    <IconButton onClick={() => refetch()} size="small"><RefreshIcon /></IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Error ID</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Component</TableCell>
                <TableCell>Endpoint/Job</TableCell>
                <TableCell>First Seen</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell align="right">Count</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : data?.errors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">No system errors recorded.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                data?.errors.map((err) => (
                  <TableRow key={err.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{err.error_id}</Typography></TableCell>
                    <TableCell>{err.category}</TableCell>
                    <TableCell>{err.component}</TableCell>
                    <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{err.endpoint_or_job || '–'}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{new Date(err.first_seen_at).toLocaleString()}</Typography></TableCell>
                    <TableCell><Chip label={err.severity} color={SEVERITY_COLORS[err.severity] || 'default'} size="small" /></TableCell>
                    <TableCell align="right">{err.occurrence_count}</TableCell>
                    <TableCell><Chip label={err.status} color={STATUS_COLORS[err.status] || 'default'} size="small" /></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {err.status === 'Open' && (
                          <Button size="small" variant="outlined" color="warning"
                            onClick={() => updateMutation.mutate({ errorId: err.id, errData: { status: 'Investigating' } })}
                          >Investigate</Button>
                        )}
                        {err.status !== 'Resolved' && (
                          <Button size="small" variant="outlined" color="success"
                            onClick={() => updateMutation.mutate({ errorId: err.id, errData: { status: 'Resolved' } })}
                          >Resolve</Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data && (
          <TablePagination component="div" count={data.total} page={page}
            onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50]}
          />
        )}
      </Paper>
    </Box>
  );
};

export default SystemErrorsSection;
