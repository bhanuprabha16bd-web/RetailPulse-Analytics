import React, { useState } from 'react';
import {
  Paper, Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, TablePagination, Chip, IconButton, Tooltip, CircularProgress,
  Alert, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Divider,
} from '@mui/material';
import { Refresh as RefreshIcon, Info as InfoIcon, Add as AddIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemHealthApi } from '../../api/systemHealthApi';

const STATUS_COLORS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  Open: 'error', Investigating: 'warning', Resolved: 'success',
};
const SEVERITY_COLORS: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  Critical: 'error', High: 'error', Medium: 'warning', Low: 'info',
};

interface IncidentDetailDialogProps {
  incidentId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: { status?: string; notes?: string; resolution_notes?: string }) => void;
  isUpdating: boolean;
}

const IncidentDetailDialog: React.FC<IncidentDetailDialogProps> = ({ incidentId, open, onClose, onUpdate, isUpdating }) => {
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incidentDetail', incidentId],
    queryFn: () => systemHealthApi.getIncidentDetail(incidentId!),
    enabled: !!incidentId && open,
  });

  const handleUpdate = () => {
    if (!incident) return;
    onUpdate(incident.incident_id, { status: newStatus || undefined, notes: notes || undefined, resolution_notes: resolutionNotes || undefined });
    setNewStatus(''); setNotes(''); setResolutionNotes('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{incident ? `${incident.incident_id} – ${incident.title}` : 'Incident Details'}</Typography>
          {incident && <Chip label={incident.status} color={STATUS_COLORS[incident.status] || 'default'} />}
        </Box>
      </DialogTitle>
      <DialogContent>
        {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
        {incident && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Details</Typography>
              {[
                { label: 'Severity', value: <Chip label={incident.severity} color={SEVERITY_COLORS[incident.severity] || 'default'} size="small" /> },
                { label: 'Detected', value: new Date(incident.detected_at).toLocaleString() },
                { label: 'Resolved', value: incident.resolved_at ? new Date(incident.resolved_at).toLocaleString() : '–' },
                { label: 'Components', value: (incident.affected_components || []).join(', ') || '–' },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2">{value}</Typography>
                </Box>
              ))}
              {incident.description && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Description</Typography>
                  <Typography variant="body2">{incident.description}</Typography>
                </Box>
              )}
              {incident.resolution_notes && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Resolution Notes</Typography>
                  <Typography variant="body2">{incident.resolution_notes}</Typography>
                </Box>
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Incident Timeline</Typography>
              {(incident.timeline || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No timeline entries</Typography>
              ) : (
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {(incident.timeline || []).map((entry) => (
                    <Box key={entry.id} sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%', mt: 1, flexShrink: 0,
                        bgcolor: entry.status_to === 'Resolved' ? 'success.main' : entry.status_to === 'Investigating' ? 'warning.main' : 'primary.main',
                      }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{entry.action}</Typography>
                        {entry.notes && <Typography variant="caption" color="text.secondary">{entry.notes}</Typography>}
                        <Typography variant="caption" sx={{ display: 'block' }} color="text.disabled">
                          {entry.performed_by_name || 'System'} · {new Date(entry.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>

            {incident.status !== 'Resolved' && (
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Update Incident</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>New Status</InputLabel>
                      <Select value={newStatus} label="New Status" onChange={(e) => setNewStatus(e.target.value)}>
                        <MenuItem value="">No change</MenuItem>
                        {incident.status === 'Open' && <MenuItem value="Investigating">Mark as Investigating</MenuItem>}
                        <MenuItem value="Resolved">Mark as Resolved</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField size="small" fullWidth label="Add Notes" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </Grid>
                  {newStatus === 'Resolved' && (
                    <Grid size={{ xs: 12 }}>
                      <TextField size="small" fullWidth label="Resolution Notes" multiline rows={2} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
                    </Grid>
                  )}
                </Grid>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        {incident && incident.status !== 'Resolved' && (
          <Button variant="contained" onClick={handleUpdate} disabled={isUpdating || (!newStatus && !notes && !resolutionNotes)}>
            Update Incident
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

interface CreateIncidentDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; severity?: string; description?: string }) => void;
  isCreating: boolean;
}

const CreateIncidentDialog: React.FC<CreateIncidentDialogProps> = ({ open, onClose, onCreate, isCreating }) => {
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!title) return;
    onCreate({ title, severity, description: description || undefined });
    setTitle(''); setSeverity('Medium'); setDescription('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Incident</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Incident Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select value={severity} label="Severity" onChange={(e) => setSeverity(e.target.value)}>
                {['Critical', 'High', 'Medium', 'Low'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Description (optional)" multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={handleCreate} disabled={!title || isCreating}>Create Incident</Button>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

const IncidentsSection: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['incidents', page, rowsPerPage, statusFilter, severityFilter],
    queryFn: () => systemHealthApi.getIncidents({
      page: page + 1, limit: rowsPerPage, status: statusFilter || undefined, severity: severityFilter || undefined,
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, upd }: { id: string; upd: { status?: string; notes?: string; resolution_notes?: string } }) =>
      systemHealthApi.updateIncident(id, upd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incidentDetail', selectedIncidentId] });
      queryClient.invalidateQueries({ queryKey: ['systemHealthOverview'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: systemHealthApi.createIncident,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incidents'] }); setCreateOpen(false); },
  });

  if (error) return <Alert severity="error">Failed to load incidents.</Alert>;

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {['Open', 'Investigating', 'Resolved'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select value={severityFilter} label="Severity" onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}>
                <MenuItem value="">All</MenuItem>
                {['Critical', 'High', 'Medium', 'Low'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setCreateOpen(true)}>Create Incident</Button>
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
                <TableCell>Incident ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Detected At</TableCell>
                <TableCell>Resolved At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : data?.incidents.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No incidents recorded.</Typography>
                </TableCell></TableRow>
              ) : (
                data?.incidents.map((inc) => (
                  <TableRow key={inc.id} hover>
                    <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{inc.incident_id}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 500 }}>{inc.title}</Typography></TableCell>
                    <TableCell><Chip label={inc.severity} color={SEVERITY_COLORS[inc.severity] || 'default'} size="small" /></TableCell>
                    <TableCell><Chip label={inc.status} color={STATUS_COLORS[inc.status] || 'default'} size="small" /></TableCell>
                    <TableCell><Typography variant="caption">{new Date(inc.detected_at).toLocaleString()}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{inc.resolved_at ? new Date(inc.resolved_at).toLocaleString() : '–'}</Typography></TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => { setSelectedIncidentId(inc.incident_id); setDetailOpen(true); }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {inc.status === 'Open' && (
                          <Button size="small" variant="outlined" color="warning"
                            onClick={() => updateMutation.mutate({ id: inc.incident_id, upd: { status: 'Investigating' } })}
                          >Investigate</Button>
                        )}
                        {inc.status !== 'Resolved' && (
                          <Button size="small" variant="outlined" color="success"
                            onClick={() => updateMutation.mutate({ id: inc.incident_id, upd: { status: 'Resolved' } })}
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

      <IncidentDetailDialog
        incidentId={selectedIncidentId} open={detailOpen} onClose={() => setDetailOpen(false)}
        onUpdate={(id, upd) => updateMutation.mutate({ id, upd })} isUpdating={updateMutation.isPending}
      />
      <CreateIncidentDialog
        open={createOpen} onClose={() => setCreateOpen(false)}
        onCreate={(d) => createMutation.mutate(d)} isCreating={createMutation.isPending}
      />
    </Box>
  );
};

export default IncidentsSection;
