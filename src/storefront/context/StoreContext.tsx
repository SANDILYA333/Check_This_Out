import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type {
  Product,
  CartItem,
  Address,
  DeliveryOption,
  PaymentMethodOption,
  DemoPaymentOutcome,
  Order,
  StorePage,
  StoreLanguage,
  ProductCategory,
} from '../types.ts';
import { PRODUCTS } from '../data/products.ts';
import { INITIAL_ADDRESSES, DELIVERY_OPTIONS, PAYMENT_METHODS } from '../data/addresses.ts';

export interface StoreContextType {
  // Navigation & Page State
  currentPage: StorePage;
  setCurrentPage: (page: StorePage) => void;
  selectedProductId: string | null;
  viewProductDetails: (productId: string) => void;

  // Language State
  language: StoreLanguage;
  setLanguage: (lang: StoreLanguage) => void;

  // Catalog, Search & Filter
  products: readonly Product[];
  selectedCategory: ProductCategory;
  setSelectedCategory: (cat: ProductCategory) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'featured' | 'price_asc' | 'price_desc' | 'rating_desc';
  setSortBy: (sort: 'featured' | 'price_asc' | 'price_desc' | 'rating_desc') => void;
  filteredProducts: Product[];

  // Cart State & Actions
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;

  // Order Financial Calculations
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;

  // Checkout Selections
  addresses: Address[];
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  addAddress: (addr: Omit<Address, 'id'>) => void;
  selectedDeliveryId: 'standard' | 'express';
  setSelectedDeliveryId: (id: 'standard' | 'express') => void;
  selectedPaymentId: string;
  setSelectedPaymentId: (id: string) => void;

  // Simulation Controls
  simulatedScenario: DemoPaymentOutcome;
  setSimulatedScenario: (scenario: DemoPaymentOutcome) => void;
  isProcessingPayment: boolean;
  activeOrder: Order | null;
  simulatePaymentHandoff: (outcomeOverride?: DemoPaymentOutcome) => Promise<void>;
  recheckPendingStatus: () => Promise<void>;
  retryFailedPayment: () => void;
  resetToStore: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

const CART_STORAGE_KEY = 'shopsphere_demo_cart_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [currentPage, setCurrentPage] = useState<StorePage>('landing');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Language
  const [language, setLanguageState] = useState<StoreLanguage>('en');

  // Simulation State & Active Order
  const [simulatedScenario, setSimulatedScenario] = useState<DemoPaymentOutcome>('success');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Search & Filter
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating_desc'>('featured');

  // Cart Initialization from storage
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fallback to initial
      }
    }
    // Default demo cart has 1 Pressure Cooker to align with the core hackathon demo
    const defaultProduct = PRODUCTS.find((p) => p.id === 'kit-1') || PRODUCTS[0];
    return [{ product: defaultProduct, quantity: 1 }];
  });

  // Save Cart
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch {
        // Ignore storage errors
      }
    }
  }, [cart]);

  // Sync language with document attributes & extension events
  const setLanguage = (lang: StoreLanguage) => {
    setLanguageState(lang);
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-vc-lang', lang);
      document.dispatchEvent(new CustomEvent('voicecheckout:set-language', { detail: { language: lang } }));
    }
  };


  useEffect(() => {
    if (typeof document !== 'undefined') {
      const handleNext = () => {
        if (currentPage === 'landing' || currentPage === 'product_detail') {
          setCurrentPage('cart');
        } else if (currentPage === 'cart') {
          setCurrentPage('checkout_address');
        } else if (currentPage === 'checkout_address') {
          setCurrentPage('checkout_delivery');
        } else if (currentPage === 'checkout_delivery') {
          setCurrentPage('checkout_payment');
        } else if (currentPage === 'checkout_payment') {
          setCurrentPage('checkout_review');
        } else if (currentPage === 'checkout_review') {
          setCurrentPage('checkout_demo_payment');
        }
      };

      const handlePrev = () => {
        if (currentPage === 'checkout_demo_payment') {
          setCurrentPage('checkout_review');
        } else if (currentPage === 'checkout_review') {
          setCurrentPage('checkout_payment');
        } else if (currentPage === 'checkout_payment') {
          setCurrentPage('checkout_delivery');
        } else if (currentPage === 'checkout_delivery') {
          setCurrentPage('checkout_address');
        } else if (currentPage === 'checkout_address') {
          setCurrentPage('cart');
        } else if (currentPage === 'cart') {
          setCurrentPage('landing');
        }
      };

      document.addEventListener('voicecheckout:next-step', handleNext);
      document.addEventListener('voicecheckout:prev-step', handlePrev);

      return () => {
        document.removeEventListener('voicecheckout:next-step', handleNext);
        document.removeEventListener('voicecheckout:prev-step', handlePrev);
      };
    }
  }, [currentPage]);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([...INITIAL_ADDRESSES]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(INITIAL_ADDRESSES[0].id);

  // Delivery & Payment
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<'standard' | 'express'>('standard');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('demo_upi');



  // Cart Operations
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        const newQty = Math.min(10, next[existingIndex].quantity + quantity);
        next[existingIndex] = { ...next[existingIndex], quantity: newQty };
        return next;
      }
      return [...prev, { product, quantity: Math.min(10, Math.max(1, quantity)) }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: Math.min(10, nextQty) } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Price Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const discount = useMemo(() => {
    // Demo discount: ₹100 off on carts >= ₹1,500
    return subtotal >= 1500 ? 100 : 0;
  }, [subtotal]);

  const selectedDeliveryOption = useMemo(() => {
    return DELIVERY_OPTIONS.find((d) => d.id === selectedDeliveryId) || DELIVERY_OPTIONS[0];
  }, [selectedDeliveryId]);

  const deliveryFee = useMemo(() => {
    if (cart.length === 0) return 0;
    if (selectedDeliveryId === 'standard' && subtotal >= 999) {
      return 0; // Free standard shipping on orders >= ₹999
    }
    return selectedDeliveryOption.fee;
  }, [selectedDeliveryId, subtotal, cart.length, selectedDeliveryOption]);

  const total = useMemo(() => {
    if (cart.length === 0) return 0;
    return Math.max(0, subtotal - discount + deliveryFee);
  }, [subtotal, discount, deliveryFee, cart.length]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-vc-store', 'shopsphere');
      document.body.setAttribute('data-vc-page', currentPage);
      document.body.setAttribute('data-vc-lang', language);
      document.body.setAttribute('data-vc-total', total.toString());
      if (currentPage === 'cart') {
        document.body.setAttribute('data-vc-state', cart.length === 0 ? 'empty' : 'active');
      } else if (currentPage === 'order_result') {
        document.body.setAttribute('data-vc-state', activeOrder?.status || 'confirmed');
      }
    }
  }, [currentPage, language, cart.length, activeOrder?.status, total]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let result = [...PRODUCTS];

    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating_desc') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [selectedCategory, searchQuery, sortBy]);

  // Product Navigation
  const viewProductDetails = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentPage('product_detail');
  };

  // Add Address
  const addAddress = (addr: Omit<Address, 'id'>) => {
    const newId = `addr-${Date.now()}`;
    const newAddr: Address = { ...addr, id: newId };
    setAddresses((prev) => [...prev, newAddr]);
    setSelectedAddressId(newId);
  };

  // Payment Simulation
  const simulatePaymentHandoff = async (outcomeOverride?: DemoPaymentOutcome) => {
    setIsProcessingPayment(true);
    setCurrentPage('checkout_demo_payment');

    const scenario = outcomeOverride ?? simulatedScenario;
    if (outcomeOverride) {
      setSimulatedScenario(outcomeOverride);
    }

    const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || addresses[0];
    const selectedPayment = PAYMENT_METHODS.find((p) => p.id === selectedPaymentId) || PAYMENT_METHODS[0];

    const orderId = `DEMO-ORD-${Date.now().toString().slice(-6)}`;
    const txId = `sim_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Deterministic simulation pause for realism (600ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    let orderStatus: 'confirmed' | 'failed' | 'pending' | 'unconfirmed' = 'confirmed';
    if (scenario === 'failure') {
      orderStatus = 'failed';
    } else if (scenario === 'pending') {
      orderStatus = 'pending';
    } else if (scenario === 'unconfirmed') {
      orderStatus = 'unconfirmed';
    }

    const order: Order = {
      orderId,
      items: [...cart],
      address: selectedAddress,
      delivery: selectedDeliveryOption,
      paymentMethod: selectedPayment,
      subtotal,
      discount,
      deliveryFee,
      total,
      status: orderStatus,
      createdAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      simulatedTransactionId: txId,
    };

    setActiveOrder(order);
    setIsProcessingPayment(false);
    setCurrentPage('order_result');

    // If order was confirmed, empty cart
    if (orderStatus === 'confirmed') {
      setCart([]);
    }
  };

  const recheckPendingStatus = async () => {
    if (!activeOrder) return;
    setIsProcessingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // When rechecking pending, resolve to success deterministically
    const resolvedOrder: Order = {
      ...activeOrder,
      status: 'confirmed',
    };
    setActiveOrder(resolvedOrder);
    setIsProcessingPayment(false);
    setCart([]);
  };

  const retryFailedPayment = () => {
    // Return to payment selection safely
    setCurrentPage('checkout_payment');
  };

  const resetToStore = () => {
    setActiveOrder(null);
    setCurrentPage('landing');
  };

  return (
    <StoreContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        selectedProductId,
        viewProductDetails,
        language,
        setLanguage,
        products: PRODUCTS,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        filteredProducts,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        subtotal,
        discount,
        deliveryFee,
        total,
        addresses,
        selectedAddressId,
        setSelectedAddressId,
        addAddress,
        selectedDeliveryId,
        setSelectedDeliveryId,
        selectedPaymentId,
        setSelectedPaymentId,
        simulatedScenario,
        setSimulatedScenario,
        isProcessingPayment,
        activeOrder,
        simulatePaymentHandoff,
        recheckPendingStatus,
        retryFailedPayment,
        resetToStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return ctx;
};
