import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Grid, Card, CardContent, CircularProgress, Alert, Paper, TextField, MenuItem, Button, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Chip } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Download, Print, Refresh } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { axiosPrivate } from '../api/axios';

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
  const [products, setProducts] = useState<Product[]>([]);
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
      setProducts(prodRes.data);
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
    <Box p={3} className="analytics-container">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .analytics-container { margin: 0; padding: 0; width: 100%; }
          body { -webkit-print-color-adjust: exact; background-color: white; }
          .MuiDrawer-root, header { display: none !important; }
          main { margin-left: 0 !important; width: 100% !important; padding: 0 !important; }
        }
      `}</style>
      
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Retail Analytics Dashboard</Typography>
          <Typography color="text.secondary">Comprehensive business insights, trends, and drill-downs.</Typography>
        </Box>
        <Box className="no-print" display="flex" gap={1}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => loadData()}>Refresh</Button>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExportCSV}>CSV</Button>
          <Button variant="contained" startIcon={<Print />} onClick={handleExportPDF}>PDF</Button>
        </Box>
      </Box>

      {/* Global Filters */}
      <Paper className="no-print" sx={{ p: 2, mb: 4 }} variant="outlined">
        <Typography variant="subtitle2" mb={2} color="text.secondary">Global Filters</Typography>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          <TextField sx={{ minWidth: 180, flexGrow: 1 }} type={filters.start_date ? 'date' : 'text'} onFocus={(e) => e.target.type = 'date'} onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} size="small" label="Start Date" value={filters.start_date} onChange={e => handleFilterChange('start_date', e.target.value)} />
          <TextField sx={{ minWidth: 180, flexGrow: 1 }} type={filters.end_date ? 'date' : 'text'} onFocus={(e) => e.target.type = 'date'} onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }} size="small" label="End Date" value={filters.end_date} onChange={e => handleFilterChange('end_date', e.target.value)} />
          <TextField sx={{ minWidth: 140, flexGrow: 1 }} select size="small" label="Category" value={filters.category_id} onChange={e => handleFilterChange('category_id', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField sx={{ minWidth: 140, flexGrow: 1 }} select size="small" label="Brand" value={filters.brand} onChange={e => handleFilterChange('brand', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {brands.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
          </TextField>
          <TextField sx={{ minWidth: 140, flexGrow: 1 }} select size="small" label="Channel" value={filters.sales_channel} onChange={e => handleFilterChange('sales_channel', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Retail Store">Retail Store</MenuItem>
            <MenuItem value="Online">Online</MenuItem>
            <MenuItem value="Wholesale">Wholesale</MenuItem>
          </TextField>
          <TextField sx={{ minWidth: 140, flexGrow: 1 }} select size="small" label="Payment" value={filters.payment_method} onChange={e => handleFilterChange('payment_method', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Credit Card">Credit Card</MenuItem>
            <MenuItem value="Mobile Payment">Mobile</MenuItem>
          </TextField>
          <Button sx={{ minWidth: 140, height: 40 }} variant="contained" onClick={handleApplyFilters} disabled={loading}>Apply Filters</Button>
        </Box>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', cursor: 'pointer', '&:hover': { opacity: 0.9 } }} onClick={() => navigateWithFilter('/sales')}>
            <CardContent>
              <Typography variant="subtitle2" opacity={0.8}>Total Revenue</Typography>
              <Typography variant="h4">${kpis.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText', cursor: 'pointer', '&:hover': { opacity: 0.9 } }} onClick={() => navigateWithFilter('/sales')}>
            <CardContent>
              <Typography variant="subtitle2" opacity={0.8}>Total Orders</Typography>
              <Typography variant="h4">{kpis.total_orders.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText', cursor: 'pointer', '&:hover': { opacity: 0.9 } }} onClick={() => navigateWithFilter('/sales')}>
            <CardContent>
              <Typography variant="subtitle2" opacity={0.8}>Avg Order Value</Typography>
              <Typography variant="h4">${kpis.average_order_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', cursor: 'pointer', '&:hover': { opacity: 0.9 } }} onClick={() => navigateWithFilter('/products')}>
            <CardContent>
              <Typography variant="subtitle2" opacity={0.8}>Total Products Sold</Typography>
              <Typography variant="h4">{kpis.total_products_sold.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }} onClick={() => navigateWithFilter('/inventory')}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Inventory Value</Typography>
              <Typography variant="h4" color="primary.main">${kpis.total_inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'warning.main' } }} onClick={() => navigateWithFilter('/inventory')}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Low Stock Products</Typography>
              <Typography variant="h4" color="warning.main">{kpis.low_stock_products}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'error.main' } }} onClick={() => navigateWithFilter('/inventory')}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Out of Stock</Typography>
              <Typography variant="h4" color="error.main">{kpis.out_of_stock_products}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ cursor: 'pointer', '&:hover': { borderColor: 'info.main' } }} onClick={() => navigateWithFilter('/categories')}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Categories</Typography>
              <Typography variant="h4">{kpis.total_categories}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" mb={2}>Revenue Trend</Typography>
            {kpis.revenue_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={kpis.revenue_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#1976d2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No trend data available.</Typography></Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" mb={2}>Top Selling Products</Typography>
            {kpis.top_products.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={kpis.top_products} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <RechartsTooltip />
                  <Bar dataKey="quantity_sold" fill="#2e7d32" name="Qty Sold" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No product data available.</Typography></Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" mb={2} align="center">Sales by Payment Method</Typography>
            {kpis.sales_by_payment.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={kpis.sales_by_payment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {kpis.sales_by_payment.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                  <Legend iconType="square" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No payment data.</Typography></Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" mb={2} align="center">Sales by Channel</Typography>
            {kpis.sales_by_channel.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={kpis.sales_by_channel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {kpis.sales_by_channel.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[(i+2) % COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip formatter={(val: number) => `$${val.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No channel data.</Typography></Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" mb={2} align="center">Inventory by Category</Typography>
            {kpis.inventory_by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={kpis.inventory_by_category}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="quantity" fill="#9c27b0" name="Quantity" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box height="90%" display="flex" alignItems="center" justifyContent="center"><Typography color="text.secondary">No inventory data.</Typography></Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Top Low Stock Table */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Critical Low Stock Products</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell align="right">Available Stock</TableCell>
                <TableCell align="right">Reorder Level</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kpis.top_low_stock.map((p, i) => (
                <TableRow key={i} hover>
                  <TableCell>{p.name}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{p.available}</TableCell>
                  <TableCell align="right">{p.reorder_level}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={p.available <= 0 ? 'Out of Stock' : 'Low Stock'} color={p.available <= 0 ? 'error' : 'warning'} />
                  </TableCell>
                </TableRow>
              ))}
              {kpis.top_low_stock.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>All products are sufficiently stocked.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Analytics;
