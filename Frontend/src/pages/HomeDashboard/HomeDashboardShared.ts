export interface Store { is_active: boolean }
export interface Product { id: number; categoryId: number; status: boolean }
export interface Category { id: number; name: string }
export interface SaleItem { productId: number; categoryId: number; total?: number; quantity?: number; unitPrice?: number; discount?: number; tax?: number; product?: { categoryId: number } | null }
export interface Sale { totalAmount: number; createdAt: string; items: SaleItem[] }
