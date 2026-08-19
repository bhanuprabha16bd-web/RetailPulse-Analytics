import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { Download, Print, Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { axiosPrivate } from '../api/axios';
import AnalyticsFilters from './Analytics/AnalyticsFilters';
import AnalyticsKPIs from './Analytics/AnalyticsKPIs';
import AnalyticsCharts from './Analytics/AnalyticsCharts';
import AnalyticsLowStockTable from './Analytics/AnalyticsLowStockTable';

interface KPIs {
  total_revenue: number;
  total_orders: number;
  total_products_sold: number;
  average_order_value: number;
  total_inventory_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_categories: number;
  revenue_trend: { date: string; revenue: number }[];
  top_products: { name: string; quantity_sold: number; revenue: number }[];
  sales_by_payment: { name: string; value: number }[];
  sales_by_channel: { name: string; value: number }[];
  inventory_by_category: { name: string; quantity: number }[];
  top_low_stock: { name: string; available: number; reorder_level: number }[];
}

interface Category { id: number; name: string; }
interface Product { id: number; name: string; brand: string; }

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0', '#0288d1'];

const Analytics = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Filter State
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    product_id: '',
    category_id: '',
    brand: '',
    sales_channel: '',
    payment_method: ''
  });

  const recordAudit = async (action: string, exportType?: string) => {
    try {
      await axiosPrivate.post('/analytics/audit', { action, export_type: exportType });
    } catch (e) {
      console.error("Failed to record audit", e);
    }
  };

  const loadFiltersData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        axiosPrivate.get<Category[]>('/categories/'),
        axiosPrivate.get<Product[]>('/products/')
      ]);
      setCategories(catRes.data);
      const uniqueBrands = Array.from(new Set(prodRes.data.map(p => p.brand || 'Unbranded')));
      setBrands(uniqueBrands);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = useCallback(async (recordView = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (val) {
          if (key === 'start_date') params.append(key, `${val}T00:00:00Z`);
          else if (key === 'end_date') params.append(key, `${val}T23:59:59Z`);
          else params.append(key, val);
        }
      });
      const response = await axiosPrivate.get<KPIs>(`/analytics/kpis?${params.toString()}`);
      setKpis(response.data);
      setError(null);
      
      if (recordView) {
        recordAudit('Dashboard Viewed');
      } else {
        recordAudit('Dashboard Filters Applied');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadFiltersData();
    loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    loadData();
  };

  const handleExportCSV = () => {
    if (!kpis) return;
    const csvContent = `KPI,Value\nTotal Revenue,${kpis.total_revenue}\nTotal Orders,${kpis.total_orders}\nAverage Order Value,${kpis.average_order_value}\nTotal Products Sold,${kpis.total_products_sold}\nTotal Inventory Value,${kpis.total_inventory_value}\nLow Stock Products,${kpis.low_stock_products}\nOut of Stock Products,${kpis.out_of_stock_products}\nTotal Categories,${kpis.total_categories}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'analytics_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    recordAudit('Report Exported', 'CSV');
  };

  const handleExportPDF = () => {
    recordAudit('Report Exported', 'PDF');
    window.print();
  };

  const navigateWithFilter = (path: string) => {
    navigate(path);
  };

  if (loading && !kpis) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!kpis) return null;

  return (
    <Box sx={{ p: 3 }} className="analytics-container">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .analytics-container { margin: 0; padding: 0; width: 100%; }
          body { -webkit-print-color-adjust: exact; background-color: white; }
          .MuiDrawer-root, header { display: none !important; }
          main { margin-left: 0 !important; width: 100% !important; padding: 0 !important; }
        }
      `}</style>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Retail Analytics Dashboard</Typography>
          <Typography color="text.secondary">Comprehensive business insights, trends, and drill-downs.</Typography>
        </Box>
        <Box className="no-print" sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => loadData()}>Refresh</Button>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExportCSV}>CSV</Button>
          <Button variant="contained" startIcon={<Print />} onClick={handleExportPDF}>PDF</Button>
        </Box>
      </Box>

      {/* Global Filters */}
      <AnalyticsFilters 
        filters={filters}
        categories={categories}
        brands={brands}
        loading={loading}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
      />

      {/* KPI Cards */}
      <AnalyticsKPIs 
        kpis={kpis} 
        navigateWithFilter={navigateWithFilter} 
      />

      {/* Charts Row 1 & 2 */}
      <AnalyticsCharts 
        kpis={kpis} 
        COLORS={COLORS} 
      />

      {/* Top Low Stock Table */}
      <AnalyticsLowStockTable 
        kpis={kpis} 
      />
    </Box>
  );
};

export default Analytics;
