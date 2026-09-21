import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';

import { axiosPrivate } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { GenerateReportTab } from './reports/GenerateReportTab';
import { ReportHistoryTab } from './reports/ReportHistoryTab';
import { ScheduledReportsTab } from './reports/ScheduledReportsTab';
import { initialFilters, type Filters, type History, type ReportResponse, type Schedule } from './reports/types';

export default function Reports() {
  const [tab, setTab] = useState(0);
  const [reportType, setReportType] = useState('sales');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [schedule, setSchedule] = useState({
    frequency: 'Weekly',
    execution_time: '09:00',
    recipients: '',
    format: 'CSV',
    is_active: true,
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState('');

  const { user } = useAuth();
  const canManageSchedules = ['Company Owner', 'Company Admin', 'Super Admin'].includes(user?.role || '');

  const query = (extra: Record<string, string | number> = {}) => {
    const params = new URLSearchParams({
      report_type: reportType,
      page: String(page + 1),
      limit: '25',
      sort_by: sortBy,
      sort_order: sortOrder,
      ...extra,
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    return params;
  };

  const loadReport = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axiosPrivate.get<ReportResponse>('/reports/data', { params: query() });
      setReport(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to generate this report.');
    } finally {
      setLoading(false);
    }
  };

  const loadSecondaryData = async () => {
    try {
      const [historyResponse, schedulesResponse] = await Promise.all([
        axiosPrivate.get<History[]>('/reports/history'),
        axiosPrivate.get<Schedule[]>('/reports/schedules'),
      ]);
      setHistory(historyResponse.data);
      setSchedules(schedulesResponse.data.map((item: Schedule & Record<string, unknown>) => ({
        ...item,
        report_type: item.report_type ?? item.reportType,
        execution_time: item.execution_time ?? item.executionTime,
        is_active: item.is_active ?? item.isActive,
        last_run_at: item.last_run_at ?? item.lastRunAt,
        last_status: item.last_status ?? item.lastStatus,
        last_error: item.last_error ?? item.lastError,
      })));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load report history.');
    }
  };

  useEffect(() => {
    loadSecondaryData();
  }, []);

  useEffect(() => {
    if (report) {
      loadReport();
    }
  }, [page]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  const changeSort = (key: string) => {
    setSortOrder((current) => (sortBy === key && current === 'desc' ? 'asc' : 'desc'));
    setSortBy(key);
    setPage(0);
    setTimeout(loadReport, 0);
  };

  const exportReport = async (format: 'CSV' | 'PDF') => {
    try {
      const response = await axiosPrivate.get('/reports/export', {
        params: query({ report_format: format }),
        responseType: 'blob',
      });

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_report.${format.toLowerCase()}`;
      link.click();
      URL.revokeObjectURL(url);
      await loadSecondaryData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to export this report.');
    }
  };

  const saveSchedule = async () => {
    if (!canManageSchedules) {
      setError('Only Company Admin, Company Owner, or Super Admin users can create schedules.');
      return;
    }

    if (!schedule.recipients.trim()) {
      setError('Add at least one recipient email.');
      return;
    }

    setSavingSchedule(true);
    setError('');
    setScheduleSuccess('');

    try {
      const payload = {
        report_type: reportType,
        filters,
        ...schedule,
        recipients: schedule.recipients
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (editing) {
        await axiosPrivate.patch(`/reports/schedules/${editing}`, payload);
      } else {
        await axiosPrivate.post('/reports/schedules', payload);
      }

      setEditing(null);
      setSchedule({
        frequency: 'Weekly',
        execution_time: '09:00',
        recipients: '',
        format: 'CSV',
        is_active: true,
      });
      setScheduleSuccess('Schedule saved successfully.');
      await loadSecondaryData();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.map((item: any) => item.msg).join(', ') : detail || 'Unable to save schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const editSchedule = (item: Schedule) => {
    setEditing(item.id);
    setReportType(item.report_type);
    setFilters({ ...initialFilters, ...(item.filters as Partial<Filters>) });
    setSchedule({
      frequency: item.frequency,
      execution_time: item.execution_time,
      recipients: item.recipients.join(', '),
      format: item.format,
      is_active: item.is_active,
    });
    setTab(1);
  };

  const deleteSchedule = async (id: number) => {
    try {
      await axiosPrivate.delete(`/reports/schedules/${id}`);
      await loadSecondaryData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to delete schedule.');
    }
  };

  const runSchedule = async (id: number) => {
    try {
      await axiosPrivate.post(`/reports/schedules/${id}/run`);
      await loadSecondaryData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Scheduled report failed.');
    }
  };

  const toggleSchedule = async (id: number, isActive: boolean) => {
    const current = schedules.find((item) => item.id === id);
    if (!current) return;

    try {
      await axiosPrivate.patch(`/reports/schedules/${id}`, {
        report_type: current.report_type,
        filters: current.filters,
        frequency: current.frequency,
        execution_time: current.execution_time,
        recipients: Array.isArray(current.recipients) ? current.recipients : [],
        format: current.format,
        is_active: isActive,
      });
      await loadSecondaryData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to update schedule status.');
    }
  };

  const renderReportTab = () => (
    <GenerateReportTab
      reportType={reportType}
      filters={filters}
      report={report}
      loading={loading}
      page={page}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onReportTypeChange={setReportType}
      onFilterChange={updateFilter}
      onGenerate={loadReport}
      onExport={exportReport}
      onSort={changeSort}
      onPageChange={setPage}
    />
  );

  const renderScheduleTab = () => (
    <ScheduledReportsTab
      reportType={reportType}
      filters={filters}
      editing={editing}
      schedule={schedule}
      schedules={schedules}
      canManageSchedules={canManageSchedules}
      savingSchedule={savingSchedule}
      onReportTypeChange={setReportType}
      onFilterChange={updateFilter}
      onScheduleChange={setSchedule}
      onSaveSchedule={saveSchedule}
      onEditSchedule={editSchedule}
      onDeleteSchedule={deleteSchedule}
      onRunSchedule={runSchedule}
      onToggleSchedule={toggleSchedule}
      onCancelEdit={() => {
        setEditing(null);
        setSchedule({ frequency: 'Weekly', execution_time: '09:00', recipients: '', format: 'CSV', is_active: true });
      }}
    />
  );

  const downloadHistoryReport = async (item: History) => {
    const reportType = item.report_type ?? item.reportType ?? 'sales';
    const reportFormat = item.format ?? 'csv';

    try {
      const response = await axiosPrivate.get('/reports/export', {
        params: {
          report_type: reportType,
          report_format: reportFormat,
          ...item.filters,
        },
        responseType: 'blob',
      });

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_report.${String(reportFormat).toLowerCase()}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to download this report.');
    }
  };

  const renderHistoryTab = () => <ReportHistoryTab history={history} onDownload={downloadHistoryReport} />;

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Reports
          </Typography>
          <Typography color="text.secondary">
            Generate, export, and schedule operational reports from your business data.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {scheduleSuccess && (
        <Alert severity="success" onClose={() => setScheduleSuccess('')} sx={{ mb: 2 }}>
          {scheduleSuccess}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label="Generate Report" />
        <Tab label="Scheduled Reports" />
        <Tab label="Report History" />
      </Tabs>

      {tab === 0 && renderReportTab()}
      {tab === 1 && renderScheduleTab()}
      {tab === 2 && renderHistoryTab()}
    </Box>
  );
}
