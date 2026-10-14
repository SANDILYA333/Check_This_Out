import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { CATEGORIES } from '../data/products.ts';
import type { ProductCategory } from '../types.ts';

export const CategoryNav: React.FC = () => {
  const { selectedCategory, setSelectedCategory, setCurrentPage } = useStore();

  const handleCategoryClick = (id: ProductCategory) => {
    setSelectedCategory(id);
    setCurrentPage('landing');
  };

  return (
    <nav className="category-nav" aria-label="Category Navigation">
      <div className="shop-container" style={{ display: 'flex', gap: '8px', overflowX: 'auto', width: '100%' }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleCategoryClick(cat.id)}
            data-vc-action={`filter-category-${cat.id}`}
            aria-pressed={selectedCategory === cat.id}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
