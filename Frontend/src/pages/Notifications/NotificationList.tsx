import React from 'react';
import {
    Box, Typography, Paper, List, ListItemButton,
    ListItemText, ListItemIcon, Chip, CircularProgress, Divider
} from '@mui/material';
import { CheckCircleOutlined } from '@mui/icons-material';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Notification } from '../../api/notificationsApi';
import { getIconForType, getPriorityColor } from './notificationHelpers';

interface NotificationListProps {
    notifications: Notification[];
    isLoading: boolean;
    isError: boolean;
    onNotificationClick: (notification: Notification) => void;
}

export default function NotificationList({
    notifications, isLoading, isError, onNotificationClick
}: NotificationListProps) {
    if (isLoading) {
        return (
            <Paper sx={{ height: 'calc(100vh - 250px)', overflow: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                </Box>
            </Paper>
        );
    }

    if (isError) {
        return (
            <Paper sx={{ height: 'calc(100vh - 250px)', overflow: 'auto' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'error.main' }}>
                    <Typography>Failed to load notifications</Typography>
                </Box>
            </Paper>
        );
    }

    if (notifications.length === 0) {
        return (
            <Paper sx={{ height: 'calc(100vh - 250px)', overflow: 'auto' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                    <CheckCircleOutlined sx={{ fontSize: 64, mb: 2, color: 'success.main', opacity: 0.5 }} />
                    <Typography variant="h6">You're all caught up</Typography>
                    <Typography>No new notifications match your criteria.</Typography>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper sx={{ height: 'calc(100vh - 250px)', overflow: 'auto' }}>
            <List sx={{ p: 0 }}>
                {notifications.map((notif, index) => (
                    <React.Fragment key={notif.id}>
                        {index > 0 && <Divider />}
                        <ListItemButton
                            onClick={() => onNotificationClick(notif)}
                            sx={{
                                bgcolor: notif.isRead ? 'transparent' : 'action.hover',
                                borderLeft: notif.isRead ? '4px solid transparent' : '4px solid',
                                borderLeftColor: 'primary.main'
                            }}
                        >
                            <ListItemIcon>
                                {getIconForType(notif.type)}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: notif.isRead ? 'normal' : 'bold' }}>
                                            {notif.title}
                                        </Typography>
                                        <Chip
                                            label={notif.priority}
                                            size="small"
                                            color={getPriorityColor(notif.priority) as any}
                                            variant={notif.priority === 'Critical' || notif.priority === 'High' ? 'filled' : 'outlined'}
                                        />
                                    </Box>
                                }
                                secondary={
                                    <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Typography component="span" variant="body2" color="text.secondary" sx={{ maxWidth: '70%' }}>
                                            {notif.message}
                                        </Typography>
                                        <Typography component="span" variant="caption" color="text.secondary">
                                            {formatDistanceToNow(parseISO(notif.createdAt), { addSuffix: true })}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </ListItemButton>
                    </React.Fragment>
                ))}
            </List>
        </Paper>
    );
}
