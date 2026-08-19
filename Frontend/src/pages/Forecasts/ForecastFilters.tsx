import { Card, CardContent, Typography, Stack, TextField, MenuItem } from '@mui/material';

interface ForecastFiltersProps {
  filters: any;
  productId: string;
  setProductId: (val: string) => void;
  categoryId: string;
  setCategoryId: (val: string) => void;
  brand: string;
  setBrand: (val: string) => void;
  period: string;
  setPeriod: (val: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  periodLabels: Record<string, string>;
  sortOptions: { value: string; label: string }[];
}

const ForecastFilters: React.FC<ForecastFiltersProps> = ({
  filters, productId, setProductId, categoryId, setCategoryId, brand, setBrand, period, setPeriod, sortBy, setSortBy, periodLabels, sortOptions
}) => {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography sx={{ mb: 1.5, fontWeight: 800 }}>Search & filtering</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <TextField select size="small" label="Product" value={productId} onChange={e => setProductId(e.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="">All products</MenuItem>
            {filters.products.map((product: any) => <MenuItem key={product.id} value={String(product.id)}>{product.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Category" value={categoryId} onChange={e => setCategoryId(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">All categories</MenuItem>
            {filters.categories.map((category: any) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Brand" value={brand} onChange={e => setBrand(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All brands</MenuItem>
            {filters.brands.map((item: string) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Forecast Period" value={period} onChange={e => setPeriod(e.target.value)} sx={{ minWidth: 170 }}>
            {Object.entries(periodLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Sort by" value={sortBy} onChange={e => setSortBy(e.target.value)} sx={{ minWidth: 220 }}>
            {sortOptions.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ForecastFilters;
