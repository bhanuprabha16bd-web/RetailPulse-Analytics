import React, { useState, useEffect } from 'react';
import { 
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, IconButton, Typography, Box, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { workflowApi, WorkflowConfig } from '../../api/workflowApi';

const WorkflowConfigPanel: React.FC = () => {
  const [configs, setConfigs] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WorkflowConfig | null>(null);
  const [newRole, setNewRole] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const data = await workflowApi.getConfig();
      setConfigs(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggle = async (id: number, field: keyof WorkflowConfig, value: boolean) => {
    try {
      // Optimistic update
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
      await workflowApi.updateConfig(id, { [field]: value });
    } catch (error) {
      console.error('Error updating config:', error);
      fetchConfigs(); // revert on error
    }
  };

  const handleEditClick = (config: WorkflowConfig) => {
    setEditingConfig(config);
    setNewRole(config.approverRole);
    setEditDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingConfig) return;
    try {
      await workflowApi.updateConfig(editingConfig.id, { approverRole: newRole });
      setEditDialogOpen(false);
      fetchConfigs();
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Approval Routing Configuration</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage who can approve different types of requests and their requirements.
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Request Type</TableCell>
                <TableCell>Approver Role</TableCell>
                <TableCell align="center">Require Reason</TableCell>
                <TableCell align="center">Allow Self-Approve</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontWeight: 'bold' }}>{row.requestType}</TableCell>
                  <TableCell>{row.approverRole}</TableCell>
                  <TableCell align="center">
                    <Switch 
                      checked={row.requireReason} 
                      onChange={(e) => handleToggle(row.id, 'requireReason', e.target.checked)} 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch 
                      checked={row.allowSelfApprove} 
                      onChange={(e) => handleToggle(row.id, 'allowSelfApprove', e.target.checked)} 
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Switch 
                      checked={row.isActive} 
                      onChange={(e) => handleToggle(row.id, 'isActive', e.target.checked)} 
                      color="success"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEditClick(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {configs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    No configuration found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Approver Role</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Select which role has the authority to approve <strong>{editingConfig?.requestType}</strong> requests.
          </Typography>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Approver Role</InputLabel>
            <Select
              value={newRole}
              label="Approver Role"
              onChange={(e) => setNewRole(e.target.value)}
            >
              <MenuItem value="Super Admin">Super Admin</MenuItem>
              <MenuItem value="Company Owner">Company Owner</MenuItem>
              <MenuItem value="Company Admin">Company Admin</MenuItem>
              <MenuItem value="Manager">Manager</MenuItem>
              <MenuItem value="Department Head">Department Head</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRole} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkflowConfigPanel;
