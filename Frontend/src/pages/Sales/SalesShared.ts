export interface Store { id: number; name: string; isActive: boolean }
export interface CustomerOption { id: number; fullName: string; customerId: string; status: string }
export interface Product { id: number; name: string; categoryId: number; unitPrice: number; status: boolean; stockQuantity: number; sku: string; }
export interface Category { id: number; name: string; }
export interface SaleItem {
  id: number; saleId: number; productId: number; categoryId: number;
  quantity: number; unitPrice: number; discount: number; tax: number; total: number;
  product: { name: string } | null;
  category: { name: string } | null;
}
export interface Sale {
  id: number; invoiceNumber: string; storeId: number; customerName: string | null;
  totalAmount: number; salesChannel: string; paymentMethod: string; createdAt: string;
  paymentStatus: string; notes: string | null;
  store: { name: string } | null;
  items: SaleItem[];
}

export interface SaleItemForm {
  id: string; // temp id for UI
  productId: string; quantity: string; unitPrice: string; discount: string; tax: string;
}

export interface SaleForm {
  storeId: string; customerId: string; customerName: string; salesChannel: string; paymentMethod: string; paymentStatus: string; notes: string;
  items: SaleItemForm[];
}

export const emptyItemForm = (): SaleItemForm => ({
  id: Math.random().toString(36).substr(2, 9),
  productId: '', quantity: '1', unitPrice: '', discount: '0', tax: '0'
});

export const emptyForm: SaleForm = {
  storeId: '', customerId: '', customerName: '', salesChannel: 'Retail Store', paymentMethod: 'Cash', paymentStatus: 'Paid', notes: '',
  items: [emptyItemForm()]
};

export const manageRoles = ['Super Admin', 'Company Owner', 'Company Admin', 'Analyst'];
export const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
