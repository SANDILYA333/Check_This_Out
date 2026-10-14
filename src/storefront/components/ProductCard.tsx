import React from 'react';
import type { Product } from '../types.ts';
import { ProductIcon } from './ProductIcon.tsx';
import { useStore } from '../context/StoreContext.tsx';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, viewProductDetails } = useStore();

  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <article
      className="product-card"
      data-vc-item={`product-${product.id}`}
      aria-label={product.name}
    >
      {product.badge && <span className="card-badge">{product.badge}</span>}

      <div
        className="product-image-wrap"
        onClick={() => viewProductDetails(product.id)}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${product.name}`}
      >
        <ProductIcon iconType={product.iconType} size={110} />
      </div>

      <h3
        className="product-title"
        onClick={() => viewProductDetails(product.id)}
        title={product.name}
      >
        {product.name}
      </h3>

      <div className="product-rating">
        <span className="rating-stars">★ {product.rating}</span>
        <span>({product.reviewCount.toLocaleString('en-IN')})</span>
      </div>

      <div className="product-price-row">
        <span className="product-price">₹{product.price.toLocaleString('en-IN')}</span>
        <span className="product-orig-price">₹{product.originalPrice.toLocaleString('en-IN')}</span>
        <span className="product-discount-percent">({discountPercent}% off)</span>
      </div>

      <div className="delivery-estimate-tag">
        <span>🚚 {product.estimatedDelivery}</span>
      </div>

      <div className="product-card-actions">
        <button
          className="btn-card-add"
          onClick={() => addToCart(product, 1)}
          data-vc-target="product-card-add"
          data-product-id={product.id}
          aria-label={`Add ${product.name} to Cart`}
        >
          Add to Cart
        </button>

        <button
          className="btn-card-view"
          onClick={() => viewProductDetails(product.id)}
          data-vc-target="view-details"
          data-product-id={product.id}
          aria-label={`View details for ${product.name}`}
        >
          Details
        </button>
      </div>
    </article>
  );
};
