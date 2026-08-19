import React from 'react';
import { Stack, Card, CardContent, Typography, Button, Avatar, Box, Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { COLORS, currency } from './CustomerAnalyticsShared';

interface CustomerAnalyticsSidebarProps {
  data: any;
  recentCustomers: any[];
}

const CustomerAnalyticsSidebar: React.FC<CustomerAnalyticsSidebarProps> = ({ data, recentCustomers }) => {
  const navigate = useNavigate();
  
  return (
    <Stack spacing={1.5}>
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Top Customers</Typography><Button size="small" onClick={() => navigate('/customers')}>View all</Button></Stack>
          {data.topCustomers.slice(0, 5).map((customer: any, index: number) => <Stack key={customer.name} direction="row" spacing={1} sx={{ py: .8, alignItems: 'center' }}><Avatar sx={{ width: 27, height: 27, bgcolor: COLORS[index], fontSize: 12 }}>{customer.name.charAt(0)}</Avatar><Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>{customer.name}</Typography><Typography variant="caption" sx={{ fontWeight: 700 }}>{currency.format(customer.value)}</Typography></Stack>)}
        </CardContent>
      </Card>
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Recent Customers</Typography><Button size="small" onClick={() => navigate('/customers')}>View all</Button></Stack>
          {recentCustomers.map((customer) => <Stack key={customer.id} direction="row" spacing={1} sx={{ py: .8, alignItems: 'center' }}><Avatar sx={{ width: 27, height: 27, bgcolor: 'primary.light', fontSize: 12 }}>{customer.fullName.charAt(0)}</Avatar><Box sx={{ flexGrow: 1, minWidth: 0 }}><Typography variant="body2" noWrap>{customer.fullName}</Typography><Typography variant="caption" color="text.secondary">{customer.city || 'Location unavailable'}</Typography></Box><Tooltip title={customer.status}><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: customer.status === 'Active' ? 'success.main' : 'text.disabled' }} /></Tooltip></Stack>)}
        </CardContent>
      </Card>
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>Quick Actions</Typography>
          <Stack spacing={1}><Button variant="contained" size="small" onClick={() => navigate('/customers')}>Add New Customer</Button><Button variant="outlined" size="small" onClick={() => navigate('/customers')}>View Customer List</Button></Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default CustomerAnalyticsSidebar;
