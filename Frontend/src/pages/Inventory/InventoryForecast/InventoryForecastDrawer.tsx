import { Box, Drawer, IconButton, Stack, Typography, Alert, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Recommendation } from './InventoryForecastShared';

interface InventoryForecastDrawerProps {
  drawerOpen: boolean;
  setDrawerOpen: (val: boolean) => void;
  selectedProduct: Recommendation | null;
}

export default function InventoryForecastDrawer({ drawerOpen, setDrawerOpen, selectedProduct }: InventoryForecastDrawerProps) {
  return (
    <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <Box sx={{ width: 450, p: 3 }}>
        <Stack direction="row" sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Recommendation Details</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
        </Stack>

        {selectedProduct && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>{selectedProduct.productName}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>SKU: {selectedProduct.sku} | Category: {selectedProduct.categoryName}</Typography>
            
            {selectedProduct.recommendationAction === 'Reorder Required' && (
              <Alert severity="error" sx={{ mb: 3 }}>
                Current stock is below the recommended reorder point. Replenishment is required immediately.
              </Alert>
            )}
            {selectedProduct.stockRisk === 'Overstock' && (
              <Alert severity="info" sx={{ mb: 3 }}>
                Overstock detected. Consider promotions to reduce excess inventory.
              </Alert>
            )}

            <Typography sx={{ mb: 1, fontWeight: 700 }}>Inventory Comparison</Typography>
            <Table size="small" sx={{ mb: 3, border: '1px solid #eee' }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Current</TableCell>
                  <TableCell align="right">Recommended</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Stock Level</TableCell>
                  <TableCell align="right" sx={{ color: selectedProduct.currentStock < selectedProduct.reorderPoint ? 'error.main' : 'inherit', fontWeight: 600 }}>{selectedProduct.currentStock}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{selectedProduct.currentStock + selectedProduct.recommendedQuantity}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Daily Demand</TableCell>
                  <TableCell align="right">{selectedProduct.averageDailySales}</TableCell>
                  <TableCell align="right">{selectedProduct.averageDailySales}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Reorder Point</TableCell>
                  <TableCell align="right">{selectedProduct.reorderPoint}</TableCell>
                  <TableCell align="right">{selectedProduct.reorderPoint}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Safety Stock</TableCell>
                  <TableCell align="right">{selectedProduct.safetyStock}</TableCell>
                  <TableCell align="right">{selectedProduct.safetyStock}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <Typography sx={{ mb: 1, fontWeight: 700 }}>Stock Projection</Typography>
            <Box sx={{ height: 250, bgcolor: '#f9f9f9', borderRadius: 1, p: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Current', stock: selectedProduct.currentStock, fill: '#8884d8' },
                  { name: 'Recommended', stock: selectedProduct.currentStock + selectedProduct.recommendedQuantity, fill: '#82ca9d' }
                ]}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={selectedProduct.reorderPoint} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Reorder Pt', fill: 'red', fontSize: 12 }} />
                  <Bar dataKey="stock" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
