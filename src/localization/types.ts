import type { Language } from '../guidance/types.ts';

export type { Language };

export type MessageKey =
  // General interface
  | 'assistant_title'
  | 'start_assistance'
  | 'close_assistance'
  | 'minimize_assistance'
  | 'expand_assistance'
  | 'back_button'
  | 'continue_button'
  | 'confirm_button'
  | 'selected_language'
  | 'replay_instruction'
  | 'audio_unavailable'
  | 'audio_playback_failed'
  | 'unsupported_page'
  | 'unexpected_page_state'
  | 'target_unavailable'
  | 'target_ambiguous'
  | 'target_disabled'
  | 'action_not_confirmed'
  | 'general_error'
  // Guidance stages
  | 'welcome_instruction'
  | 'language_instruction'
  | 'address_instruction'
  | 'address_change_instruction'
  | 'method_instruction'
  | 'review_instruction'
  | 'upi_simulation_instruction'
  | 'processing_instruction'
  | 'success_instruction'
  | 'failed_instruction'
  | 'pending_instruction'
  | 'retry_instruction'
  // Amazon guidance stages
  | 'amazon_cart_instruction'
  | 'amazon_address_instruction'
  | 'amazon_payment_instruction'
  | 'amazon_review_instruction'
  | 'amazon_empty_cart_instruction'
  | 'amazon_auth_instruction'
  | 'amazon_challenge_instruction'
  | 'amazon_waiting_update'
  | 'amazon_unverified_instruction'
  | 'amazon_outcome_confirmed'
  | 'amazon_outcome_unconfirmed'
  | 'amazon_outcome_pending'
  | 'amazon_outcome_failed'
  // Payment safety and recovery
  | 'status_check_error'
  | 'payment_unresolved'
  | 'order_creation_failed'
  | 'check_status_button'
  // Product and order information
  | 'product_name'
  | 'order_total_label'
  | 'order_total_value'
  | 'order_total_spoken'
  | 'address_preview'
  | 'demo_disclaimer'
  // Safety
  | 'upi_safety_warning'
  // Language names
  | 'lang_name_te'
  | 'lang_name_hi'
  | 'lang_name_en';

export type LocalizationDictionary = Record<MessageKey, string>;
