import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductIcon } from './ProductIcon.tsx';

export const ProductDetailPage: React.FC = () => {
  const { products, selectedProductId, addToCart, setCurrentPage } = useStore();
  const [quantity, setQuantity] = useState<number>(1);

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    setCurrentPage('cart');
  };

  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <div className="shop-container" data-vc-page="product-detail">
      <div className="detail-view">
        {/* Breadcrumb Navigation */}
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <span className="crumb-link" onClick={() => setCurrentPage('landing')}>Home</span>
          <span>›</span>
          <span className="crumb-link" onClick={() => setCurrentPage('landing')}>{product.category}</span>
          <span>›</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{product.name}</span>
        </nav>

        <div className="detail-layout">
          {/* Visual Presentation */}
          <div className="detail-visual">
            <ProductIcon iconType={product.iconType} size={220} />
            <div style={{ marginTop: '20px', fontSize: '0.85rem', color: '#64748b', textAlign: 'center' }}>
              ✓ Authentic Demo Product Asset • High Quality Guaranteed
            </div>
          </div>

          {/* Product Info & Purchase Controls */}
          <div className="detail-info">
            {product.badge && (
              <span className="card-badge" style={{ position: 'static', width: 'fit-content' }}>
                {product.badge}
              </span>
            )}

            <h1 className="detail-title">{product.name}</h1>

            <div className="product-rating">
              <span className="rating-stars">★★★★☆ {product.rating}</span>
              <span>• {product.reviewCount.toLocaleString('en-IN')} verified customer reviews</span>
            </div>

            <div style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
              <div className="product-price-row">
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                <span className="product-orig-price" style={{ fontSize: '1.1rem' }}>
                  ₹{product.originalPrice.toLocaleString('en-IN')}
                </span>
                <span className="product-discount-percent" style={{ fontSize: '1rem' }}>
                  Save {discountPercent}%
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                Inclusive of all taxes • Free Delivery for orders over ₹999
              </p>
            </div>

            <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.6' }}>
              {product.description}
            </p>

            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Key Product Highlights:</h4>
              <ul className="feature-list">
                {product.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Quantity:</span>
              <div className="qty-control" aria-label="Select quantity">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="qty-number" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={handleAddToCart}
                data-vc-target="add-to-cart"
                aria-label={`Add ${quantity} of ${product.name} to Cart`}
              >
                <span>🛒 Add to Cart</span>
              </button>

              <button
                className="btn-secondary"
                style={{ background: '#0f172a', borderColor: '#0f172a', color: '#ffffff' }}
                onClick={handleBuyNow}
                data-vc-target="buy-now"
                aria-label={`Buy Now: ${product.name}`}
              >
                <span>⚡ Buy Now</span>
              </button>

              <button
                className="btn-card-view"
                onClick={() => setCurrentPage('landing')}
                aria-label="Back to Catalog"
              >
                ← Back to Products
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
