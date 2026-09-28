import React, { useState } from 'react';
import { 
  Box, Paper, Typography, IconButton, Divider, Chip, 
  Button, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress, Link
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import { dataQualityApi } from '../../api/dataQualityApi';
import { format } from 'date-fns';
import { getSeverityColor, getStatusColor } from './DataQualityShared';

interface DataQualityIssueDetailProps {
  issueId: number;
  onClose: () => void;
  onStatusUpdate: () => void;
}

const DataQualityIssueDetail: React.FC<DataQualityIssueDetailProps> = ({ issueId, onClose, onStatusUpdate }) => {
  const [newStatus, setNewStatus] = useState<string>('');
  const [resolutionNote, setResolutionNote] = useState<string>('');

  const { data: issue, isLoading } = useQuery({
    queryKey: ['dataQualityIssueDetail', issueId],
    queryFn: () => dataQualityApi.getIssueDetail(issueId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { newStatus: string; resolutionNote?: string }) => 
      dataQualityApi.updateIssueStatus(issueId, data),
    onSuccess: () => {
      onStatusUpdate();
      setNewStatus('');
      setResolutionNote('');
    }
  });

  React.useEffect(() => {
    if (issue) {
      setNewStatus(issue.status);
    }
  }, [issue]);

  if (isLoading) {
    return <Paper sx={{ p: 4, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress /></Paper>;
  }

  if (!issue) {
    return <Paper sx={{ p: 4 }}><Typography>Issue not found.</Typography></Paper>;
  }

  const handleUpdateStatus = () => {
    updateStatusMutation.mutate({ newStatus, resolutionNote });
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">{issue.issueType}</Typography>
          <Chip size="small" label={issue.severity} sx={getSeverityColor(issue.severity)} />
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Typography variant="body2" color="textSecondary" gutterBottom>
        ID: {issue.issueId} | Detected: {format(new Date(issue.detectedAt), 'PPp')}
      </Typography>
      
      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2">Details</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, my: 1 }}>
        <Typography variant="body2"><strong>Module:</strong> {issue.module}</Typography>
        <Typography variant="body2"><strong>Resource:</strong> {issue.resourceType} (ID: {issue.resourceId})</Typography>
        <Typography variant="body2"><strong>Record:</strong> {issue.affectedRecord}</Typography>
      </Box>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Description</Typography>
      <Typography variant="body2" sx={{ bgcolor: '#F3F4F6', p: 1, borderRadius: 1, mt: 0.5 }}>
        {issue.description}
      </Typography>

      {issue.relatedDataParsed && Object.keys(issue.relatedDataParsed).length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>Related Data</Typography>
          <Box sx={{ bgcolor: '#F8FAFC', p: 1, borderRadius: 1, mt: 0.5 }}>
            {Object.entries(issue.relatedDataParsed).map(([key, val]) => (
              <Typography key={key} variant="body2"><strong>{key}:</strong> {String(val)}</Typography>
            ))}
          </Box>
        </>
      )}

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Related Links</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
        {issue.module === 'Inventory' && <Link href="#" variant="body2">View Stock Movements</Link>}
        {issue.module === 'Products' && <Link href="#" variant="body2">View Product</Link>}
        <Link href="#" variant="body2">View Related Logs</Link>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2">Resolution</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">Current Status:</Typography>
          <Chip size="small" label={issue.status} sx={getStatusColor(issue.status)} />
        </Box>
        
        <FormControl size="small" fullWidth>
          <InputLabel>Update Status</InputLabel>
          <Select
            value={newStatus}
            label="Update Status"
            onChange={(e) => setNewStatus(e.target.value)}
          >
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="Investigating">Investigating</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
            <MenuItem value="Ignored">Ignored</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Resolution Note"
          multiline
          rows={3}
          size="small"
          fullWidth
          value={resolutionNote}
          onChange={(e) => setResolutionNote(e.target.value)}
        />

        <Button 
          variant="contained" 
          onClick={handleUpdateStatus}
          disabled={updateStatusMutation.isPending || (newStatus === issue.status && !resolutionNote)}
        >
          {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
        </Button>
      </Box>
    </Paper>
  );
};

export default DataQualityIssueDetail;
