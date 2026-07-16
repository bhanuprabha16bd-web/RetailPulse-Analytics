import React, { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { axiosPrivate } from '../api/axios';

interface AuditLog {
  id: number;
  action: string;
  ip_address?: string | null;
  browser?: string | null;
  timestamp: string;
  company?: { name: string } | null;
  user?: { name: string; email: string } | null;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axiosPrivate.get('/audit-logs/')
      .then((response) => setLogs(response.data))
      .catch((requestError) => setError(requestError.response?.data?.detail || 'Unable to load audit logs.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>Audit Logs</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Security and account activity for your company.</Typography>
      {error ? <Alert severity="error">{error}</Alert> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell><TableCell>Action</TableCell><TableCell>Company</TableCell>
                <TableCell>User</TableCell><TableCell>IP Address</TableCell><TableCell>Browser</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(log.timestamp))}</TableCell>
                  <TableCell>{log.action}</TableCell><TableCell>{log.company?.name ?? '—'}</TableCell>
                  <TableCell>{log.user ? `${log.user.name} (${log.user.email})` : '—'}</TableCell>
                  <TableCell>{log.ip_address ?? '—'}</TableCell><TableCell sx={{ maxWidth: 260, wordBreak: 'break-word' }}>{log.browser ?? '—'}</TableCell>
                </TableRow>
              ))}
              {!logs.length && <TableRow><TableCell colSpan={6} align="center">No audit activity recorded yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AuditLogs;
