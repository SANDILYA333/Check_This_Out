import type { Address, DeliveryOption, PaymentMethodOption } from '../types.ts';

export const INITIAL_ADDRESSES: readonly Address[] = [
  {
    id: 'addr-1',
    name: 'Ramesh Kumar (Demo Tester)',
    street: 'Flat 402, Shanti Heights, Road No. 12, Banjara Hills',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500034',
    phone: '+91 98765 43210',
    isDefault: true,
    deliveryInstructions: 'Leave package at front door with security if not available',
  },
  {
    id: 'addr-2',
    name: 'Priya Sharma (Synthetic Buyer)',
    street: 'House 18, 4th Cross, 7th Main, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    phone: '+91 98123 45678',
    isDefault: false,
    deliveryInstructions: 'Call before delivery between 9 AM and 5 PM',
  },
];

export const DELIVERY_OPTIONS: readonly DeliveryOption[] = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    duration: '3–5 business days',
    fee: 49,
  },
  {
    id: 'express',
    name: 'Express Delivery',
    duration: '1–2 business days',
    fee: 99,
  },
];

export const PAYMENT_METHODS: readonly PaymentMethodOption[] = [
  {
    id: 'demo_upi',
    name: 'Demo UPI (Google Pay / PhonePe / Paytm Simulation)',
    description: 'Instant simulated payment handoff. No real UPI PIN will ever be requested or shared.',
    icon: '📱',
  },
  {
    id: 'demo_card',
    name: 'Demo Debit / Credit Card Simulation',
    description: 'Pre-filled test card simulation. No real card number or CVV is collected.',
    icon: '💳',
  },
  {
    id: 'demo_cod',
    name: 'Cash on Delivery Simulation',
    description: 'Simulated payment upon delivery. Verification without online transaction.',
    icon: '💵',
  },
];
