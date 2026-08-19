import { Grid, Paper, Box, Typography, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { DataTable, money } from './SalesShared';

interface SalesDataTablesProps {
  products: any[];
  productSort: string;
  setProductSort: (v: any) => void;
  loading: boolean;
  data: any;
}

const SalesDataTables: React.FC<SalesDataTablesProps> = ({ products, productSort, setProductSort, loading, data }) => {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Top Performing Products</Typography>
            <ToggleButtonGroup size="small" exclusive value={productSort} onChange={(_, v) => v && setProductSort(v)}>
              <ToggleButton value="revenue">Revenue</ToggleButton>
              <ToggleButton value="units_sold">Quantity</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <DataTable 
            headers={['Product', 'Units Sold', 'Revenue']} 
            rows={products.map((p: any) => [p.name, p.units_sold.toLocaleString(), money(p.revenue)])} 
            loading={loading} 
          />
        </Paper>
      </Grid>
      
      <Grid size={{ xs: 12, lg: 4 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6">Customer Revenue Analysis</Typography>
          <DataTable 
            headers={['Customer', 'Orders', 'Total Spend', 'Avg. Order Value']} 
            rows={(data?.top_customers ?? []).map((c: any) => [c.name, c.orders.toLocaleString(), money(c.total_spend), money(c.average_order_value)])} 
            loading={loading} 
          />
        </Paper>
      </Grid>
      
      <Grid size={{ xs: 12, lg: 4 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6">Recent Sales</Typography>
          <DataTable 
            headers={['Order ID', 'Customer', 'Amount']} 
            rows={(data?.recent_sales ?? []).map((s: any) => [s.invoice, s.customer, money(s.amount)])} 
            loading={loading} 
          />
        </Paper>
      </Grid>
    </Grid>
  );
};

export default SalesDataTables;
