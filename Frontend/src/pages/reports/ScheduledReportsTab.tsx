import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Delete, Edit, PlayArrow, Save } from '@mui/icons-material';

import { ReportFilters } from './ReportFilters';
import type { Filters, Schedule } from './types';
import { reportLabel } from './utils';

interface ScheduledReportsTabProps {
  reportType: string;
  filters: Filters;
  editing: number | null;
  schedule: {
    frequency: string;
    execution_time: string;
    recipients: string;
    format: string;
    is_active: boolean;
  };
  schedules: Schedule[];
  canManageSchedules: boolean;
  savingSchedule: boolean;
  onReportTypeChange: (value: string) => void;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onScheduleChange: (next: { frequency: string; execution_time: string; recipients: string; format: string; is_active: boolean }) => void;
  onSaveSchedule: () => void;
  onEditSchedule: (item: Schedule) => void;
  onDeleteSchedule: (id: number) => void;
  onRunSchedule: (id: number) => void;
  onToggleSchedule: (id: number, isActive: boolean) => void;
  onCancelEdit: () => void;
}

function formatScheduleDate(value?: string) {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString();
}

export function ScheduledReportsTab({
  reportType,
  filters,
  editing,
  schedule,
  schedules,
  canManageSchedules,
  savingSchedule,
  onReportTypeChange,
  onFilterChange,
  onScheduleChange,
  onSaveSchedule,
  onEditSchedule,
  onDeleteSchedule,
  onRunSchedule,
  onToggleSchedule,
  onCancelEdit,
}: ScheduledReportsTabProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{editing ? 'Edit schedule' : 'Create schedule'}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose a report and filters, set the delivery frequency and time, add recipient emails separated by commas, then select Save.
      </Typography>

      {!canManageSchedules && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Your role cannot create or edit schedules. Ask a Company Admin or Company Owner.
        </Alert>
      )}

      <ReportFilters
        reportType={reportType}
        filters={filters}
        onReportTypeChange={onReportTypeChange}
        onFilterChange={onFilterChange}
      />

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, alignItems: { md: 'center' }, mb: 2 }}>
        <FormControl size="small">
          <InputLabel>Frequency</InputLabel>
          <Select
            value={schedule.frequency}
            label="Frequency"
            onChange={(event) => onScheduleChange({ ...schedule, frequency: event.target.value })}
          >
            <MenuItem value="Daily">Daily</MenuItem>
            <MenuItem value="Weekly">Weekly</MenuItem>
            <MenuItem value="Monthly">Monthly</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          type="time"
          label="Execution time"
          value={schedule.execution_time}
          onChange={(event) => onScheduleChange({ ...schedule, execution_time: event.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          size="small"
          label="Recipients"
          value={schedule.recipients}
          onChange={(event) => onScheduleChange({ ...schedule, recipients: event.target.value })}
          placeholder="user@example.com, team@example.com"
          sx={{ minWidth: 260 }}
        />

        <FormControl size="small">
          <InputLabel>Format</InputLabel>
          <Select
            value={schedule.format}
            label="Format"
            onChange={(event) => onScheduleChange({ ...schedule, format: event.target.value })}
          >
            <MenuItem value="CSV">CSV</MenuItem>
            <MenuItem value="PDF">PDF</MenuItem>
            <MenuItem value="XLSX">XLSX</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">Active</Typography>
        <Switch
          checked={schedule.is_active}
          onChange={(_, checked) => onScheduleChange({ ...schedule, is_active: checked })}
        />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={onSaveSchedule}
          disabled={savingSchedule || !canManageSchedules}
        >
          {savingSchedule ? 'Saving...' : editing ? 'Update schedule' : 'Save schedule'}
        </Button>

        {editing && (
          <Button variant="outlined" color="inherit" onClick={onCancelEdit}>
            Cancel
          </Button>
        )}
      </Stack>

      {schedules.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Existing schedules
          </Typography>

          <Stack spacing={1}>
            {schedules.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="subtitle2">{reportLabel(item.report_type)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.frequency} • {item.execution_time} • {item.format}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Chip label={item.is_active ? 'Active' : 'Inactive'} color={item.is_active ? 'success' : 'default'} size="small" />
                    <Switch
                      checked={item.is_active}
                      size="small"
                      onChange={(_, checked) => onToggleSchedule(item.id, checked)}
                    />
                    <Button size="small" startIcon={<Edit />} onClick={() => onEditSchedule(item)}>
                      Edit
                    </Button>
                    <Button size="small" startIcon={<PlayArrow />} onClick={() => onRunSchedule(item.id)}>
                      Run
                    </Button>
                    <Button size="small" startIcon={<Delete />} color="error" onClick={() => onDeleteSchedule(item.id)}>
                      Delete
                    </Button>
                  </Stack>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
