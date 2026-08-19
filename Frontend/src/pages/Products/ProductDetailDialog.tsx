import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import { Product, Category, currency } from './ProductsShared';

interface ProductDetailDialogProps {
  detail: Product | null;
  setDetail: (val: Product | null) => void;
  categories: Category[];
}

export default function ProductDetailDialog({ detail, setDetail, categories }: ProductDetailDialogProps) {
  return (
    <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
      <DialogTitle>{detail?.name}</DialogTitle>
      <DialogContent>
        {detail && (
          <Stack spacing={1.5}>
            <Typography color="text.secondary">SKU: {detail.sku}</Typography>
            <Divider />
            <Typography><b>Category:</b> {categories.find(c => c.id === detail.categoryId)?.name || 'Unknown'}</Typography>
            <Typography><b>Brand:</b> {detail.brand || '—'}</Typography>
            <Typography><b>Description:</b> {detail.description || '—'}</Typography>
            <Typography><b>Unit price:</b> {currency.format(detail.unitPrice)}</Typography>
            <Typography><b>Cost price:</b> {detail.costPrice === null ? '—' : currency.format(detail.costPrice)}</Typography>
            <Typography><b>Initial stock:</b> {detail.stockQuantity} {detail.unitOfMeasure}</Typography>
            <Typography><b>Status:</b> {detail.status ? 'Active' : 'Inactive'}</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDetail(null)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
