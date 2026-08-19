import { Box, Chip, CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { DeleteOutlined, EditOutlined, VisibilityOutlined } from '@mui/icons-material';
import { Product, Category, currency } from './ProductsShared';

interface ProductsTableProps {
  loading: boolean;
  visibleProducts: Product[];
  categories: Category[];
  saving: boolean;
  toggleStatus: (product: Product) => void;
  setDetail: (product: Product) => void;
  openEdit: (product: Product) => void;
  setDeleteTarget: (product: Product) => void;
}

export default function ProductsTable({
  loading, visibleProducts, categories, saving, toggleStatus, setDetail, openEdit, setDeleteTarget
}: ProductsTableProps) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box>;
  
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>SKU</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Brand</TableCell>
            <TableCell align="right">Unit price</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleProducts.map((product) => (
            <TableRow key={product.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
              <TableCell>{product.sku}</TableCell>
              <TableCell>{categories.find(c => c.id === product.categoryId)?.name || 'Unknown'}</TableCell>
              <TableCell>{product.brand || '—'}</TableCell>
              <TableCell align="right">{currency.format(product.unitPrice)}</TableCell>
              <TableCell>
                <Chip label={product.status ? 'Active' : 'Inactive'} color={product.status ? 'success' : 'default'} size="small" onClick={() => toggleStatus(product)} disabled={saving} />
              </TableCell>
              <TableCell align="right">
                <IconButton aria-label={`View ${product.name}`} onClick={() => setDetail(product)}>
                  <VisibilityOutlined fontSize="small" />
                </IconButton>
                <IconButton aria-label={`Edit ${product.name}`} onClick={() => openEdit(product)}>
                  <EditOutlined fontSize="small" />
                </IconButton>
                <IconButton aria-label={`Delete ${product.name}`} color="error" onClick={() => setDeleteTarget(product)}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {!visibleProducts.length && (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                No products match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
