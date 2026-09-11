import {
    Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
    Grid, SelectChangeEvent
} from '@mui/material';
import { NOTIFICATION_TYPES, PRIORITY_LEVELS } from './notificationHelpers';

interface NotificationFiltersProps {
    tab: number;
    onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
    totalCount?: number;
    typeFilter: string;
    onTypeFilterChange: (value: string) => void;
    priorityFilter: string;
    onPriorityFilterChange: (value: string) => void;
}

export default function NotificationFilters({
    tab, onTabChange, totalCount,
    typeFilter, onTypeFilterChange,
    priorityFilter, onPriorityFilterChange
}: NotificationFiltersProps) {
    return (
        <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
                <Tabs value={tab} onChange={onTabChange} aria-label="notification tabs">
                    <Tab label={`All ${tab === 0 && totalCount !== undefined ? `(${totalCount})` : ''}`} />
                    <Tab label="Unread" />
                    <Tab label="Read" />
                </Tabs>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                        value={typeFilter}
                        label="Type"
                        onChange={(e: SelectChangeEvent) => onTypeFilterChange(e.target.value)}
                    >
                        <MenuItem value="All Types">All Types</MenuItem>
                        {NOTIFICATION_TYPES.map(t => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth size="small">
                    <InputLabel>Priority</InputLabel>
                    <Select
                        value={priorityFilter}
                        label="Priority"
                        onChange={(e: SelectChangeEvent) => onPriorityFilterChange(e.target.value)}
                    >
                        <MenuItem value="All Priorities">All Priorities</MenuItem>
                        {PRIORITY_LEVELS.map(p => (
                            <MenuItem key={p} value={p}>{p}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
        </Grid>
    );
}
