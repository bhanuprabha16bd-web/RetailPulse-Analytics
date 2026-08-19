import { Box, Chip, CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { DeleteOutlined, EditOutlined } from '@mui/icons-material';
import { Store } from './StoresShared';

interface StoresTableProps {
  loading: boolean;
  visibleStores: Store[];
  search: string;
  openEdit: (store: Store) => void;
  setDeleteTarget: (store: Store) => void;
}

export default function StoresTable({ loading, visibleStores, search, openEdit, setDeleteTarget }: StoresTableProps) {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 7 }}><CircularProgress /></Box>;
  return (
    <TableContainer>
      <Table>
        <TableHead><TableRow><TableCell>Store Name</TableCell><TableCell>Location</TableCell><TableCell>Date Added</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
        <TableBody>
          {visibleStores.map((store) => <TableRow key={store.id} hover>
            <TableCell sx={{ fontWeight: 600 }}>{store.name}</TableCell>
            <TableCell>{store.location}</TableCell>
            <TableCell>{new Date(store.createdAt).toLocaleDateString()}</TableCell>
            <TableCell><Chip size="small" label={store.isActive ? 'Active' : 'Inactive'} color={store.isActive ? 'success' : 'default'} /></TableCell>
            <TableCell align="right">
              <IconButton aria-label={`Edit ${store.name}`} onClick={() => openEdit(store)}><EditOutlined fontSize="small" /></IconButton>
              <IconButton aria-label={`Delete ${store.name}`} color="error" onClick={() => setDeleteTarget(store)}><DeleteOutlined fontSize="small" /></IconButton>
            </TableCell>
          </TableRow>)}
          {!visibleStores.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}>{search ? 'No stores match your search.' : 'No stores have been created yet.'}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
