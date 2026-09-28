export const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return { bgcolor: '#FEE2E2', color: '#991B1B' };
    case 'high': return { bgcolor: '#FEF3C7', color: '#92400E' };
    case 'medium': return { bgcolor: '#DBEAFE', color: '#1E40AF' };
    case 'low': default: return { bgcolor: '#F3F4F6', color: '#374151' };
  }
};

export const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'open': return { bgcolor: '#FEF3C7', color: '#92400E' };
    case 'investigating': return { bgcolor: '#DBEAFE', color: '#1E40AF' };
    case 'resolved': return { bgcolor: '#D1FAE5', color: '#065F46' };
    case 'ignored': default: return { bgcolor: '#F3F4F6', color: '#374151' };
  }
};

export const getChartColor = (type: string) => {
  switch (type) {
    case 'Stock Mismatch': return '#3B82F6';
    case 'Invalid Product Ref': return '#F59E0B';
    case 'Invalid Customer Ref': return '#EF4444';
    case 'Duplicate SKU': return '#8B5CF6';
    case 'Missing Information': return '#10B981';
    case 'Other': default: return '#6B7280';
  }
};
