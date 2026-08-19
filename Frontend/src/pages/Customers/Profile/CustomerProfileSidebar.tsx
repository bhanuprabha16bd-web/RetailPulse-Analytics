import React from 'react';
import { Card, CardContent, Typography, Divider, Stack, Box, Chip } from '@mui/material';
import { Email, Phone, LocationOn, CalendarToday } from '@mui/icons-material';

interface CustomerProfileSidebarProps {
  customer: any;
  segmentColors: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning">;
}

const CustomerProfileSidebar: React.FC<CustomerProfileSidebarProps> = ({ customer, segmentColors }) => {
  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Personal & Contact Information</Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 100 }}>Customer ID:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>{customer.customerId}</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Email color="action" fontSize="small" />
            <Typography variant="body2">{customer.email || 'N/A'}</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone color="action" fontSize="small" />
            <Typography variant="body2">{customer.phone || 'N/A'}</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <LocationOn color="action" fontSize="small" sx={{ mt: 0.3 }} />
            <Typography variant="body2">
              {[customer.address, customer.city, customer.state, customer.country].filter(Boolean).join(', ') || 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday color="action" fontSize="small" />
            <Typography variant="body2">
              {customer.dateOfBirth ? new Date(customer.dateOfBirth).toLocaleDateString() : 'N/A'} 
              {customer.gender ? ` • ${customer.gender}` : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 100 }}>Customer Type:</Typography>
            <Typography variant="body2">{customer.customerType}</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 100 }}>Status:</Typography>
            <Typography variant="body2">{customer.status}</Typography>
          </Box>
        </Stack>

        <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>Segmentation</Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Chip label={customer.segment} color={segmentColors[customer.segment] || 'default'} size="small" />
          <Chip label={customer.customerType} variant="outlined" size="small" />
          <Chip label={customer.preferredSalesChannel} variant="outlined" size="small" />
        </Stack>
      </CardContent>
    </Card>
  );
};

export default CustomerProfileSidebar;
