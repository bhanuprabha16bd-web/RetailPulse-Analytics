import React from 'react';
import { Paper, Typography } from '@mui/material';
import {
  Timeline, TimelineItem, TimelineSeparator, TimelineConnector, 
  TimelineContent, TimelineDot, TimelineOppositeContent
} from '@mui/lab';
import { AuditLog } from '../../api/auditApi';

interface AuditTimelineProps {
  logs: AuditLog[];
}

const AuditTimeline: React.FC<AuditTimelineProps> = ({ logs }) => {
  // Empty state handling
  if (!logs.length) {
    return <Typography color="text.secondary">No recent activity.</Typography>;
  }

  return (
    <Paper sx={{ p: 2 }}>
      {/* Visual vertical timeline aligned to the right side of the timestamp */}
      <Timeline position="right">
        {logs.map((log, index) => (
          <TimelineItem key={log.id}>
            
            {/* The timestamp on the left side of the dot */}
            <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.2 }}>
              {log.createdAt ? new Intl.DateTimeFormat(undefined, { 
                timeStyle: 'short' 
              }).format(new Date(log.createdAt)) : '-'}
            </TimelineOppositeContent>
            
            {/* The visual line and dot connecting the items */}
            <TimelineSeparator>
              <TimelineDot color={log.status === 'Success' ? 'success' : 'error'} />
              {/* Only show the connecting line if it's not the last item in the list */}
              {index < logs.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            
            {/* The descriptive text on the right side of the dot */}
            <TimelineContent>
              <Typography variant="subtitle2" component="span">
                {log.user?.name || 'System'}
              </Typography>
              {' '}—{' '}
              <Typography variant="body2" component="span" color="text.secondary">
                {log.description || `${log.action} on ${log.resourceType}`}
              </Typography>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Paper>
  );
};

export default AuditTimeline;
