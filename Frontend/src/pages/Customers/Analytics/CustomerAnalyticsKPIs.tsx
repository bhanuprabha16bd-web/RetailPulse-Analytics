import React from 'react';
import { Grid } from '@mui/material';
import { Groups, PeopleAltOutlined, PersonAdd, Repeat, AttachMoney, TrendingUp, ShoppingCart } from '@mui/icons-material';
import { KPICard, currency } from './CustomerAnalyticsShared';

interface CustomerAnalyticsKPIsProps {
  data: any;
}

const CustomerAnalyticsKPIs: React.FC<CustomerAnalyticsKPIsProps> = ({ data }) => {
  const kpis = [
    { title: 'Total Customers', value: data.totalCustomers.toLocaleString(), note: 'All time', icon: <Groups fontSize="small" />, color: '#2878f0' },
    { title: 'Active Customers', value: data.activeCustomers.toLocaleString(), note: 'Currently active', icon: <PeopleAltOutlined fontSize="small" />, color: '#21ae68' },
    { title: 'New Customers (This Month)', value: data.newCustomers.toLocaleString(), note: 'Current month', icon: <PersonAdd fontSize="small" />, color: '#9552d4' },
    { title: 'Returning Customers', value: data.returningCustomers.toLocaleString(), note: 'More than 1 order', icon: <Repeat fontSize="small" />, color: '#f19719' },
    { title: 'Average Customer Spend', value: currency.format(data.averageCustomerSpend), note: 'Per customer', icon: <AttachMoney fontSize="small" />, color: '#11a99b' },
    { title: 'Total Revenue Generated', value: currency.format(data.totalRevenue), note: 'Linked customer sales', icon: <TrendingUp fontSize="small" />, color: '#e8a719' },
    { title: 'Avg. Purchase Frequency', value: data.averagePurchaseFrequency.toFixed(2), note: 'Orders per customer', icon: <ShoppingCart fontSize="small" />, color: '#e94e68' },
  ];

  return (
    <Grid container spacing={1.25} sx={{ mb: 1.5 }}>
      {kpis.map((kpi) => <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={kpi.title}><KPICard {...kpi} /></Grid>)}
    </Grid>
  );
};

export default CustomerAnalyticsKPIs;
