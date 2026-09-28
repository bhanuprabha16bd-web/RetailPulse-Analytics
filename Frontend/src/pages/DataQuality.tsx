import React from 'react';
import { Box, Typography, Grid, Button, TextField } from '@mui/material';
import { PlayArrow, Search as SearchIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataQualityApi, IssueFilters } from '../api/dataQualityApi';
import DataQualityKPIs from './DataQuality/DataQualityKPIs';
import DataQualityFilters from './DataQuality/DataQualityFilters';
import DataQualityTable from './DataQuality/DataQualityTable';
import DataQualityIssueDetail from './DataQuality/DataQualityIssueDetail';
import ReconciliationHistory from './DataQuality/ReconciliationHistory';
import DataQualityCharts from './DataQuality/DataQualityCharts';

const DataQuality = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = React.useState<IssueFilters>({
    page: 1,
    limit: 10,
    search: '',
    issueType: '',
    severity: '',
    module: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [selectedIssueId, setSelectedIssueId] = React.useState<number | null>(null);

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['dataQualitySummary'],
    queryFn: dataQualityApi.getSummary
  });

  const { data: paginatedIssues, isLoading: isLoadingIssues, refetch: refetchIssues } = useQuery({
    queryKey: ['dataQualityIssues', filters],
    queryFn: () => dataQualityApi.getIssues(filters)
  });

  const runReconciliationMutation = useMutation({
    mutationFn: dataQualityApi.runReconciliation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataQualitySummary'] });
      queryClient.invalidateQueries({ queryKey: ['dataQualityIssues'] });
      queryClient.invalidateQueries({ queryKey: ['dataQualityReconciliationHistory'] });
      queryClient.invalidateQueries({ queryKey: ['dataQualityStats'] });
    }
  });

  const handleFilterChange = (key: keyof IssueFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Data Quality & Reconciliation</Typography>
      <Typography variant="subtitle1" color="textSecondary" gutterBottom>
        Identify data inconsistencies and view reconciliation results.
      </Typography>
      
      <DataQualityKPIs summary={summary} isLoading={isLoadingSummary} />
      
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, mt: 3, flexWrap: 'wrap' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<PlayArrow />}
          onClick={() => runReconciliationMutation.mutate()}
          disabled={runReconciliationMutation.isPending}
        >
          {runReconciliationMutation.isPending ? 'Running...' : 'Run Reconciliation'}
        </Button>
        <DataQualityFilters filters={filters} onFilterChange={handleFilterChange} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField 
          placeholder="Search issues..." 
          variant="outlined" 
          size="small"
          value={filters.search}
          onChange={handleSearchChange}
          fullWidth
          slotProps={{
            input: {
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
            }
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 4, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <DataQualityTable 
            issues={paginatedIssues?.issues || []}
            total={paginatedIssues?.total || 0}
            page={filters.page || 1}
            limit={filters.limit || 10}
            onPageChange={(page) => handleFilterChange('page', page)}
            onLimitChange={(limit) => handleFilterChange('limit', limit)}
            onSelectIssue={(id) => setSelectedIssueId(id)}
            isLoading={isLoadingIssues}
          />
        </Box>
        {selectedIssueId && (
          <Box sx={{ width: 380, flexShrink: 0 }}>
            <DataQualityIssueDetail 
              issueId={selectedIssueId} 
              onClose={() => setSelectedIssueId(null)}
              onStatusUpdate={() => refetchIssues()}
            />
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <ReconciliationHistory />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <DataQualityCharts />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataQuality;
