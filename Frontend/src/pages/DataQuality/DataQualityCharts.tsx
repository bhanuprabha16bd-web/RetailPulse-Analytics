import { Paper, Typography, Box, CircularProgress, Divider } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { dataQualityApi } from '../../api/dataQualityApi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getChartColor, getSeverityColor } from './DataQualityShared';

const DataQualityCharts = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dataQualityStats'],
    queryFn: dataQualityApi.getIssueStats
  });

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>Data Quality Insights</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}><CircularProgress /></Box>
      </Paper>
    );
  }

  if (!stats) return null;

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>Data Quality Insights</Typography>
      
      <Box sx={{ height: 200, mt: 2 }}>
        <Typography variant="subtitle2" align="center" color="textSecondary" gutterBottom>Issues by Type</Typography>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={stats.byType}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {stats.byType.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getChartColor(entry.name)} />
              ))}
            </Pie>
            <Tooltip />
            <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px' }}/>
          </PieChart>
        </ResponsiveContainer>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ height: 180 }}>
        <Typography variant="subtitle2" align="center" color="textSecondary" gutterBottom>Issues by Severity</Typography>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={stats.bySeverity}
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fontSize: '12px' }} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {stats.bySeverity.map((entry, index) => {
                const colorObj = getSeverityColor(entry.name);
                return <Cell key={`cell-${index}`} fill={colorObj.color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default DataQualityCharts;
