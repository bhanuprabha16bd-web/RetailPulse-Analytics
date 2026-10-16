import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Skeleton } from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import BlockIcon from '@mui/icons-material/Block';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { WorkflowStats as WorkflowStatsType } from '../../api/workflowApi';

interface StatCardProps {
  title: string;
  count: number | undefined;
  growth: number | null | undefined;
  icon: React.ReactNode;
  color: string;
  isLoading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, growth, icon, color, isLoading }) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            bgcolor: `${color}15`, 
            color: color,
            p: 1, 
            borderRadius: 2, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mr: 2
          }}>
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
        </Box>
        
        {isLoading ? (
          <Skeleton variant="text" width="60%" height={40} />
        ) : (
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            {count ?? 0}
          </Typography>
        )}
        
        {isLoading ? (
          <Skeleton variant="text" width="40%" height={20} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {growth !== undefined && growth !== null && (
              <>
                {growth >= 0 ? (
                  <ArrowUpwardIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                ) : (
                  <ArrowDownwardIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                )}
                <Typography variant="body2" color={growth >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold' }}>
                  {Math.abs(growth)}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  from last month
                </Typography>
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

interface WorkflowStatsProps {
  stats?: WorkflowStatsType;
  isLoading: boolean;
}

const WorkflowStats: React.FC<WorkflowStatsProps> = ({ stats, isLoading }) => {
  const cards = [
    {
      title: 'Total Requests',
      count: stats?.totalRequests,
      growth: stats?.totalGrowth,
      icon: <AssessmentIcon />,
      color: '#1976d2' // blue
    },
    {
      title: 'Pending Approval',
      count: stats?.pendingApproval,
      growth: stats?.pendingGrowth,
      icon: <HourglassEmptyIcon />,
      color: '#ed6c02' // orange
    },
    {
      title: 'Approved',
      count: stats?.approved,
      growth: undefined,
      icon: <CheckCircleOutlineIcon />,
      color: '#2e7d32' // green
    },
    {
      title: 'Rejected',
      count: stats?.rejected,
      growth: undefined,
      icon: <HighlightOffIcon />,
      color: '#d32f2f' // red
    },
    {
      title: 'Cancelled',
      count: stats?.cancelled,
      growth: undefined,
      icon: <BlockIcon />,
      color: '#9e9e9e' // grey
    }
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={index}>
          <StatCard {...card} isLoading={isLoading} />
        </Grid>
      ))}
    </Grid>
  );
};

export default WorkflowStats;
