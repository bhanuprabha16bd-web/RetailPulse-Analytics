import { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Stack, Button, Alert } from '@mui/material';
import { Refresh, Download } from '@mui/icons-material';
import { axiosPrivate } from '../../api/axios';
import { ForecastData, Recommendation } from './InventoryForecast/InventoryForecastShared';
import InventoryForecastKPIs from './InventoryForecast/InventoryForecastKPIs';
import InventoryForecastFilters from './InventoryForecast/InventoryForecastFilters';
import InventoryForecastTable from './InventoryForecast/InventoryForecastTable';
import InventoryForecastDrawer from './InventoryForecast/InventoryForecastDrawer';

const InventoryForecast = () => {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterOptions, setFilterOptions] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [reorderFilter, setReorderFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const [selectedProduct, setSelectedProduct] = useState<Recommendation | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState('stock_risk');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await axiosPrivate.get('/inventory/recommendations', {
        params: {
          category_id: categoryFilter || undefined,
          brand: supplierFilter || undefined,
          product_id: productFilter || undefined,
          stock_risk: riskFilter || undefined,
          reorder_required: reorderFilter ? reorderFilter === 'true' : undefined,
        },
      });
      setData(res.data);
      setFilterOptions(previous => previous.length ? previous : res.data.recommendations);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, supplierFilter, productFilter, riskFilter, reorderFilter]);

  const sortedRecommendations = useMemo(() => {
    if (!data?.recommendations) return [];
    const list = [...data.recommendations];
    
    // Sort logic
    list.sort((a, b) => {
      if (sortBy === 'current_stock') return a.currentStock - b.currentStock;
      if (sortBy === 'forecasted_demand') return b.forecastedDemand - a.forecastedDemand;
      if (sortBy === 'days_remaining') {
        const valA = a.daysRemaining ?? 999;
        const valB = b.daysRemaining ?? 999;
        return valA - valB;
      }
      if (sortBy === 'recommended_quantity') return b.recommendedQuantity - a.recommendedQuantity;
      if (sortBy === 'stock_risk') {
        const riskScore: any = { 'Out of Stock': 0, 'Stockout Risk': 1, 'Low Stock': 2, 'Overstock': 3, 'Healthy': 4 };
        return riskScore[a.stockRisk] - riskScore[b.stockRisk];
      }
      return 0;
    });

    return list.filter(row => !search || `${row.productName} ${row.sku}`.toLowerCase().includes(search.toLowerCase()));
  }, [data, sortBy, search]);

  const openDrawer = (product: Recommendation) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const hasNoSalesHistory = sortedRecommendations.length > 0 && sortedRecommendations.every((row: Recommendation) => row.averageDailySales === 0);
  const categories = Array.from(new Map(filterOptions.map(row => [row.categoryName, row])).values());
  const suppliers = Array.from(new Set(filterOptions.map(row => row.supplier).filter(Boolean))).sort();
  const emptyMessage = reorderFilter === 'true'
    ? 'No products currently require replenishment.'
    : (categoryFilter || supplierFilter || productFilter || riskFilter || reorderFilter
      ? 'No recommendations match the selected filters.'
      : 'No inventory is available for replenishment analysis.');
  const visibleRows = sortedRecommendations.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const pageCount = Math.max(1, Math.ceil(sortedRecommendations.length / rowsPerPage));
  
  const exportCsv = () => {
    const fields = ['productName', 'sku', 'currentStock', 'averageDailySales', 'forecastedDemand', 'daysRemaining', 'reorderPoint', 'recommendedQuantity', 'stockRisk', 'recommendationAction'];
    const csv = [fields.join(','), ...sortedRecommendations.map(row => fields.map(field => `"${String((row as any)[field] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = 'inventory-recommendations.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" sx={{ mb: .5, fontWeight: 800 }}>Inventory Forecast &amp; Smart Replenishment</Typography>
          <Typography color="text.secondary">AI-powered demand forecasting and inventory recommendations</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadData} disabled={loading}>Refresh Data</Button>
          <Button variant="outlined" size="small" color="success" startIcon={<Download />} onClick={exportCsv} disabled={!data}>Export CSV</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!loading && hasNoSalesHistory && <Alert severity="info" sx={{ mb: 2 }}>No sales history was found. Demand remains zero until sales are recorded.</Alert>}

      {data?.summary && <InventoryForecastKPIs summary={data.summary} />}

      <InventoryForecastFilters 
        categories={categories} suppliers={suppliers} filterOptions={filterOptions} 
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} 
        supplierFilter={supplierFilter} setSupplierFilter={setSupplierFilter} 
        productFilter={productFilter} setProductFilter={setProductFilter} 
        riskFilter={riskFilter} setRiskFilter={setRiskFilter} 
        reorderFilter={reorderFilter} setReorderFilter={setReorderFilter} 
        sortBy={sortBy} setSortBy={setSortBy} 
        search={search} setSearch={setSearch} setPage={setPage} 
      />

      <InventoryForecastTable 
        loading={loading} visibleRows={visibleRows} sortedRecommendations={sortedRecommendations} 
        emptyMessage={emptyMessage} page={page} rowsPerPage={rowsPerPage} pageCount={pageCount} 
        setPage={setPage} openDrawer={openDrawer} 
      />

      <InventoryForecastDrawer 
        drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} selectedProduct={selectedProduct} 
      />
    </Box>
  );
};

export default InventoryForecast;
