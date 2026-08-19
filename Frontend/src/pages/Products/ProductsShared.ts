export interface Category { id: number; name: string; status: boolean }
export interface Product {
  id: number; name: string; sku: string; categoryId: number; brand: string | null; description: string | null;
  unitPrice: number; costPrice: number | null; stockQuantity: number; unitOfMeasure: string; status: boolean; createdAt: string;
}
export interface ProductForm {
  name: string; sku: string; categoryId: string; brand: string; description: string; unitPrice: string;
  costPrice: string; stockQuantity: string; unitOfMeasure: string; status: boolean;
}
export const emptyForm: ProductForm = { name: '', sku: '', categoryId: '', brand: '', description: '', unitPrice: '', costPrice: '', stockQuantity: '0', unitOfMeasure: 'Unit', status: true };
export const adminRoles = ['Super Admin', 'Company Owner', 'Company Admin'];
export const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' });
