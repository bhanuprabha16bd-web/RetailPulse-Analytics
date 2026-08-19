import React from 'react';
import { Box, CircularProgress, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Skeleton } from '@mui/material';

export const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

export const paymentColors = ['#5865f2', '#7d8ff7', '#aab8ff', '#f4ad36', '#cbd5e1'];

export const emptyData: any = { kpis: { total_revenue: 0, total_orders: 0, average_order_value: 0, total_items_sold: 0, total_discount: 0, total_tax: 0 }, sales_overview: [], sales_vs_orders: [], top_products: [], top_customers: [], payment_analysis: [], recent_sales: [] };

export function ChartLoading({ loading, empty, children }: { loading: boolean; empty: boolean; children: React.ReactNode }) { 
  if (loading) return <Box sx={{ height: '90%', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>; 
  if (empty) return <Box sx={{ height: '90%', display: 'grid', placeItems: 'center' }}><Typography color="text.secondary">No sales data for this selection.</Typography></Box>; 
  return <>{children}</>; 
}

export function DataTable({ headers, rows, loading }: { headers: string[]; rows: string[][]; loading: boolean }) { 
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {headers.map(h => <TableCell key={h}>{h}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={headers.length}><Skeleton /></TableCell></TableRow>
          ) : rows.length ? (
            rows.map((row, i) => (
              <TableRow key={`${row[0]}-${i}`}>
                {row.map((cell, j) => <TableCell key={j} align={j ? 'right' : 'left'}>{cell}</TableCell>)}
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={headers.length} align="center">No data available.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
