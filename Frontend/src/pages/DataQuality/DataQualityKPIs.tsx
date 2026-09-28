import React from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { ReconciliationSummary } from '../../api/dataQualityApi';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import BugReportIcon from '@mui/icons-material/BugReport';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { format } from 'date-fns';

interface DataQualityKPIsProps {
  summary?: ReconciliationSummary;
  isLoading: boolean;
}

const DataQualityKPIs: React.FC<DataQualityKPIsProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  const kpis = [
    { title: 'Total Records Checked', value: summary?.totalRecordsChecked || 0, icon: <AssessmentIcon color="primary" sx={{ fontSize: 40 }} />, color: 'primary.main' },
    { title: 'Valid Records', value: summary?.validRecords || 0, icon: <CheckCircleOutlineIcon color="success" sx={{ fontSize: 40 }} />, color: 'success.main' },
    { title: 'Records with Warnings', value: summary?.warningsCount || 0, icon: <WarningAmberIcon color="warning" sx={{ fontSize: 40 }} />, color: 'warning.main' },
    { title: 'Records with Errors', value: summary?.errorsCount || 0, icon: <ErrorOutlineIcon color="error" sx={{ fontSize: 40 }} />, color: 'error.main' },
    { title: 'Unresolved Issues', value: summary?.unresolvedIssues || 0, icon: <BugReportIcon color="secondary" sx={{ fontSize: 40 }} />, color: 'secondary.main' },
    { 
      title: 'Last Reconciliation', 
      value: summary?.lastReconciliationTime ? format(new Date(summary.lastReconciliationTime), 'PPp') : 'Never', 
      icon: <AccessTimeIcon color="action" sx={{ fontSize: 40 }} />, 
      color: 'text.secondary',
      subValue: summary?.lastReconciliationStatus
    }
  ];

  return (
    <Grid container spacing={2}>
      {kpis.map((kpi, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={index}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 2 }}>
              {kpi.icon}
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>{kpi.title}</Typography>
              <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
              </Typography>
              {kpi.subValue && <Typography variant="caption" color="textSecondary">{kpi.subValue}</Typography>}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default DataQualityKPIs;
