import React, { useState, useMemo } from 'react';
import { Box } from '@mui/material';
import CurrentStockFilters from './CurrentStock/CurrentStockFilters';
import CurrentStockTable from './CurrentStock/CurrentStockTable';

interface Props {
  processedProducts: any[];
  categories: any[];
  uniqueBrands: string[];
}

const CurrentStock: React.FC<Props> = ({ processedProducts, categories, uniqueBrands }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Product Name');

  const visibleProducts = useMemo(() => {
    let filtered = processedProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'All' || p.categoryName === categoryFilter;
      const matchBrand = brandFilter === 'All' || (p.brand || 'Unbranded') === brandFilter;
      const matchStatus = statusFilter === 'All' || p.statusObj.label === statusFilter;
      return matchSearch && matchCat && matchBrand && matchStatus;
    });

    if (sortBy === 'Product Name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'Current Stock') filtered.sort((a, b) => b.stockQuantity - a.stockQuantity);
    else if (sortBy === 'Recently Updated') filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return filtered;
  }, [processedProducts, search, categoryFilter, brandFilter, statusFilter, sortBy]);

  return (
    <Box>
      <CurrentStockFilters 
        search={search} setSearch={setSearch} 
        categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} 
        brandFilter={brandFilter} setBrandFilter={setBrandFilter} 
        statusFilter={statusFilter} setStatusFilter={setStatusFilter} 
        sortBy={sortBy} setSortBy={setSortBy} 
        categories={categories} uniqueBrands={uniqueBrands} 
      />

      <CurrentStockTable visibleProducts={visibleProducts} />
    </Box>
  );
};

export default CurrentStock;
