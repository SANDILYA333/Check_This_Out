import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductIcon } from './ProductIcon.tsx';

export const CartPage: React.FC = () => {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    discount,
    deliveryFee,
    total,
    setCurrentPage,
  } = useStore();

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    setCurrentPage('checkout_address');
  };

  if (cart.length === 0) {
    return (
      <div className="shop-container" data-vc-page="cart" data-vc-state="empty">
        <div className="cart-card" style={{ textAlign: 'center', padding: '60px 24px', margin: '32px 0' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🛒</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px' }}>Your Cart is Empty</h2>
          <p style={{ color: '#64748b', marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px auto' }}>
            Looks like you have not added any items to your demo cart yet. Explore our curated catalog of Indian marketplace essentials!
          </p>
          <button
            className="btn-primary"
            onClick={() => setCurrentPage('landing')}
            data-vc-target="continue-shopping"
            aria-label="Continue Shopping"
          >
            ← Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-container" data-vc-page="cart" data-vc-state="active">
      <div className="section-header">
        <h1 className="section-title">
          <span>Shopping Cart</span>
          <span className="section-count">({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
        </h1>
        <button
          onClick={clearCart}
          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
          data-vc-action="clear-cart"
        >
          Clear All Items
        </button>
      </div>

      <div className="cart-layout">
        {/* Cart Items List */}
        <div className="cart-card">
          {cart.map((item) => (
            <div key={item.product.id} className="cart-item-row" data-vc-item={`cart-${item.product.id}`}>
              <div style={{ width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                <ProductIcon iconType={item.product.iconType} size={64} />
              </div>

              <div className="cart-item-info">
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {item.product.name}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#059669', marginBottom: '6px' }}>
                  In Stock • Eligible for Free Standard Delivery
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                  ₹{item.product.price.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Quantity controls */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div className="qty-control">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => updateQuantity(item.product.id, -1)}
                    aria-label={`Decrease quantity of ${item.product.name}`}
                  >
                    -
                  </button>
                  <span className="qty-number">{item.quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => updateQuantity(item.product.id, 1)}
                    aria-label={`Increase quantity of ${item.product.name}`}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.product.id)}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              className="btn-card-view"
              onClick={() => setCurrentPage('landing')}
              data-vc-target="continue-shopping"
            >
              ← Continue Shopping
            </button>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items): ₹{subtotal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="summary-card">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>
            Order Summary
          </h2>

          <div className="summary-row">
            <span>Items Subtotal:</span>
            <span>₹{subtotal.toLocaleString('en-IN')}</span>
          </div>

          {discount > 0 && (
            <div className="summary-row" style={{ color: '#059669' }}>
              <span>Special Demo Discount:</span>
              <span>-₹{discount.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="summary-row">
            <span>Estimated Delivery:</span>
            <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
          </div>

          <div className="summary-total-row">
            <span>Order Total:</span>
            <span>₹{total.toLocaleString('en-IN')}</span>
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
            onClick={handleProceedToCheckout}
            data-vc-target="proceed-to-checkout"
            aria-label="Proceed to Checkout"
          >
            <span>Proceed to Checkout</span>
            <span>→</span>
          </button>

          <div style={{ marginTop: '16px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
            🔒 Safe Simulated Checkout • Zero Real Payment Required
          </div>
        </div>
      </div>
    </div>
  );
};
