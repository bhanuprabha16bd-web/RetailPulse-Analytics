import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Tabs, Tab, Grid, Paper, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DataImport, importApi } from '../../api/importApi';
import { ErrorRecordsTable } from './ErrorRecordsTable';

interface ImportDetailModalProps {
  importId: number | null;
  onClose: () => void;
}

const statusColor = (status: string) => {
  if (status === 'Completed') return 'success';
  if (status === 'Completed with Errors') return 'warning';
  if (status === 'Failed') return 'error';
  if (status === 'Processing') return 'info';
  return 'default';
};

export const ImportDetailModal: React.FC<ImportDetailModalProps> = ({ importId, onClose }) => {
  const [data, setData] = useState<DataImport | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (importId) {
      importApi.getImport(importId).then(setData).catch(console.error);
    } else {
      setData(null);
      setTab(0);
    }
  }, [importId]);

  if (!importId || !data) return null;

  return (
    <Dialog open={!!importId} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Import Details — IMP-{String(data.id).padStart(4, '0')}</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Typography><b>Type:</b> {data.importType}</Typography>
          <Typography><b>File:</b> {data.filename}</Typography>
          <Typography>
            <b>Status:</b>{' '}
            <Chip size="small" label={data.status} color={statusColor(data.status) as any} />
          </Typography>
          <Typography><b>Uploaded:</b> {new Date(data.createdAt).toLocaleString()}</Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
            <Tab label="Summary" />
            <Tab label="Error Records" />
          </Tabs>
        </Box>

        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Total Records</Typography>
                <Typography variant="h6">{data.totalRecords}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Successful</Typography>
                <Typography variant="h6" color="success.main">{data.successfulRecords}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Failed</Typography>
                <Typography variant="h6" color="error.main">{data.failedRecords}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Duplicates</Typography>
                <Typography variant="h6" color="warning.main">{data.duplicateRecords}</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">Skipped</Typography>
                <Typography variant="h6">{data.skippedRecords}</Typography>
              </Paper>
            </Grid>
            {data.completedAt && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">Completed At</Typography>
                  <Typography variant="body1">{new Date(data.completedAt).toLocaleString()}</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}

        {tab === 1 && (
          <ErrorRecordsTable importId={data.id} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportDetailModal;
