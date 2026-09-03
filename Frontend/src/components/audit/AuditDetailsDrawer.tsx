import React from 'react';
import { Drawer, Box, Typography, IconButton, Divider, Chip, Grid, Paper } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AuditLog } from '../../api/auditApi';

interface AuditDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  log: AuditLog | null; // The specific log object to display details for
}

const AuditDetailsDrawer: React.FC<AuditDetailsDrawerProps> = ({ open, onClose, log }) => {
  // If no log is selected, don't render anything
  if (!log) return null;

  let beforeValues = null;
  let afterValues = null;
  
  // Safely attempt to parse the stringified JSON data stored in the database
  try {
    if (log.beforeValues) beforeValues = JSON.parse(log.beforeValues);
    if (log.afterValues) afterValues = JSON.parse(log.afterValues);
  } catch (e) {
    // If not valid JSON, leave as is (will handle gracefully below)
  }

  return (
    // Slide-out drawer on the right side of the screen
    <Drawer 
      anchor="right" 
      open={open} 
      onClose={onClose} 
      slotProps={{ 
        paper: { 
          sx: { 
            width: { xs: '100%', sm: 500 }, // Full width on mobile, 500px on desktop
            p: 3, 
            bgcolor: '#ffffff', // Forced light mode background
            color: '#000000'    // Forced light mode text
          } 
        } 
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Audit Log Details</Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Divider sx={{ mb: 3 }} />

      {/* Grid showing top-level details like who did what, when, and from where */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Action</Typography>
          <Typography variant="body1">{log.action}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Status</Typography>
          <Box>
            <Chip size="small" color={log.status === 'Success' ? 'success' : 'error'} label={log.status} />
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Resource</Typography>
          <Typography variant="body1">{log.resourceType || '-'} (ID: {log.resourceId || '-'})</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">Timestamp</Typography>
          <Typography variant="body1">
            {log.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(log.createdAt)) : '-'}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">Description</Typography>
          <Typography variant="body1">{log.description || '-'}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">User</Typography>
          <Typography variant="body1">{log.user?.name || 'System'} ({log.user?.email || '-'})</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">IP Address</Typography>
          <Typography variant="body1">{log.ipAddress || '-'}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">User Agent</Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>
            {log.userAgent || '-'}
          </Typography>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Data Changes</Typography>
      
      {/* Fallback if no specific data changes were tracked for this action */}
      {!beforeValues && !afterValues && (
        <Typography color="text.secondary" variant="body2">No detailed data changes recorded for this action.</Typography>
      )}

      {/* Renders the old state of the data before the user modified it */}
      {beforeValues && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'bold' }}>Before (Old Values)</Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fdf8f8', overflowX: 'auto' }}>
            <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {JSON.stringify(beforeValues, null, 2)}
            </Box>
          </Paper>
        </Box>
      )}

      {/* Renders the new state of the data after the user modified it */}
      {afterValues && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>After (New Values)</Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fdf8', overflowX: 'auto' }}>
            <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {JSON.stringify(afterValues, null, 2)}
            </Box>
          </Paper>
        </Box>
      )}
    </Drawer>
  );
};

export default AuditDetailsDrawer;
