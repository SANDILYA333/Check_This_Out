import React from 'react';
import { useStore } from '../context/StoreContext.tsx';

export const HeroSection: React.FC = () => {
  const { setSelectedCategory, setSearchQuery } = useStore();

  const handleHeroShopClick = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    const gridEl = document.getElementById('products-section');
    if (gridEl) {
      gridEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-banner" aria-label="Storefront Overview">
      <div className="hero-badge-tag">
        <span>✨</span>
        <span>VoiceCheckout Enabled Storefront</span>
      </div>

      <h1 className="hero-title">
        Experience Multilingual Assisted Checkout with Voice Guidance
      </h1>

      <p className="hero-subtitle">
        Welcome to ShopSphere, the controlled demonstration marketplace for VoiceCheckout. Browse authentic products, manage your cart, and experience step-by-step voice guidance in Telugu, Hindi, and English without any real charges.
      </p>

      <div className="hero-actions">
        <button
          className="btn-primary"
          onClick={handleHeroShopClick}
          data-vc-target="hero-shop"
        >
          <span>Explore Featured Products</span>
          <span>↓</span>
        </button>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#93c5fd' }}>
          <span>💡</span>
          <span>Click the VoiceCheckout extension icon to launch the voice assistant!</span>
        </div>
      </div>

      <div className="trust-badges">
        <div className="trust-badge-item">
          <span>🛡️</span>
          <span>100% Simulated Payment (No Real Charges)</span>
        </div>
        <div className="trust-badge-item">
          <span>🎙️</span>
          <span>Multilingual Guidance (Telugu, Hindi, English)</span>
        </div>
        <div className="trust-badge-item">
          <span>🎯</span>
          <span>Verified Non-Automated Target Highlighting</span>
        </div>
        <div className="trust-badge-item">
          <span>🔒</span>
          <span>Zero Credential Collection or Storage</span>
        </div>
      </div>
    </section>
  );
};
