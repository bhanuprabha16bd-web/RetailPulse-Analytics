import React from 'react';
import { Card, CardContent, Typography, Stack, Avatar, Box } from '@mui/material';

export const COLORS = ['#2878f0', '#3bb66b', '#f4a621', '#9552d4', '#ef596f', '#18a4a4'];
export const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export type KPIProps = {
  title: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
  color: string;
};

export const KPICard = ({ title, value, note, icon, color }: KPIProps) => (
  <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
    <CardContent sx={{ p: '12px !important' }}>
      <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: color }}>{icon}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block', fontWeight: 700 }}>{title}</Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.3, whiteSpace: 'nowrap', fontWeight: 800 }}>{value}</Typography>
        </Box>
      </Stack>
      <Typography variant="caption" color="success.main" sx={{ display: 'block', textAlign: 'right', mt: .5 }}>{note}</Typography>
    </CardContent>
  </Card>
);

export const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2 }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 800 }}>{title}</Typography>
      <Box sx={{ height: 205 }}>{children}</Box>
    </CardContent>
  </Card>
);
