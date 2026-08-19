import { Box, Chip, CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { DeleteOutlined, EditOutlined } from '@mui/icons-material';
import { Category } from './CategoriesShared';

interface CategoriesTableProps {
  loading: boolean;
  visibleCategories: Category[];
  search: string;
  openEdit: (category: Category) => void;
  setDeleteTarget: (category: Category) => void;
}

export default function CategoriesTable({ loading, visibleCategories, search, openEdit, setDeleteTarget }: CategoriesTableProps) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box>;
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Category name</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="center">Products</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleCategories.map((category) => (
            <TableRow key={category.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{category.name}</TableCell>
              <TableCell sx={{ maxWidth: 380 }}>{category.description || '—'}</TableCell>
              <TableCell align="center">{category.productCount}</TableCell>
              <TableCell><Chip size="small" label={category.status ? 'Active' : 'Inactive'} color={category.status ? 'success' : 'default'} /></TableCell>
              <TableCell align="right">
                <IconButton aria-label={`Edit ${category.name}`} onClick={() => openEdit(category)}>
                  <EditOutlined fontSize="small" />
                </IconButton>
                <IconButton aria-label={`Delete ${category.name}`} color="error" onClick={() => setDeleteTarget(category)}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {!visibleCategories.length && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                {search ? 'No categories match your search.' : 'No categories have been created yet.'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
