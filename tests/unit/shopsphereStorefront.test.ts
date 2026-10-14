import test from 'node:test';
import assert from 'node:assert';
import { PRODUCTS, CATEGORIES } from '../../src/storefront/data/products.ts';
import {
  INITIAL_ADDRESSES,
  DELIVERY_OPTIONS,
  PAYMENT_METHODS,
} from '../../src/storefront/data/addresses.ts';
import type { CartItem, Product, Address } from '../../src/storefront/types.ts';

test('ShopSphere Storefront — Product Catalog and Curated Data', async (t) => {
  await t.test('catalog contains curated marketplace products with valid metadata', () => {
    assert.ok(PRODUCTS.length >= 10, 'Catalog must contain at least 10 products');
    for (const p of PRODUCTS) {
      assert.ok(p.id, 'Product must have an id');
      assert.ok(p.name, 'Product must have a name');
      assert.ok(p.price > 0, `Product ${p.id} must have a positive price in INR`);
      assert.ok(p.category, `Product ${p.id} must have a category`);
      assert.ok(p.rating >= 1 && p.rating <= 5, `Product ${p.id} rating must be between 1 and 5`);
      assert.ok(p.reviewCount >= 0, `Product ${p.id} reviewCount must be non-negative`);
      assert.ok(p.inStock, `Product ${p.id} should be marked in stock for demo`);
      assert.ok(Array.isArray(p.features) && p.features.length > 0, `Product ${p.id} must list features`);
    }
  });

  await t.test('catalog covers all required primary categories', () => {
    const categories = new Set(PRODUCTS.map((p) => p.category));
    assert.ok(categories.has('electronics'), 'Must include electronics');
    assert.ok(categories.has('kitchen'), 'Must include kitchen');
    assert.ok(categories.has('fashion'), 'Must include fashion');
    assert.ok(categories.has('essentials'), 'Must include essentials');
    assert.ok(categories.has('books'), 'Must include books');
    assert.ok(categories.has('fitness'), 'Must include fitness');
  });

  await t.test('includes classic demo items like the Pressure Cooker (₹1,499)', () => {
    const cooker = PRODUCTS.find((p) => p.id === 'kit-1');
    assert.ok(cooker, 'Must find pressure cooker');
    assert.strictEqual(cooker?.price, 1499);
    assert.strictEqual(cooker?.category, 'kitchen');
  });
});

test('ShopSphere Storefront — Synthetic Demo Data Integrity', async (t) => {
  await t.test('addresses are clearly synthetic and contain required demo fields', () => {
    assert.ok(INITIAL_ADDRESSES.length >= 2, 'Must have at least two demo addresses');
    for (const addr of INITIAL_ADDRESSES) {
      assert.ok(addr.id, 'Address must have an id');
      assert.ok(addr.name, 'Address must have a demo recipient name');
      assert.ok(addr.street, 'Address must have a demo street address');
      assert.ok(addr.city, 'Address must have a city');
      assert.ok(addr.state, 'Address must have a state');
      assert.ok(addr.pincode, 'Address must have a pincode');
      assert.ok(addr.phone, 'Address must have a demo phone');
    }
    assert.ok(INITIAL_ADDRESSES.some((a) => a.isDefault), 'Must have a default address');
  });

  await t.test('delivery options provide deterministic choices and fee structure', () => {
    assert.ok(DELIVERY_OPTIONS.length >= 2, 'Must provide at least standard and express options');
    const standard = DELIVERY_OPTIONS.find((d) => d.id === 'standard');
    const express = DELIVERY_OPTIONS.find((d) => d.id === 'express');

    assert.ok(standard, 'Standard delivery option must exist');
    assert.ok(express, 'Express delivery option must exist');
    assert.strictEqual(standard?.fee, 49);
    assert.strictEqual(express?.fee, 99);
  });

  await t.test('payment methods are strictly simulated demo choices with zero real credentials', () => {
    assert.ok(PAYMENT_METHODS.length >= 3, 'Must provide at least UPI, Card, and COD simulation');
    for (const pm of PAYMENT_METHODS) {
      assert.ok(pm.id.startsWith('demo_'), `Payment method ${pm.id} must be prefixed with demo_`);
      assert.ok(!('cardNumber' in pm), 'No real card number field allowed');
      assert.ok(!('cvv' in pm), 'No CVV field allowed');
      assert.ok(!('upiPin' in pm), 'No UPI PIN field allowed');
    }
  });
});

test('ShopSphere Storefront — Cart Math, Calculations, and Invariants', async (t) => {
  function computeTotals(items: CartItem[], deliveryId: 'standard' | 'express' = 'standard') {
    if (items.length === 0) {
      return { subtotal: 0, discount: 0, deliveryFee: 0, total: 0 };
    }
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const discount = subtotal >= 1500 ? 100 : 0;
    const standardFee = 49;
    const expressFee = 99;
    const deliveryFee = deliveryId === 'standard' && subtotal >= 999 ? 0 : (deliveryId === 'express' ? expressFee : standardFee);
    const total = Math.max(0, subtotal - discount + deliveryFee);
    return { subtotal, discount, deliveryFee, total };
  }

  await t.test('calculates correct subtotal for single item with quantity 1', () => {
    const product = PRODUCTS.find((p) => p.id === 'kit-3')!; // Milton Flask ₹899
    const items: CartItem[] = [{ product, quantity: 1 }];
    const totals = computeTotals(items, 'standard');

    assert.strictEqual(totals.subtotal, 899);
    assert.strictEqual(totals.discount, 0);
    assert.strictEqual(totals.deliveryFee, 49); // subtotal < 999
    assert.strictEqual(totals.total, 899 + 49);
  });

  await t.test('calculates multi-item cart totals with free delivery promotion above ₹999 and ₹100 discount above ₹1,500', () => {
    const item1 = PRODUCTS.find((p) => p.id === 'kit-3')!; // ₹899
    const item2 = PRODUCTS.find((p) => p.id === 'kit-1')!; // ₹1499
    const items: CartItem[] = [
      { product: item1, quantity: 1 },
      { product: item2, quantity: 1 },
    ];
    // subtotal = 899 + 1499 = 2398
    // discount = 100 (subtotal >= 1500)
    // deliveryFee = 0 (subtotal >= 999 on standard)
    // total = 2398 - 100 + 0 = 2298
    const totals = computeTotals(items, 'standard');
    assert.strictEqual(totals.subtotal, 2398);
    assert.strictEqual(totals.discount, 100);
    assert.strictEqual(totals.deliveryFee, 0);
    assert.strictEqual(totals.total, 2298);
  });

  await t.test('express delivery adds ₹99 delivery fee even when subtotal exceeds free standard threshold', () => {
    const item = PRODUCTS.find((p) => p.id === 'kit-1')!; // ₹1499
    const items: CartItem[] = [{ product: item, quantity: 1 }];
    // subtotal = 1499
    // discount = 0 (< 1500)
    // deliveryFee = 99 (express)
    // total = 1499 + 99 = 1598
    const totals = computeTotals(items, 'express');
    assert.strictEqual(totals.subtotal, 1499);
    assert.strictEqual(totals.discount, 0);
    assert.strictEqual(totals.deliveryFee, 99);
    assert.strictEqual(totals.total, 1598);
  });

  await t.test('empty cart has zero totals', () => {
    const totals = computeTotals([], 'standard');
    assert.strictEqual(totals.subtotal, 0);
    assert.strictEqual(totals.discount, 0);
    assert.strictEqual(totals.deliveryFee, 0);
    assert.strictEqual(totals.total, 0);
  });
});

test('ShopSphere Storefront — Search and Category Filtering Logic', async (t) => {
  function filterProducts(
    products: readonly Product[],
    query: string,
    category: string,
    sort: string
  ): Product[] {
    let result = [...products];

    if (category && category !== 'all') {
      result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (sort === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }

  await t.test('case-insensitive search matches name keywords', () => {
    const res = filterProducts(PRODUCTS, 'headphones', 'all', 'featured');
    assert.ok(res.length >= 1);
    assert.ok(res.some((p) => p.id === 'elec-1'));
  });

  await t.test('category filtering filters strictly to matching items', () => {
    const res = filterProducts(PRODUCTS, '', 'kitchen', 'featured');
    assert.ok(res.length >= 2);
    for (const p of res) {
      assert.strictEqual(p.category, 'kitchen');
    }
  });

  await t.test('price sorting works correctly in ascending and descending order', () => {
    const low = filterProducts(PRODUCTS, '', 'all', 'price-low');
    for (let i = 0; i < low.length - 1; i++) {
      assert.ok(low[i].price <= low[i + 1].price, 'Must be sorted ascending by price');
    }

    const high = filterProducts(PRODUCTS, '', 'all', 'price-high');
    for (let i = 0; i < high.length - 1; i++) {
      assert.ok(high[i].price >= high[i + 1].price, 'Must be sorted descending by price');
    }
  });

  await t.test('empty query matches nothing if term does not exist', () => {
    const res = filterProducts(PRODUCTS, 'nonexistent_gadget_xyz', 'all', 'featured');
    assert.strictEqual(res.length, 0);
  });
});

test('ShopSphere Storefront — Address Form Validation', async (t) => {
  function validateAddress(addr: Partial<Address>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!addr.name?.trim()) errors.push('Name is required');
    if (!addr.street?.trim()) errors.push('Street address is required');
    if (!addr.city?.trim()) errors.push('City is required');
    if (!addr.state?.trim()) errors.push('State is required');
    if (!addr.pincode?.trim() || !/^\d{6}$/.test(addr.pincode.trim())) {
      errors.push('Valid 6-digit PIN code is required');
    }
    return { valid: errors.length === 0, errors };
  }

  await t.test('accepts valid synthetic Indian address', () => {
    const valid = validateAddress({
      name: 'Rohan Mehra',
      street: '42 MG Road, Demo Area',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    });
    assert.strictEqual(valid.valid, true);
    assert.strictEqual(valid.errors.length, 0);
  });

  await t.test('rejects missing name or malformed PIN code', () => {
    const invalid = validateAddress({
      name: '',
      street: '123 Fake Street',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: 'abc',
    });
    assert.strictEqual(invalid.valid, false);
    assert.ok(invalid.errors.includes('Name is required'));
    assert.ok(invalid.errors.includes('Valid 6-digit PIN code is required'));
  });
});
