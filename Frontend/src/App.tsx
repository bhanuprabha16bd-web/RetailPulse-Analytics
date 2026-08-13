import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AuditLogs from './pages/AuditLogs';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Stores from './pages/Stores';
import Analytics from './pages/Analytics';
import SalesAnalytics from './pages/SalesAnalytics';
import Inventory from './pages/Inventory';
import CustomersList from './pages/Customers/CustomersList';
import CustomerProfile from './pages/Customers/CustomerProfile';
import CustomerAnalytics from './pages/Customers/CustomerAnalytics';
import Forecasts from './pages/Forecasts';
import Layout from './components/Layout';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/stores" element={<Stores />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/customers" element={<CustomersList />} />
                  <Route path="/customers/analytics" element={<CustomerAnalytics />} />
                  <Route path="/customers/:id" element={<CustomerProfile />} />
                  <Route path="/analytics" element={<SalesAnalytics />} />
                  <Route path="/analytics/sales" element={<SalesAnalytics />} />
                  <Route path="/forecasts" element={<Forecasts />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/settings" element={<div>Settings Page Placeholder</div>} />
                </Route>
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
