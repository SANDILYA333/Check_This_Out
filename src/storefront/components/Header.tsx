import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import type { StoreLanguage } from '../types.ts';

export const Header: React.FC = () => {
  const {
    cartCount,
    setCurrentPage,
    language,
    setLanguage,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addresses,
    selectedAddressId,
  } = useStore();

  const activeAddress = addresses.find((a) => a.id === selectedAddressId) || addresses[0];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage('landing');
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as StoreLanguage);
  };

  return (
    <header className="shop-header">
      <div className="shop-container shop-header-top">
        {/* Brand & Demo Badge */}
        <div
          className="brand-section"
          onClick={() => setCurrentPage('landing')}
          role="button"
          tabIndex={0}
          aria-label="ShopSphere Home"
        >
          <div className="brand-logo">
            <span>🌐</span>
            <span>ShopSphere</span>
          </div>
          <span className="demo-badge">Demo Store</span>
        </div>

        {/* Location Selector (Synthetic) */}
        <div className="header-location" title="Demonstration Delivery Location">
          <span>📍</span>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Deliver to {activeAddress.name.split(' ')[0]}</div>
            <div style={{ fontWeight: 600 }}>{activeAddress.city} {activeAddress.pincode}</div>
          </div>
        </div>

        {/* Search Bar */}
        <form className="search-container" onSubmit={handleSearchSubmit}>
          <select
            className="search-category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            aria-label="Filter category"
          >
            <option value="all">All</option>
            <option value="electronics">Electronics</option>
            <option value="kitchen">Kitchen</option>
            <option value="fashion">Fashion</option>
            <option value="books">Books</option>
            <option value="fitness">Fitness</option>
            <option value="essentials">Essentials</option>
          </select>
          <input
            type="text"
            className="search-input"
            placeholder="Search products, brands and essentials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-vc-target="product-search"
            aria-label="Search ShopSphere products"
          />
          <button
            type="submit"
            className="search-btn"
            aria-label="Submit Search"
            data-vc-target="product-search-button"
          >
            🔍
          </button>
        </form>

        {/* Actions: Language, User Profile, Cart */}
        <div className="header-actions">
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1rem' }}>🗣️</span>
            <select
              className="lang-select-box"
              value={language}
              onChange={handleLanguageChange}
              aria-label="Select Storefront Language"
              data-vc-target="language-selector"
            >
              <option value="en">English (EN)</option>
              <option value="hi">हिन्दी (HI)</option>
              <option value="te">తెలుగు (TE)</option>
            </select>
          </div>

          {/* Synthetic Demo Account */}
          <div className="user-nav-item" title="Synthetic Demo Profile">
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Hello, Ramesh</span>
            <span className="user-nav-title">Account & Orders</span>
          </div>

          {/* Cart Icon & Badge */}
          <button
            className="cart-btn"
            onClick={() => setCurrentPage('cart')}
            data-vc-target="cart-icon"
            aria-label={`Shopping cart with ${cartCount} items`}
          >
            <span>🛒</span>
            <span>Cart</span>
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
