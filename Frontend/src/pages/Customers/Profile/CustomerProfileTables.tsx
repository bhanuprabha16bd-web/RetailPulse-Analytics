import { Grid, Card, CardContent, Typography, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

interface CustomerProfileTablesProps {
  recentOrders: any[];
  recentPurchases: any[];
  recentPayments: any[];
  mostFrequentlyPurchasedProducts: any[];
}

const CustomerProfileTables: React.FC<CustomerProfileTablesProps> = ({ recentOrders, recentPurchases, recentPayments, mostFrequentlyPurchasedProducts }) => {
  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Orders</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice Number</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Items</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.invoiceNumber}</TableCell>
                      <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="right">{tx.itemsCount}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(tx.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                  {recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3 }}>No orders found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Purchases</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Product</TableCell><TableCell>Invoice</TableCell><TableCell align="right">Quantity</TableCell></TableRow></TableHead>
                <TableBody>
                  {recentPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>{purchase.productName}</TableCell>
                      <TableCell>{purchase.invoiceNumber}</TableCell>
                      <TableCell align="right">{purchase.quantity}</TableCell>
                    </TableRow>
                  ))}
                  {!recentPurchases.length && <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No purchases found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Payments</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Invoice</TableCell><TableCell>Method</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.invoiceNumber}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(payment.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                  {!recentPayments.length && <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No payments found.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid size={12}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Most Frequently Purchased Products</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product Name</TableCell>
                    <TableCell align="right">Quantity Purchased</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mostFrequentlyPurchasedProducts.map((p, index) => (
                    <TableRow key={index}>
                      <TableCell>{p.productName}</TableCell>
                      <TableCell align="right">{p.count}</TableCell>
                    </TableRow>
                  ))}
                  {mostFrequentlyPurchasedProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ py: 3 }}>No products purchased yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CustomerProfileTables;
