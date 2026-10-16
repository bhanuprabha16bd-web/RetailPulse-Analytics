import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select, FormControl,
  InputLabel, Alert, Snackbar, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import WorkflowStatsComponent from '../components/workflow/WorkflowStats';
import WorkflowFilters from '../components/workflow/WorkflowFilters';
import WorkflowTable from '../components/workflow/WorkflowTable';
import WorkflowConfigPanel from '../components/workflow/WorkflowConfigPanel';
import RequestDetailDrawer from '../components/workflow/RequestDetailDrawer';

import { workflowApi, WorkflowStats, WorkflowRequest } from '../api/workflowApi';

const REQUEST_TYPES = [
  'Stock Adjustment',
  'Product Deactivation',
  'Product Price Change',
  'Customer Information Change',
  'Inventory Import Approval',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// ── Create Request Dialog ─────────────────────────────────────────────────────
interface CreateRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateRequestDialog: React.FC<CreateRequestDialogProps> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({
    requestType: 'Product Price Change',
    relatedRecordType: 'Product',
    relatedRecordId: '',
    relatedRecordLabel: '',
    reason: '',
    priority: 'Medium',
    currentPrice: '',
    requestedPrice: '',
    currentStock: '',
    requestedStock: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.reason.trim()) { setError('Please enter a reason'); return; }

    let currentValues: Record<string, any> | undefined;
    let requestedValues: Record<string, any> | undefined;

    if (form.requestType === 'Product Price Change') {
      if (!form.currentPrice || !form.requestedPrice) { setError('Please enter both current and requested price'); return; }
      currentValues = { price: Number(form.currentPrice) };
      requestedValues = { price: Number(form.requestedPrice) };
    } else if (form.requestType === 'Stock Adjustment') {
      if (!form.currentStock || !form.requestedStock) { setError('Please enter both current and requested stock'); return; }
      currentValues = { stock: Number(form.currentStock) };
      requestedValues = { stock: Number(form.requestedStock) };
    } else if (form.requestType === 'Product Deactivation') {
      currentValues = { status: true };
      requestedValues = { status: false };
    }

    setLoading(true);
    setError(null);
    try {
      await workflowApi.createRequest({
        requestType: form.requestType,
        relatedRecordType: form.relatedRecordType || undefined,
        relatedRecordId: form.relatedRecordId ? Number(form.relatedRecordId) : undefined,
        relatedRecordLabel: form.relatedRecordLabel || undefined,
        currentValues,
        requestedValues,
        reason: form.reason,
        priority: form.priority,
      });
      onCreated();
      onClose();
      setForm({
        requestType: 'Product Price Change', relatedRecordType: 'Product',
        relatedRecordId: '', relatedRecordLabel: '', reason: '', priority: 'Medium',
        currentPrice: '', requestedPrice: '', currentStock: '', requestedStock: '',
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Approval Request</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
          <InputLabel>Request Type</InputLabel>
          <Select value={form.requestType} label="Request Type" onChange={e => setForm(f => ({ ...f, requestType: e.target.value }))}>
            {REQUEST_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Priority</InputLabel>
          <Select value={form.priority} label="Priority" onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField
          fullWidth label="Related Record Label (e.g. LP001 - Laptop Pro 15)"
          value={form.relatedRecordLabel} sx={{ mb: 2 }}
          onChange={e => setForm(f => ({ ...f, relatedRecordLabel: e.target.value }))}
        />

        <TextField
          fullWidth label="Related Record ID (numeric)" type="number"
          value={form.relatedRecordId} sx={{ mb: 2 }}
          onChange={e => setForm(f => ({ ...f, relatedRecordId: e.target.value }))}
        />

        {/* Conditional fields */}
        {form.requestType === 'Product Price Change' && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField fullWidth label="Current Price (₹)" type="number" value={form.currentPrice}
              onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} />
            <TextField fullWidth label="Requested Price (₹)" type="number" value={form.requestedPrice}
              onChange={e => setForm(f => ({ ...f, requestedPrice: e.target.value }))} />
          </Box>
        )}

        {form.requestType === 'Stock Adjustment' && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField fullWidth label="Current Stock" type="number" value={form.currentStock}
              onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} />
            <TextField fullWidth label="Requested Stock" type="number" value={form.requestedStock}
              onChange={e => setForm(f => ({ ...f, requestedStock: e.target.value }))} />
          </Box>
        )}

        {form.requestType === 'Product Deactivation' && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will request deactivation of the product. Once approved, the product will be set to inactive.
          </Alert>
        )}

        <TextField
          fullWidth label="Reason *" multiline rows={3} value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          placeholder="Explain why this change is required..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Creating...' : 'Submit Request'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const Workflows: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<WorkflowStats | undefined>(undefined);
  const [statsLoading, setStatsLoading] = useState(true);
  const [requests, setRequests] = useState<WorkflowRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [filters, setFilters] = useState({ search: '', request_type: '', status: '', priority: '' });
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await workflowApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRequests = useCallback(async () => {
    if (activeTab === 3) return;
    setRequestsLoading(true);
    try {
      const params: Record<string, any> = { page: page + 1, limit: rowsPerPage };
      if (activeTab === 0) params.status = 'Pending Approval';
      if (activeTab === 1) params.my_requests = true;
      if (filters.search) params.search = filters.search;
      if (filters.request_type) params.request_type = filters.request_type;
      if (filters.status && activeTab !== 0) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;

      const data = await workflowApi.listRequests(params);
      // Backend returns a plain array
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [activeTab, page, rowsPerPage, filters]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleTabChange = (_e: React.SyntheticEvent, v: number) => { setActiveTab(v); setPage(0); };
  const handlePageChange = (_e: unknown, newPage: number) => setPage(newPage);
  const handleRowsPerPageChange = (_e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
  };

  const handleCreated = () => {
    fetchStats();
    fetchRequests();
    setSnackbar({ open: true, message: 'Request created successfully!', severity: 'success' });
  };

  const handleUpdated = () => {
    fetchStats();
    fetchRequests();
  };

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Workflow & Approval Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage approval requests, track workflow status and ensure business processes are followed.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ mt: 0.5 }}
        >
          Create Request
        </Button>
      </Box>

      {/* Stats */}
      <Box sx={{ mb: 3 }}>
        <WorkflowStatsComponent stats={stats} isLoading={statsLoading} />
      </Box>

      {/* Tabs + Table */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs value={activeTab} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
            <Tab label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Pending Approval
                {stats?.pendingApproval ? (
                  <Chip size="small" label={stats.pendingApproval} color="warning" sx={{ height: 18, fontSize: 11 }} />
                ) : null}
              </Box>
            } />
            <Tab label="My Requests" />
            <Tab label="All Requests" />
            <Tab label="Configuration" />
          </Tabs>
        </Box>

        {activeTab !== 3 && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <WorkflowFilters
              filters={filters}
              onFilterChange={setFilters}
              onSearch={() => { setPage(0); fetchRequests(); }}
              onReset={() => setFilters({ search: '', request_type: '', status: '', priority: '' })}
              hideStatus={activeTab === 0}
            />
          </Box>
        )}

        {activeTab !== 3 ? (
          <WorkflowTable
            requests={requests}
            isLoading={requestsLoading}
            total={requests.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            onViewRequest={(id: string) => setSelectedRequestId(id)}
          />
        ) : (
          <Box sx={{ p: 2 }}>
            <WorkflowConfigPanel />
          </Box>
        )}
      </Paper>

      {/* Detail Drawer */}
      <RequestDetailDrawer
        requestId={selectedRequestId}
        open={selectedRequestId !== null}
        onClose={() => setSelectedRequestId(null)}
        onUpdated={handleUpdated}
      />

      {/* Create Request Dialog */}
      <CreateRequestDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleCreated}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Workflows;
