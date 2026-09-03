import React, { useState } from 'react';
import { Box, Typography, Button, Container, CircularProgress } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAuditLogs, AuditLogFilters, clearAuditLogs, exportAuditLogs, AuditLog } from '../api/auditApi';
import AuditStats from '../components/audit/AuditStats';
import AuditFilterBar from '../components/audit/AuditFilterBar';
import AuditTable from '../components/audit/AuditTable';
import AuditTimeline from '../components/audit/AuditTimeline';
import AuditDetailsDrawer from '../components/audit/AuditDetailsDrawer';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

const AuditLogs: React.FC = () => {
  const queryClient = useQueryClient();
  
  // State to manage current filtering, pagination, and sorting for the logs table
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 25,
    sortBy: 'newest'
  });
  
  // State to store which log the user currently clicked to view details in the side drawer
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch logs automatically whenever `filters` state changes.
  // Polling every 10 seconds keeps the dashboard data fresh without requiring page reloads.
  const { data, isLoading, isError } = useQuery({
    queryKey: ['auditLogs', filters],
    queryFn: () => fetchAuditLogs(filters),
    refetchInterval: 10000, 
  });

  // Mutation logic for clearing out the audit logs
  const clearMutation = useMutation({
    mutationFn: clearAuditLogs,
    onSuccess: () => {
      // Automatically refresh the table data after successful clear
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });

  // Triggered when user clicks the "Clear Logs" button
  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all audit logs? This cannot be undone.')) {
      clearMutation.mutate(true);
    }
  };

  // Handles downloading the current filtered logs as CSV or PDF
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const blob = await exportAuditLogs(format, filters);
      // Creates a temporary link in browser memory to trigger file download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(`Export ${format} failed`, error);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Top Header Section: Title and Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, width: '100%' }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Audit Logs & Activity Monitoring
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />} 
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<FileDownloadIcon />} 
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            startIcon={<DeleteSweepIcon />} 
            onClick={handleClearLogs}
            disabled={clearMutation.isPending} // Prevent multiple clicks while deleting
          >
            Clear Logs
          </Button>
        </Box>
      </Box>

      {/* Top Stats Cards Summary */}
      <AuditStats logs={data?.logs || []} total={data?.total || 0} />
      
      {/* Filter and Search Bar: Updating this automatically triggers useQuery to fetch new data */}
      <AuditFilterBar filters={filters} setFilters={setFilters} />

      {/* Main Logs Table */}
      <Box sx={{ mt: 3, mb: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : isError ? (
          <Typography color="error">Error loading audit logs.</Typography>
        ) : (
          <AuditTable 
            logs={data?.logs || []} 
            total={data?.total || 0}
            filters={filters}
            setFilters={setFilters}
            onRowClick={(log) => setSelectedLog(log)} // Open side drawer with clicked log
          />
        )}
      </Box>

      {/* Recent Activity Timeline Graphic */}
      <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 4, mb: 2 }}>
        Recent Activity
      </Typography>
      {/* Passes only the latest 5 logs down to the timeline */}
      <AuditTimeline logs={data?.logs?.slice(0, 5) || []} />

      {/* Side drawer overlay for showing JSON before/after value changes */}
      <AuditDetailsDrawer 
        open={Boolean(selectedLog)} 
        onClose={() => setSelectedLog(null)} 
        log={selectedLog} 
      />
    </Container>
  );
};

export default AuditLogs;
