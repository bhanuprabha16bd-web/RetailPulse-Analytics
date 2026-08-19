import { Grid, Card, CardContent, Typography, Divider, Box } from '@mui/material';

interface CustomerProfileTimelineProps {
  timeline: any[];
}

const CustomerProfileTimeline: React.FC<CustomerProfileTimelineProps> = ({ timeline }) => {
  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      <Grid size={12}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Customer Timeline</Typography>
            <Divider sx={{ mb: 2 }} />
            
            {timeline.length > 0 ? (
              <Box sx={{ ml: 1, borderLeft: '2px solid', borderColor: 'divider', pl: 3, position: 'relative' }}>
                {timeline.map((event) => (
                  <Box key={event.id} sx={{ mb: 3, position: 'relative' }}>
                    <Box sx={{
                      position: 'absolute',
                      left: -32,
                      top: 4,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      border: '2px solid white',
                      boxShadow: '0 0 0 1px #e0e0e0'
                    }} />
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{event.action}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(event.timestamp).toLocaleString()} • {event.user}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No timeline events found.</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CustomerProfileTimeline;
