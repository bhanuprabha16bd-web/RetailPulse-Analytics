import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { AutoGraph, Download } from '@mui/icons-material';
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { axiosPrivate } from '../api/axios';

const periodLabels: Record<string, string> = { '7d': 'Next 7 Days', '30d': 'Next 30 Days', '90d': 'Next 90 Days' };
const sortOptions = [
  { value: 'predicted', label: 'Highest Predicted Demand' },
  { value: 'stock', label: 'Lowest Stock' },
  { value: 'growth', label: 'Highest Growth' },
  { value: 'accuracy', label: 'Forecast Accuracy' },
];

const Forecasts = () => {
  const [period, setPeriod] = useState('30d');
  const [productId, setProductId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [sortBy, setSortBy] = useState('predicted');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const params = {
    period,
    ...(productId && { product_id: Number(productId) }),
    ...(categoryId && { category_id: Number(categoryId) }),
    ...(brand && { brand }),
    sort_by: sortBy,
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await axiosPrivate.get('/forecasts/dashboard', { params });
      setData(res.data);
      setError('');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Unable to load forecasts. Generate a forecast from historical sales first.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period, productId, categoryId, brand, sortBy]);

  const generate = async () => {
    try {
      await axiosPrivate.post('/forecasts/generate', null, { params: { period, refresh: Boolean(data) } });
      await load();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Unable to generate forecast.');
    }
  };

  const exportReport = async (path: string, filename: string) => {
    const res = await axiosPrivate.get(path, { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const kpi = (title: string, value: string | number, color: string) => (
    <Card sx={{ borderTop: `4px solid ${color}` }}><CardContent><Typography variant="caption" color="text.secondary" fontWeight={700}>{title}</Typography><Typography variant="h4" fontWeight={800}>{value}</Typography></CardContent></Card>
  );

  if (loading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  const filters = data?.filters ?? { products: [], categories: [], brands: [] };
  return <Box>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
      <Box><Typography variant="h4" fontWeight={800}>Demand Forecasting &amp; Predictive Analytics</Typography><Typography color="text.secondary">Predict demand and optimize inventory planning.</Typography></Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap><Button variant="contained" startIcon={<AutoGraph />} onClick={generate}>Generate Forecast</Button><Button variant="outlined" startIcon={<Download />} onClick={() => exportReport('/forecasts/export/demand.csv', 'demand_forecast_report.csv')}>Demand CSV</Button><Button variant="outlined" startIcon={<Download />} onClick={() => exportReport('/forecasts/export/product.pdf', 'product_forecast_report.pdf')}>Product PDF</Button><Button variant="outlined" startIcon={<Download />} onClick={() => exportReport('/forecasts/export/category.csv', 'category_forecast_report.csv')}>Category CSV</Button></Stack>
    </Stack>
    <Card sx={{ mb: 2 }}><CardContent>
      <Typography fontWeight={800} sx={{ mb: 1.5 }}>Search &amp; filtering</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
        <TextField select size="small" label="Product" value={productId} onChange={e => setProductId(e.target.value)} sx={{ minWidth: 190 }}><MenuItem value="">All products</MenuItem>{filters.products.map((product: any) => <MenuItem key={product.id} value={String(product.id)}>{product.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Category" value={categoryId} onChange={e => setCategoryId(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All categories</MenuItem>{filters.categories.map((category: any) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}</TextField>
        <TextField select size="small" label="Brand" value={brand} onChange={e => setBrand(e.target.value)} sx={{ minWidth: 160 }}><MenuItem value="">All brands</MenuItem>{filters.brands.map((item: string) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>
        <TextField select size="small" label="Forecast Period" value={period} onChange={e => setPeriod(e.target.value)} sx={{ minWidth: 170 }}>{Object.entries(periodLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
        <TextField select size="small" label="Sort by" value={sortBy} onChange={e => setSortBy(e.target.value)} sx={{ minWidth: 220 }}>{sortOptions.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</TextField>
      </Stack>
    </CardContent></Card>
    {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
    {data && <>
      <Grid container spacing={2} sx={{ mb: 2 }}><Grid item xs={12} sm={6} md>{kpi('Total Predicted Demand', data.kpis.totalPredictedDemand, '#2477e8')}</Grid><Grid item xs={12} sm={6} md>{kpi('Products Expected to Run Out', data.kpis.runOut, '#f58a1f')}</Grid><Grid item xs={12} sm={6} md>{kpi('High Growth Products', data.kpis.highGrowth, '#21ae68')}</Grid><Grid item xs={12} sm={6} md>{kpi('Slow Moving Products', data.kpis.slowMoving, '#944bc9')}</Grid><Grid item xs={12} sm={6} md>{kpi('Forecast Accuracy', `${data.kpis.accuracy}%`, '#0ba5a5')}</Grid></Grid>
      <Grid container spacing={2} sx={{ mb: 2 }}><Grid item xs={12} md={6}><Card><CardContent><Typography fontWeight={800}>Historical Sales vs Forecast</Typography><Box height={260}><ResponsiveContainer><BarChart data={data.products}><XAxis dataKey="productName" hide /><YAxis /><Tooltip /><Legend /><Bar dataKey="historicalSales" fill="#9bbff7" name="Historical Sales" /><Bar dataKey="predictedDemand" fill="#2477e8" name="Predicted Demand" /></BarChart></ResponsiveContainer></Box></CardContent></Card></Grid><Grid item xs={12} md={6}><Card><CardContent><Typography fontWeight={800}>Category Demand Trend</Typography><Box height={260}><ResponsiveContainer><LineChart data={data.categories}><XAxis dataKey="category" /><YAxis /><Tooltip /><Legend /><Line dataKey="historicalSales" stroke="#9bbff7" name="Historical" /><Line dataKey="predictedDemand" stroke="#21ae68" name="Forecast" /></LineChart></ResponsiveContainer></Box></CardContent></Card></Grid></Grid>
      <Grid container spacing={2}><Grid item xs={12} lg={8}><Card><CardContent><Typography fontWeight={800} sx={{ mb: 1 }}>Product Level Forecast — {periodLabels[period]}</Typography><Table size="small"><TableHead><TableRow><TableCell>Product</TableCell><TableCell>Category</TableCell><TableCell>Brand</TableCell><TableCell align="right">Stock</TableCell><TableCell align="right">Historical</TableCell><TableCell align="right">Predicted</TableCell><TableCell align="right">Growth</TableCell><TableCell>Accuracy</TableCell><TableCell>Recommendation</TableCell></TableRow></TableHead><TableBody>{data.products.map((product: any) => <TableRow key={product.id}><TableCell>{product.productName}</TableCell><TableCell>{product.category}</TableCell><TableCell>{product.brand}</TableCell><TableCell align="right">{product.currentStock}</TableCell><TableCell align="right">{product.historicalSales}</TableCell><TableCell align="right">{product.predictedDemand}</TableCell><TableCell align="right">{product.growth}%</TableCell><TableCell>{product.accuracy}%</TableCell><TableCell><Chip size="small" label={product.recommendation} color={product.recommendation.includes('Healthy') ? 'success' : product.recommendation.includes('Overstock') ? 'warning' : 'error'} /></TableCell></TableRow>)}{!data.products.length && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}>No forecasts match the selected filters.</TableCell></TableRow>}</TableBody></Table></CardContent></Card></Grid><Grid item xs={12} lg={4}><Card><CardContent><Typography fontWeight={800}>Category Level Forecast</Typography>{data.categories.map((category: any) => <Box key={category.category} sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}><Typography fontWeight={700}>{category.category}</Typography><Typography variant="body2" color="text.secondary">Historical: {category.historicalSales} · Forecast: {category.predictedDemand}</Typography><Typography variant="body2" color={category.growth >= 0 ? 'success.main' : 'error.main'}>{category.growth}% expected growth</Typography></Box>)}{!data.categories.length && <Typography color="text.secondary" sx={{ py: 2 }}>No category forecasts to show.</Typography>}</CardContent></Card></Grid></Grid>
    </>}
  </Box>;
};

export default Forecasts;
