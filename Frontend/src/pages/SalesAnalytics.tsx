import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, Typography,
} from '@mui/material';
import { Download, Refresh, Print, AccountBalanceWallet, CalendarMonth, LocalOffer, ReceiptLong, ShoppingCart, Paid } from '@mui/icons-material';
import { axiosPrivate } from '../api/axios';
import { useQuery } from '@tanstack/react-query';
import SalesFilters from './SalesAnalytics/SalesFilters';
import SalesKPIs from './SalesAnalytics/SalesKPIs';
import SalesCharts from './SalesAnalytics/SalesCharts';
import SalesDataTables from './SalesAnalytics/SalesDataTables';
import { emptyData } from './SalesAnalytics/SalesShared';

type Interval = 'daily' | 'weekly' | 'monthly';
type ProductSort = 'revenue' | 'units_sold';

interface AnalyticsData {
  kpis: { total_revenue: number; total_orders: number; average_order_value: number; total_items_sold: number; total_discount: number; total_tax: number };
  sales_overview: { period: string; revenue: number }[];
  sales_vs_orders: { period: string; revenue: number; orders: number }[];
  top_products: { name: string; units_sold: number; revenue: number }[];
  top_customers: { name: string; orders: number; total_spend: number; average_order_value: number }[];
  payment_analysis: { method: string; revenue: number; orders: number }[];
  recent_sales: { invoice: string; date: string; customer: string; amount: number; payment_method: string; status: string }[];
}

export default function SalesAnalytics() {
  const [interval, setInterval] = useState<Interval>('daily');
  const [productSort, setProductSort] = useState<ProductSort>('revenue');
  const [filters, setFilters] = useState({ start_date: '', end_date: '', product_id: '', category_id: '', customer_id: '', sales_channel: '', payment_method: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const buildParams = () => {
      const params = new URLSearchParams({ interval, product_sort: productSort });
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) params.set(key, key === 'start_date' ? `${value}T00:00:00` : key === 'end_date' ? `${value}T23:59:59` : value);
      });
      return params;
  };
  const analyticsQuery = useQuery({ queryKey: ['sales-analytics', interval, productSort, appliedFilters], queryFn: async () => (await axiosPrivate.get<AnalyticsData>(`/analytics/sales?${buildParams()}`)).data, staleTime: 30_000 });
  const optionsQuery = useQuery({ queryKey: ['sales-analytics-filters'], queryFn: async () => { const [products, categories, customers] = await Promise.all([axiosPrivate.get('/products/'), axiosPrivate.get('/categories/'), axiosPrivate.get('/customers/')]); return { products: products.data, categories: categories.data, customers: customers.data }; }, staleTime: 5 * 60_000 });
  const data = analyticsQuery.data ?? null;
  const loading = analyticsQuery.isLoading || analyticsQuery.isFetching;
  const error = analyticsQuery.error instanceof Error ? analyticsQuery.error.message : '';
  const filterOptions = optionsQuery.data ?? { products: [], categories: [], customers: [] };
  const applyFilters = () => {
    if (filters.start_date && filters.end_date && filters.start_date > filters.end_date) return;
    setAppliedFilters(filters);
  };
  const selectPeriod = (period: string) => {
    const end = new Date(); const start = new Date();
    if (period === 'today') start.setHours(0, 0, 0, 0);
    if (period === '7') start.setDate(end.getDate() - 6);
    if (period === '30') start.setDate(end.getDate() - 29);
    if (period === 'month') start.setDate(1);
    if (period === 'last-month') { start.setMonth(end.getMonth() - 1, 1); end.setDate(0); }
    const toInput = (date: Date) => date.toISOString().slice(0, 10);
    const next = period === 'custom' ? { ...filters, start_date: '', end_date: '' } : { ...filters, start_date: toInput(start), end_date: toInput(end) };
    setFilters(next); setAppliedFilters(next);
  };

  const products = useMemo(() => [...(data?.top_products ?? [])].sort((a, b) => b[productSort] - a[productSort]), [data, productSort]);
  const metrics: [string, number, boolean, ReactNode, string][] = [
    ['Total Revenue', data?.kpis.total_revenue ?? 0, true, <AccountBalanceWallet />, '#8b5cf6'], ['Total Orders', data?.kpis.total_orders ?? 0, false, <CalendarMonth />, '#3b82f6'],
    ['Average Order Value', data?.kpis.average_order_value ?? 0, true, <ShoppingCart />, '#f97316'], ['Total Items Sold', data?.kpis.total_items_sold ?? 0, false, <ReceiptLong />, '#22c55e'],
    ['Total Discount', data?.kpis.total_discount ?? 0, true, <LocalOffer />, '#ec4899'], ['Total Tax', data?.kpis.total_tax ?? 0, true, <Paid />, '#6366f1'],
  ];
  const exportCsv = () => {
    const report = data ?? emptyData;
    const rows: string[][] = [
      ['Metric', 'Value'], ...metrics.map(([label, value]) => [label, String(value)]), [],
      ['Top Products'], ['Product', 'Units Sold', 'Revenue'], ...products.map(p => [p.name, String(p.units_sold), String(p.revenue)]), [],
      ['Top Customers'], ['Customer', 'Orders', 'Total Spend', 'Average Order Value'], ...report.top_customers.map((c: AnalyticsData['top_customers'][number]) => [c.name, String(c.orders), String(c.total_spend), String(c.average_order_value)]),
    ];
    const content = rows.map(row => row.map((value: string) => `"${value.replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    link.download = 'sales-analytics.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', mb: 3, flexWrap: 'wrap' }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 700 }}>Sales Analytics</Typography><Typography color="text.secondary">Revenue, order, product and customer performance at a glance.</Typography></Box>
      <Box sx={{ display: 'flex', gap: 1 }}><Button variant="outlined" startIcon={<Refresh />} onClick={() => analyticsQuery.refetch()} disabled={loading}>Refresh</Button><Button variant="outlined" startIcon={<Download />} onClick={exportCsv} disabled={!data}>Export CSV</Button><Button variant="contained" startIcon={<Print />} onClick={() => window.print()} disabled={!data}>Export PDF</Button></Box>
    </Box>

    <SalesFilters 
      filters={filters}
      setFilters={setFilters}
      appliedFilters={appliedFilters}
      filterOptions={filterOptions}
      loading={loading}
      applyFilters={applyFilters}
      selectPeriod={selectPeriod}
    />
    
    {!!filters.start_date && !!filters.end_date && filters.start_date > filters.end_date && <Alert severity="warning" sx={{ mb: 2 }}>Start date must be before or equal to end date.</Alert>}
    {error && <Alert severity="error" sx={{ mb: 3 }}>Unable to load sales analytics. Please refresh or adjust your filters.</Alert>}

    <SalesKPIs metrics={metrics} loading={loading} data={data} />

    <SalesCharts data={data} loading={loading} interval={interval} setInterval={setInterval} />

    <SalesDataTables products={products} productSort={productSort} setProductSort={setProductSort} loading={loading} data={data} />
  </Box>;
}
