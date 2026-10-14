# ShopSphere — VoiceCheckout Demo Storefront & Extension Integration Guide

## 1. Overview & Vision

**ShopSphere** is a modern, responsive Indian e-commerce marketplace storefront designed as the primary controlled demonstration environment for the **VoiceCheckout** Chrome Extension (Manifest V3).

The storefront provides an end-to-end shopping journey:
- Marketplace landing page with a hero banner explaining the VoiceCheckout interactive demo.
- Category filtering across Electronics, Home & Kitchen, Fashion, Books, Fitness, and Daily Essentials.
- Product search with instant case-insensitive keyword filtering and sorting (Price Low→High, Price High→Low, Customer Rating).
- Product cards with offline vector illustrations and synthetic reviews.
- Product details page with quantity selector, feature list, and delivery window estimates.
- Stateful shopping cart persisted to `localStorage` with subtotal, discount, delivery fee, and final total recalculation.
- Multi-stage checkout stepper: Address Selection (synthetic Indian demo addresses) → Delivery Options → Simulated Payment Selection → Order Review → Demo Payment Execution → Order Result.
- Deterministic simulated outcomes: Success, Failure, Pending, and Unconfirmed.

The **VoiceCheckout** extension integrates seamlessly with ShopSphere via a dedicated `SiteAdapter` (`shopsphere-demo`), mounting its Shadow DOM-isolated assistant to guide the user in English, Hindi, and Telugu with speech synthesis and bundled MP3 audio.

---

## 2. Architecture & Data Models

### 2.1 File Structure

```
src/
├── storefront/
│   ├── types.ts                    # Strongly typed domain models
│   ├── styles.css                  # Modern responsive CSS tokens & layout
│   ├── main.tsx                    # React DOM entry point
│   ├── ShopSphereApp.tsx           # Storefront root component & navigation
│   ├── data/
│   │   ├── products.ts             # Curated catalog (14 products)
│   │   └── addresses.ts            # Synthetic demo addresses, delivery & payment options
│   ├── context/
│   │   └── StoreContext.tsx        # Unified state provider (cart, filters, checkout)
│   └── components/
│       ├── Header.tsx              # Marketplace header (search, cart count, language)
│       ├── CategoryNav.tsx         # Category filter bar
│       ├── HeroSection.tsx         # Hero banner & demo explanation
│       ├── ProductCard.tsx         # Card with Add to Cart & View Details
│       ├── ProductDetailPage.tsx   # Detail view with quantity selector
│       ├── CartPage.tsx            # Full cart view with subtotal & item controls
│       ├── CheckoutFlow.tsx        # Multi-stage checkout stepper
│       └── ProductIcon.tsx         # Crisp offline SVG illustrations
├── content/
│   ├── adapters/
│   │   ├── shopsphereCheckoutAdapter.ts # SiteAdapter implementation for ShopSphere
│   │   └── pageAdapterRegistry.ts       # Registry resolving active adapter
│   └── assistant/
│       ├── ShopSphereAssistantApp.ts    # Shadow DOM assistant UI
│       ├── shopsphereGuidanceController.ts # State machine mapping to instructions
│       └── shopsphereActionObserver.ts  # Read-only mutation & action observer
shopsphere.html                     # Root HTML template for Vite
vite.store.config.ts                # Dedicated multi-bundle Vite config
```

### 2.2 Data Models (`src/storefront/types.ts`)

- **`Product`**: `id`, `name`, `category`, `price`, `originalPrice`, `rating`, `reviewCount`, `badge`, `description`, `features`, `inStock`, `estimatedDelivery`, `iconType`.
- **`CartItem`**: `product: Product`, `quantity: number`.
- **`Address`**: `id`, `name`, `street`, `city`, `state`, `pincode`, `phone`, `isDefault`, `deliveryInstructions`.
- **`DeliveryOption`**: `id: 'standard' | 'express'`, `name`, `duration`, `fee: number`.
- **`PaymentMethodOption`**: `id: 'demo_upi' | 'demo_card' | 'demo_cod'`, `name`, `description`, `icon`.
- **`OrderResult`**: `orderId`, `items`, `total`, `address`, `deliveryOption`, `paymentMethod`, `status: 'confirmed' | 'failed' | 'pending' | 'unconfirmed'`, `timestamp`.

---

## 3. Checkout Journey & State Transitions

The checkout experience follows six validated stages:

```
CART → ADDRESS → DELIVERY → PAYMENT → REVIEW → DEMO_PAYMENT → ORDER_RESULT
```

1. **CART**:
   - Lists added items with quantity increment, decrement, and item removal.
   - Shows line items, subtotal, demo discount (₹100 off on orders >= ₹1,500), delivery fee, and final total.
   - Target: `proceed-to-checkout` (`data-vc-target="proceed-to-checkout"`).
   - Invariant: Proceeding with an empty cart is prohibited.
2. **ADDRESS**:
   - Selects from synthetic demo addresses or adds a new synthetic address.
   - Target: `confirm-address` (`data-vc-target="confirm-address"`).
3. **DELIVERY**:
   - Chooses between Standard Delivery (₹49, free on orders >= ₹999) and Express Delivery (₹99).
   - Target: `confirm-delivery` (`data-vc-target="confirm-delivery"`).
4. **PAYMENT**:
   - Selects a simulated demo payment method: Demo UPI, Demo Card, or Simulated COD.
   - Zero real credentials collected; strictly demo choices.
   - Target: `confirm-payment-method` (`data-vc-target="confirm-payment-method"`).
5. **REVIEW**:
   - Comprehensive review of items, recipient address, delivery speed, payment method, and final bill.
   - Target: `confirm-order-review` (`data-vc-target="confirm-order-review"`).
6. **DEMO_PAYMENT**:
   - Interactive payment simulator with explicit scenario controls:
     - `simulate-payment-success`: Produces confirmed demo order (`ORD-DEMO-...`).
     - `simulate-payment-fail`: Produces simulated payment failure with safe retry.
     - `simulate-payment-pending`: Produces simulated pending outcome with re-check status.
     - `simulate-payment-unconfirmed`: Simulates verification ambiguity.
7. **ORDER_RESULT**:
   - Polished result view clearly explaining that no real financial transaction occurred.
   - Allows safe return to shopping or retrying failed payment.

---

## 4. Extension Integration & Target Highlighting

### 4.1 Adapter Detection & Isolation

- **Detection**: `ShopSphereCheckoutAdapter` inspects `doc.getElementById('shopsphere-root')` or `data-vc-store="shopsphere"` on `document.body`.
- **Isolation**:
  - `ShopSphereCheckoutAdapter.detectPage()` returns `false` on Amazon (`amazon.in` or `#nav-cart`).
  - `AmazonCheckoutAdapter.detectPage()` returns `false` on ShopSphere.
  - Zero shared payment coordinators; Amazon never touches demo mock payments.

### 4.2 Integration Markers (`data-vc-*`)

- `data-vc-store="shopsphere"`: Identifies the storefront.
- `data-vc-page`: Tracks current page (`landing`, `product_detail`, `cart`, `address`, `delivery`, `payment`, `review`, `demo_payment`, `order_result`).
- `data-vc-state`: Sub-state indicator (`empty`, `confirmed`, `failed`, `pending`, `unconfirmed`).
- `data-vc-lang`: Synchronizes language (`en`, `hi`, `te`).
- `data-vc-target`: Verified highlighting target elements:
  - `hero-shop`: Hero shopping CTA button.
  - `product-search`: Main product search input.
  - `add-to-cart`: Primary Add to Cart button on product detail.
  - `cart-button`: Header shopping cart button.
  - `proceed-to-checkout`: Cart page Proceed to Checkout CTA.
  - `confirm-address`: Confirm address button.
  - `confirm-delivery`: Confirm delivery option button.
  - `confirm-payment-method`: Confirm payment method button.
  - `confirm-order-review`: Place simulated order button.
  - `simulate-payment-success`: Simulate successful payment button.
  - `simulate-payment-fail`: Simulate failed payment button.
  - `simulate-payment-pending`: Simulate pending payment button.
  - `simulate-payment-unconfirmed`: Simulate unconfirmed payment button.
  - `continue-shopping`: Continue shopping button on result screens.
  - `retry-payment`: Retry button on failed payment screen.
  - `recheck-status`: Recheck status button on pending screen.

### 4.3 Highlighting Safety Invariant

The highlighter captures original host styles and restores them completely on clear. **Target lookup is strictly read-only and never invokes `.click()`, dispatches synthetic events, or mutates host DOM properties.**

---

## 5. Voice Guidance & Localization Coverage

### 5.1 Playback Hierarchy

1. **Bundled Neural MP3**: Checks `audioAssetResolver.resolveAudioUrl()`. ShopSphere prompts are mapped via `AUDIO_KEY_ALIASES` to existing high-quality neural MP3 assets in `public/audio/`.
2. **Browser `speechSynthesis` Fallback**: If an MP3 fails to load or is unbundled, browser speech synthesis speaks the exact localized text using regional BCP-47 tags (`en-IN`, `hi-IN`, `te-IN`).
3. **Graceful Fallback Display**: If speech synthesis is unsupported on the user's OS, visible localized text remains prominent with an audio-unavailable indicator.

### 5.2 Multilingual Guidance Matrix

| Guidance State | English Text | Hindi Text | Telugu Text | MP3 Available | Speech Fallback |
|---|---|---|---|---|---|
| **Landing** | Welcome! Browse the products and choose an item you would like to buy. | स्वागत है! उत्पादों को ब्राउज़ करें और वह वस्तु चुनें जिसे आप खरीदना चाहते हैं। | స్వాగతం! ఉత్పత్తులను బ్రౌజ్ చేయండి మరియు మీరు కొనాలనుకుంటున్న వస్తువును ఎంచుకోండి. | Yes (Alias) | Verified |
| **Product Detail** | Review the product details, choose the quantity, and add it to your cart. | उत्पाद विवरण की समीक्षा करें, मात्रा चुनें और इसे अपने कार्ट में जोड़ें। | ఉత్పత్తి వివరాలను సమీక్షించండి, పరిమాణాన్ని ఎంచుకోండి మరియు మీ కార్ట్‌కు జోడించండి. | Yes (Alias) | Verified |
| **Cart** | Review your items and total, then continue to checkout when you are ready. | अपने सामान और कुल राशि की समीक्षा करें, फिर तैयार होने पर चेकआउट जारी रखें। | మీ వస్తువులు మరియు మొత్తం మొత్తాన్ని సమీక్షించండి, సిద్ధంగా ఉన్నప్పుడు చెక్అవుట్‌కు వెళ్లండి. | Yes (Alias) | Verified |
| **Address** | Select a demonstration delivery address or add a sample address to continue. | जारी रखने के लिए एक डेमो डिलीवरी पता चुनें या एक नमूना पता जोड़ें। | కొనసాగించడానికి డెమో డెలివరీ చిరునామాను ఎంచుకోండి లేదా నమూనా చిరునామాను జోడించండి. | Yes (Alias) | Verified |
| **Delivery** | Choose your preferred demonstration delivery option. | अपनी पसंदीदा डेमो डिलीवरी विकल्प चुनें। | మీ ప్రాధాన్య డెమో డెలివరీ ఎంపికను ఎంచుకోండి. | Yes (Alias) | Verified |
| **Payment** | Choose a simulated payment method. No real payment will be made. | सिम्युलेटेड भुगतान विधि चुनें। कोई वास्तविक भुगतान नहीं किया जाएगा। | అనుకరణ చెల్లింపు పద్ధతిని ఎంచుకోండి. నిజమైన చెల్లింపు జరగదు. | Yes (Alias) | Verified |
| **Review** | Review your items, delivery choice, payment method, and total before continuing. | जारी रखने से पहले अपने सामान, डिलीवरी विकल्प, भुगतान विधि और कुल राशि की समीक्षा करें। | కొనసాగించే ముందు మీ వస్తువులు, డెలివరీ ఎంపిక, చెల్లింపు పద్ధతి మరియు మొత్తాన్ని సమీక్షించండి. | Yes (Alias) | Verified |
| **Demo Payment** | This is a simulated payment. Choose a test outcome to continue. | यह एक सिम्युलेटेड भुगतान है। जारी रखने के लिए एक परीक्षण परिणाम चुनें। | ఇది ఒక అనుకరణ చెల్లింపు. కొనసాగించడానికి పరీక్ష ఫలితాన్ని ఎంచుకోండి. | Yes (Alias) | Verified |
| **Confirmed** | Your demonstration order is confirmed. No real purchase was made. | आपका डेमो ऑर्डर कन्फर्म हो गया है। कोई वास्तविक खरीद नहीं की गई है। | మీ డెమో ఆర్డర్ ధృవీకరించబడింది. నిజమైన కొనుగోలు ఏదీ జరగలేదు. | Yes (Alias) | Verified |
| **Failed** | The simulated payment failed. No real payment was made. | सिम्युलेटेड भुगतान विफल रहा। कोई वास्तविक भुगतान नहीं किया गया। | అనుకరణ చెల్లింపు విఫలమైంది. నిజమైన చెల్లింపు జరగలేదు. | Yes (Alias) | Verified |
| **Pending** | The simulated result is pending. It has not been confirmed. | सिम्युलेटेड परिणाम लंबित है। इसकी पुष्टि नहीं हुई है। | అనుకరణ ఫలితం పెండింగ్‌లో ఉంది. ఇది ఇంకా ధృవీకరించబడలేదు. | Yes (Alias) | Verified |
| **Unconfirmed** | The demonstration result could not be verified. It has not been marked as successful. | डेमो परिणाम सत्यापित नहीं किया जा सका। इसे सफल के रूप में चिह्नित नहीं किया गया है। | డెమో ఫలితాన్ని ధృవీకరించలేకపోయాము. ఇది విజయవంతమైనదిగా గుర్తించబడలేదు. | Yes (Alias) | Verified |

---

## 6. How to Run and Test

### 6.1 Build the Extension and Storefront

```bash
# Clean, compile all bundles, and package manifest
npm run build

# Run typecheck
npm run typecheck

# Run full automated test suite (332 tests across 25 suites)
npm run test
```

### 6.2 Start the Storefront Locally

```bash
# Launch Vite preview or dev server
npm run preview
# OR
npm run dev
```

Open your browser to:
`http://localhost:5173/shopsphere.html` (or `http://localhost:4173/shopsphere.html` for preview).

### 6.3 Load Unpacked Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select the `dist/` directory from this project (`/home/kafka/Coding/Financial_Project/dist`).
5. Open `http://localhost:5173/shopsphere.html`.
6. Click the **VoiceCheckout** icon in the Chrome toolbar.
7. Click **Start Assistance**.
8. The floating assistant UI will appear in an isolated Shadow DOM on the storefront.
9. Follow the step-by-step guidance in English, Hindi, or Telugu through the full shopping journey!
