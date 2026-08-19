import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Add, DeleteOutlined } from '@mui/icons-material';
import { SaleForm, SaleItemForm, Store, CustomerOption, Product, Category, currency } from './SalesShared';

interface SaleCreateDialogProps {
  dialogOpen: boolean;
  saving: boolean;
  form: SaleForm;
  setForm: React.Dispatch<React.SetStateAction<SaleForm>>;
  setDialogOpen: (val: boolean) => void;
  save: () => void;
  stores: Store[];
  customers: CustomerOption[];
  products: Product[];
  categories: Category[];
  handleItemChange: (id: string, field: keyof SaleItemForm, value: string) => void;
  addItem: () => void;
  removeItem: (id: string) => void;
  billingSummary: { subtotal: number; totalDiscount: number; totalTax: number; grandTotal: number; };
}

export default function SaleCreateDialog({
  dialogOpen, saving, form, setForm, setDialogOpen, save,
  stores, customers, products, categories, handleItemChange, addItem, removeItem, billingSummary
}: SaleCreateDialogProps) {
  return (
    <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="lg" fullWidth>
      <DialogTitle>Create New Invoice</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select required fullWidth label="Store" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
                {stores.filter(s => s.isActive || String(s.id) === form.storeId).map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Customer" value={form.customerId} onChange={(e) => {
                const selectedCustomer = customers.find(customer => customer.id === Number(e.target.value));
                setForm({ ...form, customerId: e.target.value, customerName: selectedCustomer?.fullName ?? '' });
              }}>
                <MenuItem value="">Walk-in / unlinked sale</MenuItem>
                {customers.filter(customer => customer.status === 'Active').map((customer) => (
                  <MenuItem key={customer.id} value={String(customer.id)}>
                    {customer.fullName} ({customer.customerId})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {!form.customerId && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Walk-in customer name (optional)" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Sales Channel" value={form.salesChannel} onChange={(e) => setForm({ ...form, salesChannel: e.target.value })}>
                <MenuItem value="Retail Store">Retail Store</MenuItem>
                <MenuItem value="Online Store">Online Store</MenuItem>
                <MenuItem value="Marketplace">Marketplace</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Payment Method" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Card">Card</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Payment Status" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField fullWidth multiline rows={2} label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Grid>
          </Grid>

          <Divider><Typography variant="body2" color="text.secondary">Items</Typography></Divider>

          {form.items.map((item, index) => {
            const selectedProduct = products.find(p => p.id === Number(item.productId));
            const categoryName = categories.find(c => c.id === selectedProduct?.categoryId)?.name || '—';
            
            return (
            <Box key={item.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">Item {index + 1}</Typography>
                {form.items.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeItem(item.id)}><DeleteOutlined /></IconButton>
                )}
              </Stack>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField select required fullWidth label="Product" value={item.productId} onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}>
                    {products.map((p) => (
                       <MenuItem key={p.id} value={String(p.id)} disabled={!p.status || p.stockQuantity <= 0}>
                         {p.name}
                       </MenuItem>
                    ))}
                  </TextField>
                  {selectedProduct && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Chip size="small" label={`SKU: ${selectedProduct.sku}`} />
                      <Chip size="small" label={`Category: ${categoryName}`} />
                      <Chip size="small" label={`Stock: ${selectedProduct.stockQuantity}`} color={selectedProduct.stockQuantity < 10 ? 'warning' : 'default'} />
                    </Stack>
                  )}
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField required fullWidth type="number" label="Quantity" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} slotProps={{ htmlInput: { min: 1, step: 1, max: selectedProduct?.stockQuantity || undefined } }} error={Number(item.quantity) <= 0 || (!!selectedProduct && Number(item.quantity) > selectedProduct.stockQuantity)} helperText={Number(item.quantity) <= 0 ? 'Must be > 0' : (selectedProduct && Number(item.quantity) > selectedProduct.stockQuantity ? `Max ${selectedProduct.stockQuantity}` : '')} />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField required fullWidth type="number" label="Unit Price" value={item.unitPrice} onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField fullWidth type="number" label="Discount" value={item.discount} onChange={(e) => handleItemChange(item.id, 'discount', e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField fullWidth type="number" label="Tax" value={item.tax} onChange={(e) => handleItemChange(item.id, 'tax', e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }} />
                </Grid>
              </Grid>
            </Box>
          )})}

          <Button startIcon={<Add />} onClick={addItem} sx={{ alignSelf: 'flex-start' }}>Add Another Item</Button>

          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, mt: 2 }}>
            <Typography variant="subtitle1" align="right" color="text.secondary">
              Subtotal: {currency.format(billingSummary.subtotal)}
            </Typography>
            <Typography variant="subtitle1" align="right" color="text.secondary">
              Discount: -{currency.format(billingSummary.totalDiscount)}
            </Typography>
            <Typography variant="subtitle1" align="right" color="text.secondary">
              Tax: +{currency.format(billingSummary.totalTax)}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h5" align="right" sx={{ fontWeight: 'bold' }}>
              Grand Total: {currency.format(billingSummary.grandTotal)}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
        <Button variant="contained" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Generate Invoice'}</Button>
      </DialogActions>
    </Dialog>
  );
}
