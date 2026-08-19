import { Box, Button, Chip, Dialog, DialogActions, DialogContent, Divider, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Sale, currency } from './SalesShared';

interface SaleDetailDialogProps {
  detail: Sale | null;
  setDetail: (val: Sale | null) => void;
}

export default function SaleDetailDialog({ detail, setDetail }: SaleDetailDialogProps) {
  return (
    <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
      <DialogContent sx={{ p: { xs: 2, md: 5 } }}>
        {detail && (
          <Stack spacing={4}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>INVOICE</Typography>
                <Typography variant="body2" color="text.secondary">#{detail.invoiceNumber}</Typography>
                <Typography variant="body2" color="text.secondary">Date: {new Date(detail.createdAt).toLocaleDateString()}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>RetailPulse</Typography>
                <Typography variant="body2" color="text.secondary">Store: {detail.store?.name || 'Unknown'}</Typography>
                <Typography variant="body2" color="text.secondary">Channel: {detail.salesChannel}</Typography>
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Bill To</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{detail.customerName || 'Walk-in Customer'}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="overline" color="text.secondary">Payment Info</Typography>
                <Typography variant="body2">Method: {detail.paymentMethod}</Typography>
                <Typography variant="body2">
                  Status: 
                  <Chip size="small" label={detail.paymentStatus} color={detail.paymentStatus === 'Paid' ? 'success' : detail.paymentStatus === 'Pending' ? 'warning' : 'error'} sx={{ ml: 1 }} />
                </Typography>
              </Box>
            </Box>

            <TableContainer component={Box} sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Discount</TableCell>
                    <TableCell align="right">Tax</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detail.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2">{item.product?.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.category?.name}</Typography>
                      </TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{currency.format(item.unitPrice)}</TableCell>
                      <TableCell align="right">{currency.format(item.discount)}</TableCell>
                      <TableCell align="right">{currency.format(item.tax)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{currency.format(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                {detail.notes && (
                  <>
                    <Typography variant="overline" color="text.secondary">Notes</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{detail.notes}</Typography>
                  </>
                )}
              </Box>
              <Box sx={{ minWidth: 250, width: { xs: '100%', sm: 'auto' } }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2">{currency.format(detail.totalAmount - detail.items.reduce((sum, item) => sum + item.tax - item.discount, 0))}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Tax</Typography>
                    <Typography variant="body2">{currency.format(detail.items.reduce((sum, item) => sum + item.tax, 0))}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Discount</Typography>
                    <Typography variant="body2" color="success.main">-{currency.format(detail.items.reduce((sum, item) => sum + item.discount, 0))}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Total</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{currency.format(detail.totalAmount)}</Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, md: 5 }, pb: { xs: 2, md: 5 } }}>
        <Button onClick={() => window.print()} variant="outlined" sx={{ mr: 'auto' }}>Print</Button>
        <Button onClick={() => setDetail(null)} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
