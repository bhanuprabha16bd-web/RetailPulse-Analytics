import { axiosPrivate } from './axios';

export interface Customer {
    id: number;
    companyId: number;
    customerId: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    customerType: 'Retail' | 'Wholesale' | 'Corporate';
    preferredSalesChannel: 'Retail Store' | 'Online Store' | 'Marketplace';
    status: 'Active' | 'Inactive';
    segment: 'New Customer' | 'Regular Customer' | 'Loyal Customer' | 'VIP Customer';
    createdAt: string;
    updatedAt: string | null;
}

export interface CustomerStatsResponse {
    customer: Customer;
    totalOrders: number;
    totalRevenueGenerated: number;
    totalQuantityPurchased: number;
    averageOrderValue: number;
    lastPurchaseDate: string | null;
    firstPurchaseDate: string | null;
    favoriteCategory: string | null;
    favoriteProduct: string | null;
    purchaseFrequencyDays: number | null;
    mostFrequentlyPurchasedProducts: { productName: string; count: number }[];
    recentTransactions: {
        id: number;
        invoiceNumber: string;
        totalAmount: number;
        createdAt: string;
        itemsCount: number;
    }[];
}

export interface ChartDataPoint {
    name: string;
    value: number;
}

export interface CustomerAnalyticsResponse {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageCustomerSpend: number;
    totalRevenue: number;
    averagePurchaseFrequency: number;

    growthTrend: ChartDataPoint[];
    newVsReturning: ChartDataPoint[];
    revenueByType: ChartDataPoint[];
    topCustomers: ChartDataPoint[];
    purchaseFrequencyDistribution: ChartDataPoint[];
    locationDistribution: ChartDataPoint[];
    monthlyAcquisition: ChartDataPoint[];
    segmentDistribution: ChartDataPoint[];
}

export interface CustomerTimelineEvent {
    id: number;
    action: string;
    timestamp: string;
    user: string;
}

export const customersApi = {
    getAnalytics: async () => {
        const response = await axiosPrivate.get<CustomerAnalyticsResponse>('/customers/analytics');
        return response.data;
    },

    getCustomers: async (params?: { 
        search?: string; 
        customerType?: string; 
        statusFilter?: string;
        city?: string;
        state?: string;
        country?: string;
        regDateStart?: string;
        regDateEnd?: string;
        sortBy?: string;
        sortOrder?: string;
    }) => {
        const response = await axiosPrivate.get<Customer[]>('/customers', { params });
        return response.data;
    },
    
    getCustomer: async (id: number) => {
        const response = await axiosPrivate.get<CustomerStatsResponse>(`/customers/${id}`);
        return response.data;
    },
    
    getTimeline: async (id: number) => {
        const response = await axiosPrivate.get<CustomerTimelineEvent[]>(`/customers/${id}/timeline`);
        return response.data;
    },

    exportCustomersList: async () => {
        const response = await axiosPrivate.get('/customers/export/list', { responseType: 'blob' });
        return response.data;
    },
    
    createCustomer: async (data: Partial<Customer>) => {
        const response = await axiosPrivate.post<Customer>('/customers', data);
        return response.data;
    },
    
    updateCustomer: async (id: number, data: Partial<Customer>) => {
        const response = await axiosPrivate.put<Customer>(`/customers/${id}`, data);
        return response.data;
    },
    
    toggleStatus: async (id: number) => {
        const response = await axiosPrivate.put<Customer>(`/customers/${id}/status`);
        return response.data;
    },
    
    deleteCustomer: async (id: number) => {
        await axiosPrivate.delete(`/customers/${id}`);
    }
};
