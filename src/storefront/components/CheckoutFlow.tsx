import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { DELIVERY_OPTIONS, PAYMENT_METHODS } from '../data/addresses.ts';
import type { Address, DemoPaymentOutcome } from '../types.ts';
import { ProductIcon } from './ProductIcon.tsx';

export const CheckoutFlow: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    cart,
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    addAddress,
    selectedDeliveryId,
    setSelectedDeliveryId,
    selectedPaymentId,
    setSelectedPaymentId,
    subtotal,
    discount,
    deliveryFee,
    total,
    simulatedScenario,
    setSimulatedScenario,
    simulatePaymentHandoff,
    isProcessingPayment,
    activeOrder,
    recheckPendingStatus,
    retryFailedPayment,
    resetToStore,
  } = useStore();

  // New address form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    deliveryInstructions: 'Leave at front door with security',
  });
  const [addressError, setAddressError] = useState<string | null>(null);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || addresses[0];
  const selectedDelivery = DELIVERY_OPTIONS.find((d) => d.id === selectedDeliveryId) || DELIVERY_OPTIONS[0];
  const selectedPayment = PAYMENT_METHODS.find((p) => p.id === selectedPaymentId) || PAYMENT_METHODS[0];

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.name || !newAddress.street || !newAddress.city || !newAddress.pincode) {
      setAddressError('Please fill in all required synthetic address fields.');
      return;
    }
    addAddress({
      ...newAddress,
      isDefault: false,
    });
    setShowAddAddress(false);
    setAddressError(null);
  };

  // Helper for Stepper indicator state
  const getStepClass = (stepName: string) => {
    const order = [
      'checkout_address',
      'checkout_delivery',
      'checkout_payment',
      'checkout_review',
      'checkout_demo_payment',
      'order_result',
    ];
    const currentIndex = order.indexOf(currentPage);
    const stepIndex = order.indexOf(stepName);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return '';
  };

  // -------------------------------------------------------------
  // 1. ADDRESS SELECTION
  // -------------------------------------------------------------
  if (currentPage === 'checkout_address') {
    return (
      <div className="shop-container" data-vc-page="address">
        <div className="checkout-stepper">
          <div className={`step-indicator ${getStepClass('checkout_address')}`}>
            <span className="step-circle">1</span>
            <span>Delivery Address</span>
          </div>
          <div className={`step-indicator ${getStepClass('checkout_delivery')}`}>
            <span className="step-circle">2</span>
            <span>Delivery Option</span>
          </div>
          <div className={`step-indicator ${getStepClass('checkout_payment')}`}>
            <span className="step-circle">3</span>
            <span>Payment Method</span>
          </div>
          <div className={`step-indicator ${getStepClass('checkout_review')}`}>
            <span className="step-circle">4</span>
            <span>Review Order</span>
          </div>
        </div>

        <div className="cart-layout">
          <div className="cart-card">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
              Select a Demonstration Delivery Address
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              ℹ️ Safe demo addresses with synthetic customer information only. No real personal addresses are stored.
            </p>

            {/* List of demo addresses */}
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={`radio-card ${selectedAddressId === addr.id ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
                data-vc-item={`address-${addr.id}`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === addr.id}
                  onChange={() => setSelectedAddressId(addr.id)}
                  style={{ marginTop: '4px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                    {addr.name} {addr.isDefault && <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>Default</span>}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#334155', margin: '4px 0' }}>
                    {addr.street}, {addr.city}, {addr.state} – <strong>{addr.pincode}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Phone: {addr.phone}
                  </div>
                  {addr.deliveryInstructions && (
                    <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '4px' }}>
                      Instructions: {addr.deliveryInstructions}
                    </div>
                  )}
                </div>
              </label>
            ))}

            {/* Toggle Add Address Form */}
            {!showAddAddress ? (
              <button
                type="button"
                className="btn-card-view"
                style={{ marginTop: '12px' }}
                onClick={() => setShowAddAddress(true)}
              >
                + Add New Sample Address
              </button>
            ) : (
              <form onSubmit={handleSaveNewAddress} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '16px' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '12px' }}>Add Synthetic Demo Address</h4>
                {addressError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '8px' }}>{addressError}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Full Name *"
                    className="search-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    value={newAddress.name}
                    onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Phone Number *"
                    className="search-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Flat / House / Street Address *"
                    className="search-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '4px', width: '100%' }}
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="City *"
                    className="search-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="State *"
                    className="search-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="PIN Code *"
                    className="search-input"
                    style={{ border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    value={newAddress.pincode}
                    onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                    Save Sample Address
                  </button>
                  <button type="button" className="btn-card-view" onClick={() => setShowAddAddress(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-card-view" onClick={() => setCurrentPage('cart')}>
                ← Back to Cart
              </button>
              <button
                className="btn-primary"
                onClick={() => setCurrentPage('checkout_delivery')}
                data-vc-target="confirm-address"
                aria-label="Deliver to this Address"
              >
                <span>Deliver to this Address</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Quick Summary */}
          <div className="summary-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Order Total</h3>
            <div className="summary-row"><span>Items:</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="summary-row"><span>Estimated Total:</span><span style={{ fontWeight: 700, color: '#0f172a' }}>₹{total.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. DELIVERY OPTIONS
  // -------------------------------------------------------------
  if (currentPage === 'checkout_delivery') {
    return (
      <div className="shop-container" data-vc-page="delivery">
        <div className="checkout-stepper">
          <div className="step-indicator completed">
            <span className="step-circle">✓</span>
            <span>Delivery Address</span>
          </div>
          <div className="step-indicator active">
            <span className="step-circle">2</span>
            <span>Delivery Option</span>
          </div>
          <div className="step-indicator">
            <span className="step-circle">3</span>
            <span>Payment Method</span>
          </div>
          <div className="step-indicator">
            <span className="step-circle">4</span>
            <span>Review Order</span>
          </div>
        </div>

        <div className="cart-layout">
          <div className="cart-card">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
              Choose Your Demonstration Delivery Option
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Delivering to: <strong>{selectedAddress.name}</strong>, {selectedAddress.city} {selectedAddress.pincode}
            </p>

            {DELIVERY_OPTIONS.map((opt) => {
              const isFreeStandard = opt.id === 'standard' && subtotal >= 999;
              return (
                <label
                  key={opt.id}
                  className={`radio-card ${selectedDeliveryId === opt.id ? 'selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  data-vc-item={`delivery-${opt.id}`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={selectedDeliveryId === opt.id}
                    onChange={() => setSelectedDeliveryId(opt.id)}
                    style={{ marginTop: '4px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                        {opt.name} ({opt.duration})
                      </div>
                      <div style={{ fontWeight: 700, color: isFreeStandard ? '#059669' : '#0f172a' }}>
                        {isFreeStandard ? 'FREE' : `₹${opt.fee}`}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                      {opt.id === 'standard' ? 'Economical, reliable ground shipping' : 'Priority express express air courier'}
                    </div>
                  </div>
                </label>
              );
            })}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-card-view" onClick={() => setCurrentPage('checkout_address')}>
                ← Back to Address
              </button>
              <button
                className="btn-primary"
                onClick={() => setCurrentPage('checkout_payment')}
                data-vc-target="confirm-delivery"
                aria-label="Continue to Payment"
              >
                <span>Continue to Payment</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="summary-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Order Total</h3>
            <div className="summary-row"><span>Items:</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="summary-row"><span>Delivery:</span><span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
            <div className="summary-total-row"><span>Total:</span><span>₹{total.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. PAYMENT METHOD SELECTION
  // -------------------------------------------------------------
  if (currentPage === 'checkout_payment') {
    return (
      <div className="shop-container" data-vc-page="payment">
        <div className="checkout-stepper">
          <div className="step-indicator completed">
            <span className="step-circle">✓</span>
            <span>Delivery Address</span>
          </div>
          <div className="step-indicator completed">
            <span className="step-circle">✓</span>
            <span>Delivery Option</span>
          </div>
          <div className="step-indicator active">
            <span className="step-circle">3</span>
            <span>Payment Method</span>
          </div>
          <div className="step-indicator">
            <span className="step-circle">4</span>
            <span>Review Order</span>
          </div>
        </div>

        <div className="cart-layout">
          <div className="cart-card">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
              Select a Simulated Payment Method
            </h2>

            <div className="simulation-alert-banner">
              <span style={{ fontSize: '1.3rem' }}>🛡️</span>
              <div>
                <strong>Simulation Environment Notice:</strong> No real money will be charged. Never enter a real bank password, UPI PIN, card number, or OTP.
              </div>
            </div>

            {PAYMENT_METHODS.map((method) => (
              <label
                key={method.id}
                className={`radio-card ${selectedPaymentId === method.id ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
                data-vc-item={`payment-${method.id}`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={selectedPaymentId === method.id}
                  onChange={() => setSelectedPaymentId(method.id)}
                  style={{ marginTop: '4px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{method.icon}</span>
                    <span>{method.name}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
                    {method.description}
                  </div>
                </div>
              </label>
            ))}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-card-view" onClick={() => setCurrentPage('checkout_delivery')}>
                ← Back to Delivery
              </button>
              <button
                className="btn-primary"
                onClick={() => setCurrentPage('checkout_review')}
                data-vc-target="confirm-payment-method"
                aria-label="Use this Payment Method"
              >
                <span>Use this Payment Method</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="summary-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Order Total</h3>
            <div className="summary-row"><span>Items:</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="summary-row"><span>Delivery:</span><span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
            <div className="summary-total-row"><span>Total:</span><span>₹{total.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. ORDER REVIEW
  // -------------------------------------------------------------
  if (currentPage === 'checkout_review') {
    return (
      <div className="shop-container" data-vc-page="review">
        <div className="checkout-stepper">
          <div className="step-indicator completed"><span className="step-circle">✓</span><span>Delivery Address</span></div>
          <div className="step-indicator completed"><span className="step-circle">✓</span><span>Delivery Option</span></div>
          <div className="step-indicator completed"><span className="step-circle">✓</span><span>Payment Method</span></div>
          <div className="step-indicator active"><span className="step-circle">4</span><span>Review Order</span></div>
        </div>

        <div className="cart-layout">
          <div className="cart-card">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
              Review Your Order Details
            </h2>

            {/* Address Review Section */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Shipping Address</span>
                <button
                  onClick={() => setCurrentPage('checkout_address')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Change
                </button>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '6px' }}>
                {selectedAddress.name} • {selectedAddress.street}, {selectedAddress.city} {selectedAddress.pincode}
              </div>
            </div>

            {/* Delivery Review Section */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Delivery Method</span>
                <button
                  onClick={() => setCurrentPage('checkout_delivery')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Change
                </button>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '6px' }}>
                {selectedDelivery.name} ({selectedDelivery.duration}) – {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
              </div>
            </div>

            {/* Payment Review Section */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Payment Method</span>
                <button
                  onClick={() => setCurrentPage('checkout_payment')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Change
                </button>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '6px' }}>
                {selectedPayment.name} (Simulated)
              </div>
            </div>

            {/* Ordered Items List */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '20px 0 12px 0' }}>Items in this order:</h4>
            {cart.map((item) => (
              <div key={item.product.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <ProductIcon iconType={item.product.iconType} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.product.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Qty: {item.quantity} × ₹{item.product.price.toLocaleString('en-IN')}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                </div>
              </div>
            ))}

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-card-view" onClick={() => setCurrentPage('checkout_payment')}>
                ← Back to Payment
              </button>
              <button
                className="btn-primary"
                onClick={() => setCurrentPage('checkout_demo_payment')}
                data-vc-target="confirm-order-review"
                aria-label="Proceed to Payment Simulation"
              >
                <span>Proceed to Payment Simulation</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Final Summary Card */}
          <div className="summary-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px' }}>Final Amount</h3>
            <div className="summary-row"><span>Items:</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
            {discount > 0 && <div className="summary-row" style={{ color: '#059669' }}><span>Discount:</span><span>-₹{discount}</span></div>}
            <div className="summary-row"><span>Delivery Fee:</span><span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>
            <div className="summary-total-row"><span>Grand Total:</span><span>₹{total.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 5. DEMO PAYMENT HANDOFF (Simulated Processing Screen)
  // -------------------------------------------------------------
  if (currentPage === 'checkout_demo_payment') {
    return (
      <div className="shop-container" data-vc-page="demo-payment">
        <div className="outcome-card" style={{ maxWidth: '640px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Simulated Payment Processing Handoff
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '20px' }}>
            This is an explicitly controlled demonstration screen. Total amount to simulate: <strong>₹{total.toLocaleString('en-IN')}</strong>.
          </p>

          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, marginBottom: '24px' }}>
            ⚠️ Safety Rule: Never share your real UPI PIN, OTP, or password with anyone.
          </div>

          <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px', color: '#334155' }}>
            Select a test simulation outcome to trigger:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <button
              className="btn-primary"
              style={{ background: '#16a34a', borderColor: '#15803d', justifyContent: 'center' }}
              onClick={() => {
                setSimulatedScenario('success');
                simulatePaymentHandoff();
              }}
              data-vc-target="simulate-payment-success"
              disabled={isProcessingPayment}
            >
              ✓ Simulate Success
            </button>

            <button
              className="btn-primary"
              style={{ background: '#dc2626', borderColor: '#b91c1c', justifyContent: 'center' }}
              onClick={() => {
                setSimulatedScenario('failure');
                simulatePaymentHandoff();
              }}
              data-vc-target="simulate-payment-fail"
              disabled={isProcessingPayment}
            >
              ✕ Simulate Failure
            </button>

            <button
              className="btn-primary"
              style={{ background: '#d97706', borderColor: '#b45309', justifyContent: 'center' }}
              onClick={() => {
                setSimulatedScenario('pending');
                simulatePaymentHandoff();
              }}
              data-vc-target="simulate-payment-pending"
              disabled={isProcessingPayment}
            >
              ⏳ Simulate Pending
            </button>

            <button
              className="btn-secondary"
              style={{ background: '#475569', color: '#ffffff', justifyContent: 'center' }}
              onClick={() => {
                setSimulatedScenario('unconfirmed');
                simulatePaymentHandoff();
              }}
              data-vc-target="simulate-payment-unconfirmed"
              disabled={isProcessingPayment}
            >
              ❓ Simulate Unconfirmed
            </button>
          </div>

          {isProcessingPayment && (
            <div style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.95rem' }}>
              Connecting to simulated payment mock service...
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            <button
              className="btn-card-view"
              onClick={() => setCurrentPage('checkout_review')}
              disabled={isProcessingPayment}
            >
              ← Return to Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 6. ORDER RESULT SCREENS (Confirmed, Failed, Pending, Unconfirmed)
  // -------------------------------------------------------------
  if (currentPage === 'order_result' && activeOrder) {
    if (activeOrder.status === 'confirmed') {
      return (
        <div className="shop-container" data-vc-page="order-result" data-vc-state="confirmed">
          <div className="outcome-card">
            <div className="outcome-icon" style={{ color: '#16a34a' }}>🎉</div>
            <h1 className="outcome-title" style={{ color: '#16a34a' }}>
              Demonstration Order Confirmed!
            </h1>
            <p className="outcome-subtitle">
              Your simulated purchase has been completed. <strong>No real money was charged.</strong>
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Simulated Order ID:</span>
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{activeOrder.orderId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Simulated Amount:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{activeOrder.total.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Delivery Address:</span>
                <span style={{ fontSize: '0.85rem' }}>{activeOrder.address.name}, {activeOrder.address.city}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Delivery Window:</span>
                <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>{activeOrder.delivery.duration}</span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={resetToStore}
              data-vc-target="continue-shopping"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Continue Shopping on ShopSphere
            </button>
          </div>
        </div>
      );
    }

    if (activeOrder.status === 'failed') {
      return (
        <div className="shop-container" data-vc-page="order-result" data-vc-state="failed">
          <div className="outcome-card">
            <div className="outcome-icon" style={{ color: '#dc2626' }}>✕</div>
            <h1 className="outcome-title" style={{ color: '#dc2626' }}>
              Simulated Payment Failed
            </h1>
            <p className="outcome-subtitle">
              The test payment simulation was declined by the simulated mock issuer. <strong>No real money was deducted.</strong>
            </p>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', color: '#991b1b', fontSize: '0.9rem', marginBottom: '24px' }}>
              Simulated Error: Bank response timeout or insufficient funds in test wallet. You can safely retry or choose another simulated method.
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={retryFailedPayment}
                data-vc-target="retry-payment"
              >
                🔄 Retry Simulated Payment
              </button>
              <button className="btn-card-view" onClick={resetToStore}>
                Cancel & Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeOrder.status === 'pending') {
      return (
        <div className="shop-container" data-vc-page="order-result" data-vc-state="pending">
          <div className="outcome-card">
            <div className="outcome-icon" style={{ color: '#d97706' }}>⏳</div>
            <h1 className="outcome-title" style={{ color: '#d97706' }}>
              Simulated Payment Pending
            </h1>
            <p className="outcome-subtitle">
              The test transaction has been sent to the mock bank network and is currently pending verification.
            </p>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', color: '#92400e', fontSize: '0.9rem', marginBottom: '24px' }}>
              ⚠️ Safety Notice: Do NOT make a second payment while this simulated transaction is resolving. Recheck the status using the button below.
            </div>

            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              Tracking Transaction: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{activeOrder.simulatedTransactionId}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn-primary"
                onClick={recheckPendingStatus}
                data-vc-target="recheck-status"
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? 'Checking Status...' : '🔍 Check Payment Status Again'}
              </button>
              <button className="btn-card-view" onClick={resetToStore}>
                Return to Store
              </button>
            </div>
          </div>
        </div>
      );
    }

    // activeOrder.status === 'unconfirmed'
    return (
      <div className="shop-container" data-vc-page="order-result" data-vc-state="unconfirmed">
        <div className="outcome-card">
          <div className="outcome-icon" style={{ color: '#0284c7' }}>❓</div>
          <h1 className="outcome-title" style={{ color: '#0f172a' }}>
            Result Unconfirmed
          </h1>
          <p className="outcome-subtitle">
            The demonstration transaction outcome could not be reliably verified. It has not been marked as successful.
          </p>

          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px', color: '#0369a1', fontSize: '0.9rem', marginBottom: '24px' }}>
            In a real shopping journey, VoiceCheckout protects you by never assuming success when confirmation evidence is missing or ambiguous.
          </div>

          <button
            className="btn-primary"
            onClick={resetToStore}
            data-vc-target="continue-shopping"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Return to ShopSphere Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};
