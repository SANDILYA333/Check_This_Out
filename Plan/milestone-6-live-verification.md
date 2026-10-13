# VoiceCheckout — Milestone 6: Live-Session Verification and Testing Guide

> **Important Safety Notice**:
> VoiceCheckout is a strictly non-actuating guidance assistant. The user personally performs every checkout action.
> For testing purposes, **NEVER place a real purchase, submit a payment, enter payment credentials, or input private personal information**.
> All purchase-confirmation and payment-failure edge cases MUST be tested using deterministic synthetic fixtures or safe non-purchasing observation.
> **DO NOT capture, save, or report screenshots, DOM dumps, order numbers, credentials, or personal checkout information.**

---

## 1. Environment Preparation and Packaging

### 1.1 Prerequisites

- **Node.js**: v18.0.0 or higher (tested with Node.js v26.10.0).
- **Package Manager**: `npm` (bundled with Node.js).
- **Browser**: Google Chrome or Chromium (Manifest V3 compatible).
- **Operating System**: Linux, macOS, or Windows.

### 1.2 Local Build and Verification

Run the verification pipeline in the repository root:

```bash
# 1. Run the test suite (all unit and isolation suites)
npm run test

# 2. Verify TypeScript type safety
npm run typecheck

# 3. Compile the production extension bundle
npm run build
```

The production extension is emitted to the `dist/` directory:
- `dist/manifest.json`: Extension Manifest V3.
- `dist/popup.html` and `dist/assets/popup.js`: Extension action popup.
- `dist/assets/content.js`: Isolated content script bundle.
- `dist/icons/`: Icons (16, 32, 48, 128 px).
- `dist/audio/`: Bundled prerecorded MP3 assets for English (`en`), Hindi (`hi`), and Telugu (`te`).
- `dist/demo/index.html`: Controlled demo checkout store.

### 1.3 Loading the Unpacked Extension in Chrome

1. Open Google Chrome.
2. In the URL bar, navigate to `chrome://extensions`.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** in the top-left toolbar.
5. In the file picker, select the `dist/` directory inside this repository (`/path/to/Financial_Project/dist`).
6. Confirm that **VoiceCheckout** appears with version `0.1.0` and without any errors or manifest warnings.
7. Click the extension puzzle icon in Chrome toolbar and pin **VoiceCheckout**.

---

## 2. Safe Manual Testing Protocol

### 2.1 Test Track 1: Controlled Demo Verification (Baseline Safety)

Before testing any third-party website, verify that the controlled demo functions properly:

1. In Chrome, open a new tab and navigate to the built demo page:
   `chrome-extension://<EXTENSION_ID>/demo/index.html` (or open `http://localhost:5173/demo/index.html` if running a local dev server).
2. Click the **VoiceCheckout** extension icon in the toolbar.
3. Click **Start assistance**.
4. Confirm:
   - The assistant overlay mounts inside an isolated Shadow DOM container (`voicecheckout-assistant-root`).
   - The initial stage is `WELCOME`.
   - Audio prompt plays and speaker buttons allow language audio preview in Telugu, Hindi, and English.
   - Stepping through the stages (`ADDRESS` → `METHOD` → `REVIEW` → `UPI_SIMULATION`) highlights controls accurately.
   - Scenario selector demonstrates simulated `SUCCESS`, `FAILED`, and `PENDING` states without any real transaction.
5. Close the assistant and verify that all highlights and overlays are completely removed.

---

### 2.2 Test Track 2: Amazon.in Safe Page Detection & Guidance (Non-Purchasing)

> **Mandatory Rule**: Do NOT click "Place your order", authorize UPI payments, or enter credit card/CVV/OTP details during this test.

#### Step 1: Active Cart Page (`CART`)
1. Navigate to `https://www.amazon.in/gp/cart/view.html` (ensure at least 1 item is in cart).
2. Open the VoiceCheckout popup and click **Start assistance**.
3. **Verify**:
   - The assistant recognizes the page state as `CART` (Step 1 of 4).
   - The "Proceed to Buy" button is highlighted in high contrast.
   - The instruction text displays localized guidance in English, Hindi, or Telugu.
   - Clicking language switch buttons changes language immediately while preserving the step.

#### Step 2: Empty Cart Interruption (`EMPTY_CART`)
1. In an empty cart (`https://www.amazon.in/gp/cart/view.html` with 0 items), start assistance.
2. **Verify**:
   - The assistant identifies `PAUSED_EMPTY_CART`.
   - Explains that items must be added to proceed.
   - No buttons are highlighted.

#### Step 3: Delivery Address Selection (`ADDRESS_SELECTION`)
1. Manually click "Proceed to Buy" on Amazon (sign in if prompted).
2. When the address selection screen appears (`/gp/buy/addressselect`), observe VoiceCheckout:
   - Identifies `ADDRESS_SELECTION` (Step 2 of 4).
   - Highlights the verified "Deliver to this address" / "Use this address" button.
   - Does NOT automatically click the button.

#### Step 4: Payment Method Selection (`PAYMENT_SELECTION`)
1. Manually select an address and proceed to payment selection (`/gp/buy/payselect`).
2. **Verify**:
   - Identifies `PAYMENT_SELECTION` (Step 3 of 4).
   - Highlights the continue button (`input[value="Use this payment method"]`).
   - Does NOT select any payment radio button or read card details.

#### Step 5: Order Review Stage (`ORDER_REVIEW`)
1. Manually proceed to single-page review (`/gp/buy/spc`).
2. **Verify**:
   - Identifies `ORDER_REVIEW` (Step 4 of 4).
   - Highlights the "Place your order" button.
   - Assistant explicitly instructs the user to carefully verify order details directly on Amazon.
   - **STOP HERE**: Do NOT click "Place your order" for test purposes.

---

### 2.3 Test Track 3: Security & Challenge Gates

1. **Sign-in gate (`AUTH_REQUIRED`)**:
   - Navigate to `https://www.amazon.in/ap/signin`.
   - Open VoiceCheckout and start assistance.
   - **Verify**: Assistant identifies `PAUSED_AUTH_REQUIRED`. Does NOT inspect password or email fields. Instructs user to sign in manually.
2. **CAPTCHA / Security Challenge (`SECURITY_CHALLENGE`)**:
   - If an Amazon CAPTCHA page appears (`/errors/validatecaptcha`), verify that VoiceCheckout pauses and identifies `PAUSED_SECURITY_CHALLENGE`. Does not attempt to read or bypass the challenge.
3. **Unsupported Non-Checkout Pages (`UNSUPPORTED`)**:
   - Open `https://www.amazon.in` homepage or a product detail page.
   - Start assistance.
   - **Verify**: Reports unsupported page cleanly; does not inject highlights or interfere with page layout.

---

### 2.4 Test Track 4: Confirmation Evaluator (Synthetic Fixture Validation)

Because placing real purchases for testing violates project safety invariants, confirmation evaluation is validated via automated synthetic test suites:

Run the confirmation evaluator suite:
```bash
node --test tests/unit/amazonOrderConfirmation.test.ts
```

**Verifies that**:
1. Genuine confirmation containers (`#header-order-placed`, `[data-testid="order-placed-confirmation"]`, `#thankYouPage`) on `/gp/buy/thankyou` produce `CONFIRMED`.
2. Generic thank you wording alone without confirmation containers produces `UNCONFIRMED`.
3. An empty cart after submit produces `UNCONFIRMED` (`empty_cart_unconfirmed`).
4. Intermediate pending screen (`#upi-pending-view`) produces `PENDING` (never success).
5. Conflicting signals (confirmation marker + payment failed alert) produce `UNCONFIRMED`.
6. Zero calls are made to `mockPaymentService` during Amazon execution.

---

## 3. Results Recording Template

Use this template to record observations during testing:

| Test ID | Page Category / State | Method | Expected Result | Actual Result | Status (PASS / FAIL / NOT TESTED) | Non-Sensitive Notes |
|---|---|---|---|---|---|---|
| TC-01 | Controlled Demo (Cart to Finish) | Browser (Demo) | Steps through simulated checkout cleanly | As expected | PASS | Local demo test |
| TC-02 | Amazon Cart (Active) | Live Browser | Detects CART, highlights Proceed to Buy | Pending manual run | NOT TESTED | Requires live Chrome |
| TC-03 | Amazon Cart (Empty) | Live Browser | Detects EMPTY_CART, no target | Pending manual run | NOT TESTED | Requires live Chrome |
| TC-04 | Amazon Address Select | Live Browser | Detects ADDRESS_SELECTION, highlights continue | Pending manual run | NOT TESTED | Requires live Chrome |
| TC-05 | Amazon Payment Select | Live Browser | Detects PAYMENT_SELECTION, highlights continue | Pending manual run | NOT TESTED | Requires live Chrome |
| TC-06 | Amazon Order Review | Live Browser | Detects ORDER_REVIEW, highlights place-order | Pending manual run | NOT TESTED | Requires live Chrome |
| TC-07 | Amazon Sign-In Gate | Live Browser | Detects AUTH_REQUIRED, pauses safely | Pending manual run | NOT TESTED | Requires live Chrome |
| TC-08 | Amazon CAPTCHA Gate | Live Browser / Synthetic | Detects SECURITY_CHALLENGE, pauses safely | Verified in unit test | PASS | Synthetic DOM fixture |
| TC-09 | Non-checkout Amazon Page | Live Browser | Reports unsupported_page, zero interference | Pending manual run | NOT TESTED | Requires live Chrome |
| TC-10 | Order Confirmation (Valid) | Synthetic Fixture | Evaluates to CONFIRMED with evidence | Verified in unit test | PASS | `amazonOrderConfirmation.test.ts` |
| TC-11 | Order Confirmation (Missing Container) | Synthetic Fixture | Evaluates to UNCONFIRMED | Verified in unit test | PASS | `amazonOrderConfirmation.test.ts` |
| TC-12 | Intermediate Pending State | Synthetic Fixture | Evaluates to PENDING (never success) | Verified in unit test | PASS | `amazonOrderConfirmation.test.ts` |
| TC-13 | Payment Failure State | Synthetic Fixture | Evaluates to FAILED | Verified in unit test | PASS | `amazonOrderConfirmation.test.ts` |
| TC-14 | Demo Mock Payment Isolation | Synthetic / Spies | 0 calls to mockPaymentService | Verified in unit test | PASS | Complete isolation verified |
| TC-15 | Unpacked Chrome Manifest Check | Automated / Static | Manifest V3 valid, all resources present | Verified in unit test | PASS | `manifestPackaging.test.ts` |

---

## 4. Privacy and Confidentiality Rules

1. **NO SCREENSHOTS OF AMAZON CHECKOUT**: Never take, upload, or share screenshots of Amazon checkout, addresses, payment forms, or order details.
2. **NO ORDER IDs**: Never record or share order numbers (e.g., `402-XXXXXXX-XXXXXXX`).
3. **NO CREDENTIALS OR CODES**: Never share passwords, OTPs, PINs, card digits, or bank names.
4. **NO FULL HTML DUMPS**: Do not save raw DOM or full page HTML.
