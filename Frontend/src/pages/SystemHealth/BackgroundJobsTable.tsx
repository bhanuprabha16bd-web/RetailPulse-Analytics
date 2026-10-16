import React, { useState } from 'react';
import {
  Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TablePagination, Chip, TextField, MenuItem, Select,
  FormControl, InputLabel, IconButton, Tooltip, CircularProgress, Alert,
  Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  InputAdornment, Stack,
} from '@mui/material';
import {
  Search as SearchIcon, Refresh as RefreshIcon,
  Replay as ReplayIcon, Cancel as CancelIcon, Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemHealthApi, type BackgroundJob } from '../../api/systemHealthApi';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  Completed: 'success', Running: 'info', Pending: 'default', Failed: 'error', Cancelled: 'warning',
};

const formatDuration = (ms: number | null) => {
  if (ms == null) return '–';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

interface JobDetailProps {
  job: BackgroundJob | null;
  open: boolean;
  onClose: () => void;
  onRetry: (jobId: string) => void;
  onCancel: (jobId: string) => void;
  isRetrying: boolean;
  isCancelling: boolean;
}

const JobDetailDialog: React.FC<JobDetailProps> = ({ job, open, onClose, onRetry, onCancel, isRetrying, isCancelling }) => {
  if (!job) return null;
  const meta = job.metadata as Record<string, unknown>;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Job Details – {job.job_id}</Typography>
          <Chip label={job.status} color={STATUS_COLORS[job.status] || 'default'} size="small" />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          {[
            { label: 'Job Type', value: job.job_type },
            { label: 'Triggered By', value: job.triggered_by_name || 'System' },
            { label: 'Started At', value: new Date(job.started_at).toLocaleString() },
            { label: 'Completed At', value: job.completed_at ? new Date(job.completed_at).toLocaleString() : '–' },
            { label: 'Duration', value: formatDuration(job.duration_ms) },
            { label: 'Retry Count', value: String(job.retry_count) },
          ].map(({ label, value }) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
            </Box>
          ))}
          {job.failure_reason && (
            <>
              <Divider />
              <Box>
                <Typography variant="body2" color="error.main" sx={{ fontWeight: 500, mb: 0.5 }}>Failure Reason</Typography>
                <Typography variant="body2" color="text.secondary">{job.failure_reason}</Typography>
              </Box>
            </>
          )}
          {Object.keys(meta).length > 0 && (
            <>
              <Divider />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Execution Details</Typography>
              {Object.entries(meta).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">{key.replace(/_/g, ' ')}</Typography>
                  <Typography variant="caption">{String(value)}</Typography>
                </Box>
              ))}
            </>
          )}
          {job.source_record_type && (
            <>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Source Record</Typography>
                <Typography variant="body2">{job.source_record_type} #{job.source_record_id}</Typography>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {job.status === 'Failed' && job.retry_count < 3 && (
          <Button startIcon={<ReplayIcon />} color="primary" onClick={() => onRetry(job.job_id)} disabled={isRetrying}>Retry Job</Button>
        )}
        {(job.status === 'Pending' || job.status === 'Running') && (
          <Button startIcon={<CancelIcon />} color="error" onClick={() => onCancel(job.job_id)} disabled={isCancelling}>Cancel Job</Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const BackgroundJobsTable: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<BackgroundJob | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['backgroundJobs', page, rowsPerPage, statusFilter, jobTypeFilter, searchFilter],
    queryFn: () => systemHealthApi.getJobs({
      page: page + 1, limit: rowsPerPage,
      status: statusFilter || undefined, job_type: jobTypeFilter || undefined, search: searchFilter || undefined,
    }),
    refetchInterval: 15_000,
  });

  const retryMutation = useMutation({
    mutationFn: systemHealthApi.retryJob,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['backgroundJobs'] }); setDrawerOpen(false); },
  });
  const cancelMutation = useMutation({
    mutationFn: systemHealthApi.cancelJob,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['backgroundJobs'] }); setDrawerOpen(false); },
  });

  if (error) return <Alert severity="error">Failed to load background jobs.</Alert>;

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField size="small" fullWidth placeholder="Search by Job ID..."
              value={searchFilter} onChange={(e) => { setSearchFilter(e.target.value); setPage(0); }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {['Pending', 'Running', 'Completed', 'Failed', 'Cancelled'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Job Type</InputLabel>
              <Select value={jobTypeFilter} label="Job Type" onChange={(e) => { setJobTypeFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {['Data Import', 'Scheduled Report', 'Reconciliation', 'Health Check', 'System Task'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip title="Refresh"><IconButton onClick={() => refetch()} size="small"><RefreshIcon /></IconButton></Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Job ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Triggered By</TableCell>
                <TableCell>Started At</TableCell>
                <TableCell>Completed At</TableCell>
                <TableCell align="right">Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Retries</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : data?.jobs.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No background jobs found.</Typography>
                </TableCell></TableRow>
              ) : (
                data?.jobs.map((job) => (
                  <TableRow key={job.id} hover sx={{ cursor: 'pointer' }} onClick={() => { setSelectedJob(job); setDrawerOpen(true); }}>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{job.job_id}</Typography></TableCell>
                    <TableCell>{job.job_type}</TableCell>
                    <TableCell>{job.triggered_by_name || 'System'}</TableCell>
                    <TableCell><Typography variant="caption">{new Date(job.started_at).toLocaleString()}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{job.completed_at ? new Date(job.completed_at).toLocaleString() : '–'}</Typography></TableCell>
                    <TableCell align="right"><Typography variant="caption">{formatDuration(job.duration_ms)}</Typography></TableCell>
                    <TableCell><Chip label={job.status} color={STATUS_COLORS[job.status] || 'default'} size="small" /></TableCell>
                    <TableCell align="right">{job.retry_count}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => { setSelectedJob(job); setDrawerOpen(true); }}><InfoIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        {job.status === 'Failed' && job.retry_count < 3 && (
                          <Tooltip title="Retry">
                            <IconButton size="small" color="primary" onClick={() => retryMutation.mutate(job.job_id)} disabled={retryMutation.isPending}>
                              <ReplayIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(job.status === 'Pending' || job.status === 'Running') && (
                          <Tooltip title="Cancel">
                            <IconButton size="small" color="error" onClick={() => cancelMutation.mutate(job.job_id)} disabled={cancelMutation.isPending}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      <JobDetailDialog
        job={selectedJob} open={drawerOpen} onClose={() => setDrawerOpen(false)}
        onRetry={(id) => retryMutation.mutate(id)} onCancel={(id) => cancelMutation.mutate(id)}
        isRetrying={retryMutation.isPending} isCancelling={cancelMutation.isPending}
      />
    </Box>
  );
};

export default BackgroundJobsTable;
