import type { LocalizationDictionary } from '../types.ts';

export const enDictionary: LocalizationDictionary = {
  // General interface
  assistant_title: 'VoiceCheckout',
  start_assistance: 'Start Assistance',
  close_assistance: 'Close Assistant',
  minimize_assistance: 'Minimize Assistant',
  expand_assistance: 'Expand Assistant',
  back_button: '← Back',
  continue_button: 'Continue →',
  confirm_button: 'Confirm',
  selected_language: 'Selected Language: English',
  replay_instruction: 'Listen / Replay',
  audio_unavailable: 'Audio prompt is currently unavailable.',
  audio_playback_failed: 'Audio playback failed. Please continue reading the on-screen instructions.',
  unsupported_page: 'This page is not supported by VoiceCheckout. VoiceCheckout only works on the controlled demo checkout page.',
  unexpected_page_state: 'The page state does not match the expected step. Please check the checkout page.',
  target_unavailable: 'Next control not found on page. Please check the checkout page.',
  target_ambiguous: 'Multiple matching controls found on page.',
  target_disabled: 'Next control is disabled. Please complete the previous required fields.',
  action_not_confirmed: 'Expected page change was not detected. Please verify your action.',
  general_error: 'An unexpected issue occurred. You can continue safely or close the assistant.',

  // Guidance stages
  welcome_instruction: 'Welcome to VoiceCheckout. I will guide you through your checkout step by step. Press start assistance to begin.',
  language_instruction: 'Choose your preferred language. You can listen to each language name before deciding. Then press continue.',
  address_instruction: 'Please verify your delivery address on the page, then click confirm address to continue.',
  address_change_instruction: 'Address change is simulated for this demo. Press back to return to address confirmation.',
  method_instruction: 'Select the simulated UPI payment option on the page, then click continue to review your order.',
  review_instruction: 'Review your order for the pressure cooker with total amount of one thousand four hundred ninety-nine rupees. Then click confirm order.',
  upi_simulation_instruction: 'This is a simulated UPI payment screen. Never tell anyone your PIN. Click confirm simulated payment to proceed.',
  processing_instruction: 'Your simulated payment is being processed. Please wait a moment while we check the status.',
  success_instruction: 'Simulated payment successful! Your demo order for the pressure cooker has been placed.',
  failed_instruction: 'Simulated payment failed. No money was deducted. You can click retry payment to try again safely.',
  pending_instruction: 'Simulated payment is currently pending. Please do not pay again while the status is being resolved.',
  retry_instruction: 'Click retry payment to return to payment method selection safely.',
  // Amazon guidance stages
  amazon_cart_instruction: 'Please review your cart on Amazon, then click Proceed to Buy to continue.',
  amazon_address_instruction: 'Please review and confirm your delivery address directly on Amazon.',
  amazon_payment_instruction: 'Please choose and review your payment method directly on Amazon, then continue.',
  amazon_review_instruction: 'Please carefully review your order details and total on Amazon before placing your order.',
  amazon_empty_cart_instruction: 'Your Amazon cart is empty. Please add items to your cart to proceed.',
  amazon_auth_instruction: 'Amazon requires you to sign in. Please complete sign-in on Amazon to continue.',
  amazon_challenge_instruction: 'Amazon requires security verification. Please complete the verification on Amazon.',
  amazon_waiting_update: 'Waiting for Amazon to update the page...',
  amazon_unverified_instruction: 'This page could not be verified by VoiceCheckout. Please check the page directly on Amazon.',
  amazon_outcome_confirmed: 'Your order has been placed and confirmed on Amazon. Thank you!',
  amazon_outcome_unconfirmed: "We couldn't verify whether Amazon completed your order. Please check the status directly on Amazon before taking any further action.",
  amazon_outcome_pending: 'Your order or payment is currently processing on Amazon. Please check your status directly on Amazon before trying again.',
  amazon_outcome_failed: 'Amazon indicated an issue completing your order. Please check your payment method or account on Amazon.',

  // ShopSphere guidance stages
  shopsphere_landing_instruction: 'Welcome! Browse the products and choose an item you would like to buy.',
  shopsphere_product_instruction: 'Review the product details, choose the quantity, and add it to your cart.',
  shopsphere_cart_instruction: 'Review your items and total, then continue to checkout when you are ready.',
  shopsphere_address_instruction: 'Select a demonstration delivery address or add a sample address to continue.',
  shopsphere_delivery_instruction: 'Choose your preferred demonstration delivery option.',
  shopsphere_payment_instruction: 'Choose a simulated payment method. No real payment will be made.',
  shopsphere_review_instruction: 'Review your items, delivery choice, payment method, and total before continuing.',
  shopsphere_demo_payment_instruction: 'This is a simulated payment. Choose a test outcome to continue.',
  shopsphere_confirmed_instruction: 'Your demonstration order is confirmed. No real purchase was made.',
  shopsphere_failed_instruction: 'The simulated payment failed. No real payment was made.',
  shopsphere_pending_instruction: 'The simulated result is pending. It has not been confirmed.',
  shopsphere_unconfirmed_instruction: 'The demonstration result could not be verified. It has not been marked as successful.',
  shopsphere_empty_cart_instruction: 'Your ShopSphere cart is empty. Add a product to your cart to begin checkout.',

  // Payment safety and recovery
  status_check_error: 'Unable to verify payment status. Please try checking again.',
  payment_unresolved: 'Payment status could not be verified. It remains unresolved.',
  order_creation_failed: 'Unable to create order. Please try again.',
  check_status_button: 'Check Status',

  // Product and order information
  product_name: 'Pressure Cooker 5L',
  order_total_label: 'Total Amount',
  order_total_value: '₹1,499',
  order_total_spoken: 'Total amount is one thousand four hundred ninety-nine rupees.',
  address_preview: 'Flat 402, Green Meadows, Bengaluru, 560001',
  demo_disclaimer: 'Demo simulated checkout only. No real payment will be charged.',

  // Safety
  upi_safety_warning: 'Never tell anyone your PIN.',

  // Language names
  lang_name_te: 'Telugu',
  lang_name_hi: 'Hindi',
  lang_name_en: 'English',
};
