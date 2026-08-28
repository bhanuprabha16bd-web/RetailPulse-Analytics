import { Box, Typography, Paper, LinearProgress, Button } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { DataImport } from '../../api/importApi';

interface ImportResultProps {
  isImporting: boolean;
  importResult: DataImport | null;
}

export default function ImportResult({ isImporting, importResult }: ImportResultProps) {
  if (!isImporting && !importResult) return null;

  return (
    <Paper sx={{ mt: 3, p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>Import Processing</Typography>
      
      {isImporting ? (
         <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
           <LinearProgress sx={{ flexGrow: 1, height: 10, borderRadius: 5 }} />
           <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Processing...</Typography>
         </Box>
      ) : importResult && (
         <Box sx={{ bgcolor: '#f0fdf4', p: 3, borderRadius: 2, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
             <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
             <Box>
               <Typography variant="h6" sx={{ fontWeight: 'bold' }} color="success.main">
                 {importResult.status === 'Completed' ? 'Import Completed Successfully' : 'Import Completed with Errors'}
               </Typography>
               <Typography variant="body2" color="text.secondary">
                 Import processed on {new Date(importResult.completedAt || '').toLocaleString()}
               </Typography>
             </Box>
           </Box>

           <Box sx={{ display: 'flex', gap: 2 }}>
             <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0', textAlign: 'center', minWidth: 100 }}>
                <Typography variant="caption" color="text.secondary">Total Records</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{importResult.totalRecords}</Typography>
             </Box>
             <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0', textAlign: 'center', minWidth: 100 }}>
                <Typography variant="caption" color="text.secondary">Successfully Added</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="success.main">{importResult.successfulRecords}</Typography>
             </Box>
             <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0', textAlign: 'center', minWidth: 100 }}>
                <Typography variant="caption" color="text.secondary">Duplicates Skipped</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="warning.main">{importResult.duplicateRecords}</Typography>
             </Box>
             <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #e0e0e0', textAlign: 'center', minWidth: 100 }}>
                <Typography variant="caption" color="text.secondary">Failed Records</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }} color="error.main">{importResult.failedRecords}</Typography>
             </Box>
           </Box>

           {(importResult.failedRecords > 0 || importResult.duplicateRecords > 0) && (
             <Button variant="outlined" color="error" startIcon={<DownloadIcon />}>
               Download Failed Records
             </Button>
           )}
         </Box>
      )}
    </Paper>
  );
}
