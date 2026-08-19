export interface Category {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
  productCount: number;
}

export interface CategoryForm { name: string; description: string; status: boolean }
export const emptyForm: CategoryForm = { name: '', description: '', status: true };
export const adminRoles = ['Super Admin', 'Company Owner', 'Company Admin'];
