# VoiceCheckout — Project Overview

> **Status:** Scope locked for the hackathon prototype. This document describes the agreed target, not proof that the extension has already been implemented.
>
> **Product direction:** Chrome browser extension for multilingual, voice-guided checkout assistance. This supersedes the earlier standalone mobile-first web-app direction.

## 1. Overview

VoiceCheckout is a Chrome extension designed to help people with limited digital literacy understand and navigate online checkout pages. When the user explicitly opens the extension on a supported checkout page, it presents a clear on-page assistant that explains the current step in Telugu, Hindi, or English, highlights the next relevant control, and provides prerecorded spoken guidance. The user remains in control and performs every meaningful checkout action. The six-hour hackathon prototype will prioritize a controlled checkout page that the team owns, so the experience can be demonstrated reliably without depending on arbitrary retailers' changing page structures. Payment is simulated only; the extension must never request or collect a real UPI PIN, OTP, password, card number, or banking credential.

## 2. Problem

Conventional checkout interfaces often assume that users can comfortably read dense text, recognize unfamiliar payment terminology, find the correct field or button, and understand delayed or failed transaction states. This creates avoidable confusion for first-time digital shoppers and people who prefer spoken guidance in their language.

VoiceCheckout addresses this by combining:
- Short, localized instructions.
- Prerecorded audio that the user can replay.
- A visible assistant panel and contextual highlights.
- Large, explicit controls.
- Step-by-step guidance that waits for user action.
- Clear, safe messaging around simulated payment status.

This is a guidance tool, not an autonomous shopping or payment agent.

## 3. Target User and Demonstration Scenario

### Illustrative user

A shopper who is more comfortable speaking Telugu or Hindi than navigating text-heavy checkout pages, and who benefits from explicit instructions and visual cues. This is a design persona, not validated user research.

### Controlled demo scenario

- A local or otherwise controlled demo store/checkout page owned by the project team.
- One demo product: a pressure cooker.
- Fixed total: **₹1,499**.
- Languages: Telugu (`te`), Hindi (`hi`), and English (`en`).
- Payment method: simulated UPI flow only.
- Results: success, failed, and pending.
- The extension highlights controls and explains the next step; the user clicks and confirms actions themselves.

The demo address, if one is shown, must be clearly fictional and must not be presented as verified personal information.

## 4. Goals

1. A first-time tester can open the extension on the controlled demo checkout and reach the final simulated result without needing verbal coaching from the developer.
2. A user can choose Telugu, Hindi, or English and hear a language-name prompt before selecting a language.
3. Every core checkout step has short visible instructions and a corresponding prerecorded audio instruction in all three languages, or a documented limitation if a reviewed asset is not ready.
4. The extension can identify and highlight the next expected control on the controlled demo page without automatically activating it.
5. The prototype demonstrates success, failed, and pending states without initiating a real payment.
6. Pending status is never represented as success and includes guidance not to pay again while the status remains unresolved.
7. No real payment credential is requested, read, logged, or stored.
8. The extension can be loaded unpacked in Chrome and demonstrated using the documented setup instructions.
9. The overlay remains usable at a 360px-wide viewport and does not permanently alter the host page after being closed.
10. The core implementation fits the six-hour timebox, prioritizing reliable behavior over broad site compatibility or decorative polish.

## 5. Core User Flow

1. The user opens the team's controlled demo store in Chrome.
2. The user clicks the VoiceCheckout extension icon. The extension does not begin interacting with the page before the user invokes it.
3. The popup presents the purpose of the assistant and a clear action to start guidance on the current supported page.
4. The user selects Telugu, Hindi, or English. Each language option has a speaker control that plays the language name before selection.
5. The extension verifies that the current page is a supported demo checkout. If it is not, the popup explains the limitation and does not pretend that generic support is available.
6. The content script mounts an isolated assistant overlay and begins at the first relevant checkout step.
7. The assistant explains the current step using visible text and a replayable prerecorded audio prompt.
8. The extension highlights the relevant control, but the user performs the action.
9. The extension observes the expected page state and advances only when the user action or supported state change is verified.
10. The user reviews the demo product and fixed total of ₹1,499.
11. The extension displays and speaks a safety warning: **“Never tell anyone your PIN.”** No PIN field is created by VoiceCheckout.
12. The user confirms the simulated handoff. The demo payment service returns success, failed, or pending according to the selected test scenario.
13. The assistant displays the truthful result and an appropriate next action.
14. The user can close the assistant. Closing it removes the overlay and temporary highlights without breaking the host page.

## 6. Features

### 6.1 Extension Shell

- Chrome Extension Manifest V3.
- A small React + TypeScript popup.
- Explicit user action to start guidance on the current tab.
- Clear unsupported-page and permission-error messaging.
- Minimal permissions and no broad host access unless a documented implementation requirement justifies it.

### 6.2 On-Page Guidance Overlay

- Assistant panel rendered by a content script.
- Isolated styling, preferably using Shadow DOM, to reduce conflicts with host-page CSS.
- Short step title, plain-language instruction, primary next action, Back where safe, and Replay audio.
- A contextual outline/highlight and pointer/arrow for the next relevant control where the target can be identified reliably.
- A close control that removes the extension UI and restores any temporary page modifications.
- No automatic clicks, form submission, or payment actions.

### 6.3 Language and Audio

- Exactly three languages in this version: Telugu, Hindi, English.
- Aligned typed message dictionaries.
- Bundled prerecorded MP3 assets; no live TTS requirement at runtime.
- A speaker affordance beside each language name before language selection.
- Replay control for current instructions.
- Audio errors fall back to visible text and must never block progression.
- Best-effort preload of selected-language audio without blocking navigation.
- Fixed reviewed wording for ₹1,499; no untested runtime number-to-words conversion.

### 6.4 Checkout-Step Detection

- Start with deterministic selectors and state markers on the team's controlled demo checkout.
- Use a `MutationObserver` only where dynamic page updates require it; disconnect observers when the assistant closes or the flow ends.
- Validate that the expected target exists and is visible before highlighting it.
- If a target is missing or ambiguous, explain that the step could not be detected and offer a safe manual continuation or restart. Never highlight a guessed control.
- Generic support for arbitrary third-party retailers is not promised in the six-hour MVP.

### 6.5 Simulated Payment and Recovery

- One fixed product and ₹1,499 total.
- Simulated UPI only.
- Distinct success, failed, and pending outcomes.
- Pending checks reuse the same transaction identifier.
- No new transaction is created just because status is pending.
- Retry is offered only after a confirmed failed result.
- Unknown or errored status is unresolved, never success.
- A demo-only control can select the result scenario for judging.

### 6.6 Accessibility and Usability

- Large, high-contrast controls with text labels.
- Keyboard-visible focus and logical focus order.
- Readable Telugu and Devanagari font fallbacks.
- Do not rely on color alone for status.
- Overlay is usable at 360px width without horizontal overflow.
- The extension does not trap focus or prevent the user from interacting with the page.
- Audio is user-initiated or explicitly replayed, respecting browser autoplay restrictions.

## 7. Scope

### In Scope

- Chrome Extension Manifest V3 prototype.
- React + TypeScript + Vite extension UI, subject to repository compatibility.
- Popup to start/stop assistance on the current tab.
- Controlled demo checkout page owned by the team.
- Content-script overlay, contextual highlight, and step-by-step guidance.
- Telugu, Hindi, and English visible copy.
- Prerecorded bundled MP3 audio.
- Deterministic checkout-state detection for the controlled demo.
- Simulated UPI flow and success/failed/pending states.
- Demo controls for selecting outcome scenarios.
- Safe handling of missing targets, audio failures, and unresolved payment status.
- Responsive and accessibility checks.
- Loading the unpacked extension in Chrome and documenting installation/demo steps.

### Out of Scope

- Standalone mobile application, APK, or app-store release.
- Universal compatibility with every e-commerce site.
- Browser automation that clicks buttons, fills checkout fields, or submits orders on the user's behalf.
- Autonomous checkout or payment agent.
- Real payment processing or actual UPI app handoff.
- Collection or storage of PINs, OTPs, passwords, card data, bank credentials, or other secrets.
- Backend, database, authentication, account system, analytics, or order history.
- LLM calls, runtime translation, voice input, microphone permissions, or speech recognition.
- More than the three agreed languages.
- Full shopping cart, multiple products, coupon engine, tax engine, or complete address editor.
- Broad persistent host permissions without an explicit requirement and review.
- Production certification or claims of universal accessibility.
- Pitch preparation as an implementation phase; the timebox is for building and verifying the working prototype.

## 8. Technical Direction

Intended stack:
- Chrome Extension Manifest V3.
- React + TypeScript + Vite.
- CRXJS or a compatible extension build integration, only after checking current dependencies and versions.
- Content scripts for page integration.
- Shadow DOM for overlay isolation.
- Plain CSS or existing styling system for overlay styles; Tailwind may be used if the existing setup supports it cleanly.
- Bundled MP3 assets.
- Local deterministic mock payment service.
- No required backend.

The actual repository and package configuration must be inspected before installing packages, changing the manifest, or replacing build configuration.

## 9. Six-Hour Coding Plan

| Phase | Budget | Acceptance target |
|---|---:|---|
| 0. Extension Foundation | 30 min | Manifest V3, popup build, content-script entry, controlled demo page scaffold |
| 1. Guidance Engine | 45 min | Typed stage model, deterministic page-state/target detection, safe transitions |
| 2. On-Page Assistant | 105 min | Shadow DOM overlay, highlights, navigation, close/cleanup behavior |
| 3. Voice and Localization | 60 min | Three dictionaries, speaker controls, bundled essential MP3s |
| 4. State Verification and Safety | 45 min | Simulated outcomes, pending recovery, permission/target/audio failure handling |
| 5. Integration and Demonstration | 75 min | Build, load unpacked in Chrome, test the full controlled scenario, document limitations |
| **Total** | **360 min** | **A working extension prototype that can be demonstrated reliably** |

The schedule is aggressive. If time is lost, cut visual polish and broad-site detection before cutting the PIN warning, pending-state integrity, overlay cleanup, or the three primary result paths.

## 10. Success Criteria

1. The extension builds successfully with the repository's documented build command.
2. It can be loaded unpacked in Chrome using documented steps.
3. Clicking the extension icon does not modify a page until the user explicitly starts assistance.
4. The controlled demo checkout is recognized; an unsupported page receives an honest message.
5. Language selection supports Telugu, Hindi, and English; language-name audio is available where assets have been generated.
6. Each implemented core step has visible guidance and replayable audio or a clearly documented asset limitation.
7. The assistant highlights only verified, visible targets on the controlled page.
8. The extension never automatically clicks, submits, pays, or enters credentials.
9. The fixed amount is consistently ₹1,499 in the visible UI and spoken assets.
10. The mock service can demonstrate success, failed, and pending.
11. Pending remains pending until the mock service returns a resolved status; it never implies success and never creates a new transaction just to check status.
12. Failed-state retry returns to the specified safe path and creates a fresh mock transaction only after the user confirms review again.
13. Closing the assistant removes its overlay, highlights, and observers without leaving broken page styling or listeners.
14. The assistant works at 360px width without horizontal overflow.
15. No real payment credential is requested, read, logged, or stored.
16. Actual verification results and known limitations are recorded in `progress-tracker.md`.

## 11. Source-of-Truth Rules

- `project-overview.md` defines the product goals and scope.
- `architecture.md` is the canonical source for extension boundaries, manifest/permission principles, stage transitions, page detection, payment behavior, and invariants.
- `code-standards.md` defines implementation conventions.
- `ai-workflow-rules.md` defines how AI-assisted work is scoped and verified.
- `progress-tracker.md` records actual progress and current truth.
- If these documents conflict, do not silently choose one. Resolve the contradiction in the appropriate document and update related references before coding.
