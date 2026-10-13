# Code Standards — VoiceCheckout Extension

These standards apply to the six-hour Chrome extension prototype. Prefer simple, explicit code that can be understood and verified quickly. Preserve an existing working repository structure where possible.

## 1. General Principles

- Keep modules small and single-purpose.
- Fix root causes rather than layering temporary workarounds.
- Keep popup UI, content-script page integration, guidance state, localization/audio, and mock payment logic separate.
- Avoid a monolithic `App.tsx`, `content.ts`, or popup component.
- Prefer explicit types and deterministic behavior over clever abstractions.
- Do not introduce dependencies without inspecting the existing package configuration and confirming that the dependency saves more time than it costs.
- Do not overwrite existing configuration before reading it.
- Do not edit `node_modules` or third-party library internals.
- Do not claim a feature works until it has been run or otherwise verified.
- Use comments for non-obvious browser/extension constraints and safety decisions, not to narrate every line.
- Do not implement behavior that conflicts with `architecture.md`.

## 2. TypeScript

- Keep TypeScript strict mode enabled where the existing scaffold permits it.
- Avoid `any`; use explicit interfaces, discriminated unions, and `unknown` at untrusted boundaries.
- Define a shared `Language` union:
  ```ts
  type Language = "te" | "hi" | "en";
  ```
- Define a typed checkout stage union and payment status union.
- Keep message keys typed so a missing translation key is caught at compile time where practical.
- Use explicit return types for core state-machine and payment-service functions.
- Validate data arriving through runtime message passing between popup and content script. Treat message payloads as untrusted even if the sender is part of the extension.
- Narrow unknown values before using them.
- Avoid type assertions that merely silence errors without validating the value.
- Keep browser API types compatible with the installed TypeScript/browser type packages.
- Do not use `@ts-ignore` to force a build without explaining and containing the issue.

## 3. Chrome Extension / Manifest V3

- Use Manifest V3.
- Declare only the extension entry points and permissions actually needed.
- Prefer user-invoked access to the active tab over broad host permissions for the controlled demo.
- Do not request `<all_urls>` by default.
- Do not add permissions just in case.
- Keep manifest source and generated build manifest synchronized according to the selected build tool.
- Do not place secrets or credentials in the manifest or bundled source.
- Treat extension messages as runtime input: validate message type and payload.
- Do not assume the popup remains open after sending a message.
- Handle missing tab IDs, unsupported URLs, restricted pages, and failed script injection.
- Do not use a background service worker unless a concrete need exists; if one is required, keep it small and respect its lifecycle.
- Document why every requested permission is needed.
- Never inject into browser-internal pages or unsupported origins.

## 4. React and Component Design

- Use React for the popup and assistant overlay if the existing build supports both cleanly.
- Keep popup-specific state separate from page/checkout state where practical.
- Make the content-script mount/unmount lifecycle explicit.
- Do not mount multiple overlay roots on repeated activation.
- Use a small component API with typed props.
- Keep the stage-to-copy mapping out of presentation components.
- Do not let a component directly decide payment success; render the result returned by the mock service.
- Use stable keys when rendering lists.
- Handle async work and component unmounts so stale results do not update a closed assistant.
- Keep user-visible errors localized where feasible.

## 5. Content Script and DOM Interaction

- Limit guaranteed support to the team's controlled demo checkout in the MVP.
- Prefer stable `data-voicecheckout` or `data-testid` attributes on a page the team owns.
- Keep selectors in a page adapter/selector module instead of scattering them through UI components.
- Before highlighting a target, verify that it exists, is connected, visible, and unambiguous.
- Never automatically click the target or submit a form.
- Never read sensitive credential values.
- Do not use arbitrary text matching as the sole proof that a page is in a particular payment state.
- Avoid changing the host page's DOM except to mount the overlay and apply a temporary highlight.
- If a temporary style is applied, save and restore the prior value.
- Scope event listeners and observers to the active assistant session.
- Disconnect `MutationObserver` on close, unmount, or terminal cleanup.
- Avoid polling when a scoped observer or explicit user action is sufficient.
- Handle dynamic DOM replacement and stale target references.
- Do not assume a selector match means the control is enabled.
- If the target is missing or ambiguous, pause guidance and explain the issue.

## 6. Shadow DOM and Overlay Styling

- Prefer a Shadow DOM root to isolate the assistant from host-page CSS.
- Namespace all styles and avoid styling `body`, `html`, or generic host-page selectors.
- Do not permanently change host-page layout.
- Ensure the overlay has a visible close button and does not trap the user.
- Ensure overlay z-index and placement work on the controlled demo page without covering essential context unnecessarily.
- Use responsive sizing with a 360px viewport as the baseline.
- Use readable line lengths, clear spacing, and large buttons.
- Use visible keyboard focus.
- Do not rely on color alone to distinguish success, failure, and pending.
- Respect reduced-motion preferences if animations are included.
- Avoid unnecessary animation; correctness and clarity take priority.

## 7. Localization

- Support exactly `te`, `hi`, and `en` in the MVP.
- Keep message dictionaries aligned to the same required keys.
- Use a shared type/schema to detect missing keys.
- Keep sentences short and action-oriented.
- Avoid ambiguous instructions such as “Proceed” without explaining what will happen.
- Use consistent terminology for amount, address, review, payment, success, failed, and pending.
- Do not claim Telugu/Hindi copy is professionally reviewed unless it has been.
- Record translation review status in `progress-tracker.md`.
- Keep the product total fixed at ₹1,499 across all language variants.
- Use fixed reviewed audio wording for the amount; do not rely on unverified runtime number conversion.
- Include an accurate localized equivalent of “Never tell anyone your PIN” on the UPI simulation screen.
- Language switching must not reset the current checkout stage or transaction state.

## 8. Audio

- Use bundled prerecorded MP3 files; no runtime TTS dependency.
- Keep the canonical source asset convention:
  `public/audio/{lang}/{messageKey}.mp3`
- Adjust final asset URLs to the build output as needed, but document any transformation.
- Catch rejected `play()` promises and missing asset errors.
- Keep visible instructions available when audio is unavailable.
- Audio playback must not block navigation.
- Best-effort preload selected-language audio after a user chooses a language.
- Do not rely on autoplay; provide explicit speaker/replay controls.
- Stop or clean up playback when appropriate during close/unmount/language changes.
- Include audio for language names where available.
- If an asset is missing, do not silently play a different language's audio.

## 9. State Machine and Navigation

- Centralize allowed stage transitions in `engine/machine.ts` or an equivalent module.
- Keep UI components from inventing their own transitions.
- Make invalid transitions explicit and testable.
- Separate checkout stage from payment status.
- Do not allow a language switch to reset stage or transaction ID.
- Create a mock order only when the user confirms `REVIEW`.
- `createOrder()` returns a transaction ID only.
- Query status only after the simulated handoff confirmation moves the flow to `PROCESSING`.
- Do not create a new order for a pending status check.
- Retry only after confirmed failure.
- Do not expose ordinary back navigation from processing/result states if it can erase or bypass the result.
- Success requires a `success` response from the mock service.

## 10. Mock Payment Service

- Keep the mock service independent from React components.
- Use a typed status union: `"success" | "failed" | "pending"`.
- Make outcome scenarios deterministic and easy to reproduce.
- Default behavior: first check pending, second check success for the same transaction.
- Support immediate success, immediate failed, pending-to-success, pending-to-failed, and stays-pending scenarios if time permits.
- Keep status-check counts keyed by transaction ID.
- Validate transaction IDs and handle unknown IDs as unresolved errors, not success.
- Prevent duplicate order creation from repeated confirmation.
- Do not call a real payment API.
- Do not collect or store payment credentials.
- Clearly label all payment behavior as simulated.

## 11. Accessibility and UX

- Target a 360px-wide viewport.
- Aim for interactive targets at least 48 CSS px high.
- Provide visible labels and accessible names.
- Use semantic buttons and controls.
- Provide visible focus and logical focus order.
- Do not rely on icons alone.
- Use font fallbacks that render Telugu and Devanagari correctly.
- Ensure the assistant can be closed with pointer and keyboard.
- Avoid trapping focus in the overlay.
- Announce important state changes accessibly where practical.
- Make errors actionable and non-alarming.
- The extension should not prevent the user from using the underlying page normally.

## 12. Security and Privacy

- Never request, read, log, transmit, or store a real PIN, OTP, password, card number, bank credential, or other payment secret.
- Do not inspect values of password or payment credential fields.
- Do not send page DOM or checkout data to a remote server.
- No analytics or telemetry in the MVP.
- Do not store page content, user identity, or transaction details persistently without an explicit scope decision.
- Do not claim to verify real payment completion.
- Treat page DOM and runtime messages as untrusted.
- Keep permissions minimal.
- Do not add remote executable code or remote scripts.
- Do not use an LLM to inspect or control checkout pages.

## 13. Error Handling

- Catch errors at browser API, audio playback, DOM target detection, message passing, and mock status boundaries.
- Present a useful visible error rather than silently swallowing critical failures.
- Do not turn an error into a success state.
- Unsupported pages should receive an honest unsupported-page message.
- Missing or ambiguous target: pause and explain; never guess.
- Failed injection: keep popup responsive and show how to retry.
- Closed/unmounted UI: ignore stale async results safely.
- Missing audio: retain visible guidance.
- Status lookup failure: unresolved state with safe recheck where appropriate.
- Cleanup must run even when an intermediate step throws.

## 14. Testing and Verification

Before declaring a feature complete:
- Run the actual relevant typecheck/build/test scripts found in `package.json`.
- Load the extension unpacked in Chrome.
- Verify popup start/stop behavior.
- Verify unsupported-page behavior.
- Verify overlay mount, repeat activation, close, and cleanup.
- Verify target highlighting and dynamic target disappearance.
- Verify language switching and audio fallback.
- Verify success, failed, pending, and pending resolution.
- Verify pending checks use the same transaction ID.
- Verify failed retry creates a fresh transaction only after review confirmation.
- Verify no automatic click/form submission occurs.
- Verify no credential fields are read or logged.
- Verify 360px layout and keyboard focus.
- Record commands and actual outcomes in `progress-tracker.md`.

## 15. Suggested File Organization

Adapt to the existing repository; these names are illustrative.

- `src/popup/` — extension popup and start/stop/unsupported-page UI.
- `src/content/` — content-script entry, overlay mount lifecycle, page adapter.
- `src/engine/` — typed stages, transitions, selectors and detection rules.
- `src/i18n/` — aligned English, Hindi, and Telugu dictionaries.
- `src/audio/` — playback and preload service.
- `src/services/` — mock payment implementation.
- `src/shared/` — shared types and validated message contracts.
- `public/audio/` — bundled MP3 source assets.
- `scripts/` — development-time audio generation only.
- `manifest.json` or equivalent — Manifest V3 source.
- `README.md` — setup, permissions, load-unpacked instructions, demo flow, known limitations.

Do not force this structure if the existing build system needs a different layout. Preserve the boundaries, not the exact filenames.
