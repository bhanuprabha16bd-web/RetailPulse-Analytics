export interface Recommendation {
  productId: number;
  productName: string;
  sku: string;
  categoryName: string;
  supplier: string;
  currentStock: number;
  averageDailySales: number;
  forecastedDemand: number;
  daysRemaining: number | null;
  reorderPoint: number;
  recommendedQuantity: number;
  stockRisk: string;
  recommendationAction: string;
  categoryId: number;
  safetyStock: number;
}

export interface Summary {
  reorderCount: number;
  stockoutRiskCount: number;
  overstockedCount: number;
  healthyCount: number;
}

export interface ForecastData {
  summary: Summary;
  recommendations: Recommendation[];
}

export const riskColors: Record<string, 'error' | 'warning' | 'success' | 'info' | 'default'> = {
  'Out of Stock': 'error',
  'Stockout Risk': 'warning',
  'Low Stock': 'warning',
  'Overstock': 'info',
  'Healthy': 'success',
};
