import React from 'react';
import {
  Box, Typography, Paper, Button,
  ToggleButton, ToggleButtonGroup, IconButton
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

interface ImportConfigurationProps {
  importType: string;
  setImportType: (type: string) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  handleValidateFile: () => void;
  isUploading: boolean;
}

export default function ImportConfiguration({
  importType,
  setImportType,
  file,
  setFile,
  handleValidateFile,
  isUploading
}: ImportConfigurationProps) {
  const handleTypeChange = (_event: React.MouseEvent<HTMLElement>, newType: string | null) => {
    if (newType !== null) {
      setImportType(newType);
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
      } else {
        alert('Only .csv files are allowed');
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold' }} gutterBottom>Import Configuration</Typography>
      
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Import Type *</Typography>
      <ToggleButtonGroup
        color="primary"
        value={importType}
        exclusive
        onChange={handleTypeChange}
        fullWidth
        sx={{ mb: 3 }}
      >
        <ToggleButton value="Products" sx={{ py: 1 }}>
          <InventoryIcon sx={{ mr: 1, fontSize: 20 }} /> Products
        </ToggleButton>
        <ToggleButton value="Customers" sx={{ py: 1 }}>
          <PeopleIcon sx={{ mr: 1, fontSize: 20 }} /> Customers
        </ToggleButton>
        <ToggleButton value="Sales" sx={{ py: 1 }}>
          <ReceiptIcon sx={{ mr: 1, fontSize: 20 }} /> Sales
        </ToggleButton>
      </ToggleButtonGroup>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Upload CSV File *</Typography>
      {!file ? (
        <Box
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          sx={{
            border: '2px dashed #ccc',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            bgcolor: '#fafafa',
            cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main', bgcolor: '#f0f7ff' }
          }}
          onClick={() => document.getElementById('csv-upload')?.click()}
        >
          <input
            type="file"
            id="csv-upload"
            accept=".csv"
            hidden
            onChange={handleFileChange}
          />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="body1">Drag & drop your CSV file here</Typography>
          <Typography variant="body2" color="text.secondary">or click to browse</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Only .csv files are allowed (Max size: 10 MB)
          </Typography>
        </Box>
      ) : (
        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', mb: 2 }}>
          <DescriptionIcon color="success" sx={{ fontSize: 32, mr: 2 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{file.name}</Typography>
            <Typography variant="caption" color="text.secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</Typography>
          </Box>
          <IconButton size="small" onClick={() => setFile(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button variant="outlined" fullWidth startIcon={<DownloadIcon />}>
          Download Sample CSV
        </Button>
        <Button 
          variant="contained" 
          fullWidth 
          onClick={handleValidateFile}
          disabled={!file || isUploading}
        >
          {isUploading ? 'Uploading...' : 'Validate File'}
        </Button>
      </Box>
    </Paper>
  );
}
