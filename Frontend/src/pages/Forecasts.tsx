import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { AutoGraph, Download } from '@mui/icons-material';
import ForecastFilters from './Forecasts/ForecastFilters';
import ForecastKPIs from './Forecasts/ForecastKPIs';
import ForecastCharts from './Forecasts/ForecastCharts';
import ForecastTables from './Forecasts/ForecastTables';
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

  if (loading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  const filters = data?.filters ?? { products: [], categories: [], brands: [] };
  return <Box>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, justifyContent: 'space-between' }}>
      <Box><Typography variant="h4" sx={{ fontWeight: 800 }}>Demand Forecasting &amp; Predictive Analytics</Typography><Typography color="text.secondary">Predict demand and optimize inventory planning.</Typography></Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}><Button variant="contained" startIcon={<AutoGraph />} onClick={generate}>Generate Forecast</Button><Button variant="outlined" startIcon={<Download />} onClick={() => exportReport('/forecasts/export/demand.csv', 'demand_forecast_report.csv')}>Demand CSV</Button><Button variant="outlined" startIcon={<Download />} onClick={() => exportReport('/forecasts/export/product.pdf', 'product_forecast_report.pdf')}>Product PDF</Button><Button variant="outlined" startIcon={<Download />} onClick={() => exportReport('/forecasts/export/category.csv', 'category_forecast_report.csv')}>Category CSV</Button></Stack>
    </Stack>
    <ForecastFilters 
      filters={filters}
      productId={productId}
      setProductId={setProductId}
      categoryId={categoryId}
      setCategoryId={setCategoryId}
      brand={brand}
      setBrand={setBrand}
      period={period}
      setPeriod={setPeriod}
      sortBy={sortBy}
      setSortBy={setSortBy}
      periodLabels={periodLabels}
      sortOptions={sortOptions}
    />
    
    {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
    
    {data && (
      <>
        <ForecastKPIs data={data} />
        <ForecastCharts data={data} />
        <ForecastTables data={data} period={period} periodLabels={periodLabels} />
      </>
    )}
  </Box>;
};

export default Forecasts;
