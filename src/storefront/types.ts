export type ProductCategory =
  | 'all'
  | 'electronics'
  | 'kitchen'
  | 'fashion'
  | 'books'
  | 'fitness'
  | 'essentials';

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly category: ProductCategory;
  readonly price: number;
  readonly originalPrice: number;
  readonly rating: number;
  readonly reviewCount: number;
  readonly badge?: 'Bestseller' | 'Deal of the Day' | 'Top Rated';
  readonly description: string;
  readonly features: readonly string[];
  readonly inStock: boolean;
  readonly estimatedDelivery: string;
  readonly iconType: string;
}

export interface CartItem {
  readonly product: Product;
  readonly quantity: number;
}

export interface Address {
  readonly id: string;
  readonly name: string;
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly pincode: string;
  readonly phone: string;
  readonly isDefault: boolean;
  readonly deliveryInstructions?: string;
}

export type DeliveryMethodId = 'standard' | 'express';

export interface DeliveryOption {
  readonly id: DeliveryMethodId;
  readonly name: string;
  readonly duration: string;
  readonly fee: number;
}

export type PaymentMethodId = 'demo_upi' | 'demo_card' | 'demo_cod';

export interface PaymentMethodOption {
  readonly id: PaymentMethodId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
}

export type DemoPaymentOutcome =
  | 'success'
  | 'failure'
  | 'pending'
  | 'unconfirmed';

export interface Order {
  readonly orderId: string;
  readonly items: readonly CartItem[];
  readonly address: Address;
  readonly delivery: DeliveryOption;
  readonly paymentMethod: PaymentMethodOption;
  readonly subtotal: number;
  readonly discount: number;
  readonly deliveryFee: number;
  readonly total: number;
  readonly status: 'confirmed' | 'failed' | 'pending' | 'unconfirmed';
  readonly createdAt: string;
  readonly simulatedTransactionId: string;
}

export type StorePage =
  | 'landing'
  | 'product_detail'
  | 'cart'
  | 'checkout_address'
  | 'checkout_delivery'
  | 'checkout_payment'
  | 'checkout_review'
  | 'checkout_demo_payment'
  | 'order_result';

export type StoreLanguage = 'en' | 'hi' | 'te';
