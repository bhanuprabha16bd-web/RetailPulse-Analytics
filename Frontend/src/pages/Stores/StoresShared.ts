export interface Store {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export interface StoreForm { name: string; location: string; isActive: boolean }
export const emptyForm: StoreForm = { name: '', location: '', isActive: true };
export const adminRoles = ['Super Admin', 'Company Owner', 'Company Admin'];
