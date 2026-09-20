import {
    Box, Typography, Paper, Chip, Button, IconButton, Divider, Grid
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../../api/notificationsApi';
import { getIconForType, getPriorityColor } from './notificationHelpers';

interface NotificationDetailProps {
    notification: Notification | null;
    onClose: () => void;
}

export default function NotificationDetail({ notification, onClose }: NotificationDetailProps) {
    const navigate = useNavigate();

    // Keep the detail panel useful even when no notification is selected.
    if (!notification) {
        return (
            <Paper sx={{ p: 3, height: 'calc(100vh - 250px)', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'grey.50' }}>
                <Typography color="text.secondary">Select a notification to view details</Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Notification Details</Typography>
                <IconButton size="small" onClick={onClose}>
                    <Close />
                </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {getIconForType(notification.type)}
                <Typography variant="h6" sx={{ ml: 1 }}>{notification.title}</Typography>
            </Box>

            <Chip
                label={notification.priority}
                color={getPriorityColor(notification.priority) as any}
                sx={{ alignSelf: 'flex-start', mb: 2 }}
            />

            <Typography variant="body1" sx={{ mb: 3 }}>
                {notification.message}
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">Type</Typography>
                    <Typography variant="body2">{notification.type}</Typography>
                </Grid>
                <Grid size={6}>
                    <Typography variant="caption" color="text.secondary">Time</Typography>
                    <Typography variant="body2">{new Date(notification.createdAt).toLocaleString()}</Typography>
                </Grid>
                {/* Some notifications are not linked to a specific resource. */}
                {notification.resourceType && (
                    <Grid size={6}>
                        <Typography variant="caption" color="text.secondary">Resource</Typography>
                        <Typography variant="body2">{notification.resourceType} #{notification.resourceId}</Typography>
                    </Grid>
                )}
            </Grid>

            {/* Resource actions appear only when this notification supports a destination. */}
            {notification.resourceType === 'Product' && (
                <Box sx={{ mt: 'auto' }}>
                    <Button variant="contained" fullWidth onClick={() => navigate('/inventory')}>
                        View Product
                    </Button>
                </Box>
            )}
            {notification.resourceType === 'Import' && (
                <Box sx={{ mt: 'auto' }}>
                    <Button variant="contained" fullWidth onClick={() => navigate('/data-import')}>
                        View Import History
                    </Button>
                </Box>
            )}
        </Paper>
    );
}
