import React, { useState } from 'react';
import { Box, Paper, Typography, MenuItem, Select, Button, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { importApi } from '../../api/importApi';

interface ImportConfigurationProps {
  onValidate: (file: File, type: string) => void;
  isLoading: boolean;
}

export const ImportConfiguration: React.FC<ImportConfigurationProps> = ({ onValidate, isLoading }) => {
  const [importType, setImportType] = useState('Products');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  const handleFile = (file: File) => {
    setFileError('');
    if (!file.name.endsWith('.csv')) {
      setFileError('Only CSV files are supported.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds 10MB limit.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        New Data Import
      </Typography>
      <Box sx={{ mt: 3, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Import Type
        </Typography>
        <Select
          fullWidth
          value={importType}
          onChange={(e) => setImportType(e.target.value)}
          size="small"
        >
          <MenuItem value="Products">Products</MenuItem>
          <MenuItem value="Inventory">Inventory</MenuItem>
          <MenuItem value="Customers">Customers</MenuItem>
          <MenuItem value="Sales">Sales</MenuItem>
        </Select>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="body2" color="textSecondary">
          Supported format: CSV (Max 10MB)
        </Typography>
        <Button
          startIcon={<DownloadIcon />}
          size="small"
          onClick={() => importApi.downloadTemplate(importType)}
        >
          Download Template
        </Button>
      </Box>

      <Box
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: dragOver ? 'action.hover' : 'background.default',
          cursor: 'pointer'
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          hidden
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        {selectedFile ? (
          <Box>
            <Typography variant="body1">{selectedFile.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="body1">Drag and drop file here</Typography>
            <Typography variant="body2" color="textSecondary">or click to browse</Typography>
          </Box>
        )}
      </Box>

      {fileError && (
        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
          {fileError}
        </Typography>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          disabled={!selectedFile || isLoading}
          onClick={() => selectedFile && onValidate(selectedFile, importType)}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Validate File'}
        </Button>
      </Box>
    </Paper>
  );
};

export default ImportConfiguration;
