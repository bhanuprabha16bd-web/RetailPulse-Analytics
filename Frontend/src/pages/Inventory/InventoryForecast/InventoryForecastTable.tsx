import { Card, Table, TableBody, TableCell, TableHead, TableRow, Chip, CircularProgress, Typography, Stack, Button } from '@mui/material';
import { Recommendation, riskColors } from './InventoryForecastShared';

interface InventoryForecastTableProps {
  loading: boolean;
  visibleRows: Recommendation[];
  sortedRecommendations: Recommendation[];
  emptyMessage: string;
  page: number;
  rowsPerPage: number;
  pageCount: number;
  setPage: (val: number) => void;
  openDrawer: (product: Recommendation) => void;
}

export default function InventoryForecastTable({
  loading, visibleRows, sortedRecommendations, emptyMessage, page, rowsPerPage, pageCount, setPage, openDrawer
}: InventoryForecastTableProps) {
  return (
    <>
      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell align="right">Avg Daily Demand</TableCell>
              <TableCell align="right">30d Forecast</TableCell>
              <TableCell align="right">Days Remaining</TableCell>
              <TableCell align="right">Reorder Point</TableCell>
              <TableCell align="right">Rec. Qty</TableCell>
              <TableCell align="center">Risk</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={26} aria-label="Loading recommendations" /></TableCell></TableRow>}
            {!loading && visibleRows.map((row) => (
              <TableRow 
                key={row.productId} 
                hover 
                onClick={() => openDrawer(row)}
                sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.productName}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.sku}</Typography>
                </TableCell>
                <TableCell>{row.categoryName}</TableCell>
                <TableCell align="right" sx={{ color: row.currentStock <= 0 ? 'error.main' : 'inherit', fontWeight: row.currentStock <= 0 ? 700 : undefined }}>{row.currentStock <= 0 ? '0 (out of stock)' : row.currentStock}</TableCell>
                <TableCell align="right">{row.averageDailySales === 0 ? 'No demand' : row.averageDailySales}</TableCell>
                <TableCell align="right">{row.forecastedDemand === 0 ? 'No demand' : row.forecastedDemand}</TableCell>
                <TableCell align="right">{row.daysRemaining !== null ? row.daysRemaining : '∞'}</TableCell>
                <TableCell align="right">{row.reorderPoint}</TableCell>
                <TableCell align="right">
                  <Typography color={row.recommendedQuantity > 0 ? 'primary.main' : 'inherit'} sx={{ fontWeight: 700 }}>
                    {row.recommendedQuantity}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip size="small" label={row.stockRisk} color={riskColors[row.stockRisk] || 'default'} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color={row.recommendationAction === 'Reorder Required' ? 'error.main' : 'text.secondary'} sx={{ fontWeight: 600 }}>
                    {row.recommendationAction}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {!loading && sortedRecommendations.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 3 }}>{emptyMessage}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {!loading && sortedRecommendations.length > rowsPerPage && (
        <Stack direction="row" sx={{ px: 1, pt: 1, justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">Showing {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, sortedRecommendations.length)} of {sortedRecommendations.length} products</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>{page + 1} / {pageCount}</Typography>
            <Button size="small" disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Next</Button>
          </Stack>
        </Stack>
      )}
    </>
  );
}
