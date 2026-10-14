import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { Header } from './components/Header.tsx';
import { CategoryNav } from './components/CategoryNav.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailPage } from './components/ProductDetailPage.tsx';
import { CartPage } from './components/CartPage.tsx';
import { CheckoutFlow } from './components/CheckoutFlow.tsx';
import './styles.css';

const StorefrontContent: React.FC = () => {
  const {
    currentPage,
    filteredProducts,
    selectedCategory,
    searchQuery,
    sortBy,
    setSortBy,
  } = useStore();

  const isCheckout =
    currentPage.startsWith('checkout_') || currentPage === 'order_result';

  return (
    <div className="shopsphere-app-wrapper" data-vc-store="shopsphere">
      <Header />
      <CategoryNav />

      <main>
        {currentPage === 'landing' && (
          <div className="shop-container" data-vc-page="landing">
            <HeroSection />

            {/* Catalog Grid Section */}
            <section id="products-section" aria-label="Products Catalog">
              <div className="section-header">
                <div>
                  <h2 className="section-title">
                    {searchQuery ? `Search Results for "${searchQuery}"` : selectedCategory === 'all' ? 'Trending Marketplace Products' : `Products in ${selectedCategory}`}
                  </h2>
                  <span className="section-count">
                    Showing {filteredProducts.length} verified products
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="sort-select" style={{ fontSize: '0.85rem', color: '#64748b' }}>Sort by:</label>
                  <select
                    id="sort-select"
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="featured">Featured Deals</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating_desc">Avg. Customer Review</option>
                  </select>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '24px 0' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>No matching products found</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Try clearing your search terms or selecting another category.</p>
                </div>
              ) : (
                <div className="product-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {currentPage === 'product_detail' && <ProductDetailPage />}

        {currentPage === 'cart' && <CartPage />}

        {isCheckout && <CheckoutFlow />}
      </main>

      {/* Footer */}
      <footer style={{ background: '#0f172a', color: '#cbd5e1', padding: '40px 16px', marginTop: '60px', borderTop: '1px solid #334155' }}>
        <div className="shop-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>
              <span>🌐</span>
              <span>ShopSphere</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
              ShopSphere is the official controlled demonstration storefront for VoiceCheckout, showcasing multilingual assisted e-commerce navigation.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>Demonstration Features</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <li>✓ Voice Guidance in English, Hindi & Telugu</li>
              <li>✓ High-Contrast Non-Clicking Highlighting</li>
              <li>✓ Deterministic Payment Simulation</li>
              <li>✓ Real Cart & Address State Integrity</li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>Safety & Privacy</h4>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6' }}>
              Zero real payment processing. Never collect or transmit payment credentials, OTPs, or passwords.
            </p>
          </div>
        </div>

        <div className="shop-container" style={{ borderTop: '1px solid #1e293b', paddingTop: '20px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
          © 2026 ShopSphere — VoiceCheckout Interactive Controlled Demo Environment. All mock data synthetic.
        </div>
      </footer>
    </div>
  );
};

export const ShopSphereApp: React.FC = () => {
  return (
    <StoreProvider>
      <StorefrontContent />
    </StoreProvider>
  );
};
