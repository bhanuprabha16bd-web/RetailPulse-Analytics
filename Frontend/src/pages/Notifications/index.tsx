import { useState } from 'react';
import { Box, Typography, Button, Grid } from '@mui/material';
import { CheckCircleOutlined } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, Notification } from '../../api/notificationsApi';
import NotificationFilters from './NotificationFilters';
import NotificationList from './NotificationList';
import NotificationDetail from './NotificationDetail';

export default function Notifications() {
    const queryClient = useQueryClient();

    // Keep the selected filters and notification detail panel local to this page.
    const [tab, setTab] = useState(0);
    const [typeFilter, setTypeFilter] = useState('All Types');
    const [priorityFilter, setPriorityFilter] = useState('All Priorities');
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

    // Convert the UI's "all" options into omitted API parameters.
    const isReadFilter = tab === 1 ? false : tab === 2 ? true : undefined;
    const typeParam = typeFilter !== 'All Types' ? typeFilter : undefined;
    const priorityParam = priorityFilter !== 'All Priorities' ? priorityFilter : undefined;

    // Refresh periodically so the notification center stays current.
    const { data, isLoading, isError } = useQuery({
        queryKey: ['notifications', { tab, typeFilter, priorityFilter }],
        queryFn: () => notificationsApi.getNotifications({
            page: 1, limit: 50,
            isRead: isReadFilter,
            type: typeParam,
            priority: priorityParam
        }),
        refetchInterval: 30000,
    });

    const markAsReadMutation = useMutation({
        mutationFn: notificationsApi.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
        }
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: notificationsApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
        }
    });

    const handleNotificationClick = (notification: Notification) => {
        setSelectedNotification(notification);

        // Opening an unread notification marks it read and refreshes the counts.
        if (!notification.isRead) {
            markAsReadMutation.mutate(notification.id);
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Notification Center</Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Stay updated with important events and alerts
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    startIcon={<CheckCircleOutlined />}
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                >
                    Mark All as Read
                </Button>
            </Box>

            {/* Filters */}
            <NotificationFilters
                tab={tab}
                onTabChange={(_e, v) => setTab(v)}
                totalCount={tab === 0 ? data?.total : undefined}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                priorityFilter={priorityFilter}
                onPriorityFilterChange={setPriorityFilter}
            />

            {/* Content */}
            <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                    <NotificationList
                        notifications={data?.notifications ?? []}
                        isLoading={isLoading}
                        isError={isError}
                        onNotificationClick={handleNotificationClick}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <NotificationDetail
                        notification={selectedNotification}
                        onClose={() => setSelectedNotification(null)}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}
