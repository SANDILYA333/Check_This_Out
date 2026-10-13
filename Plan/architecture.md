# Architecture Context — VoiceCheckout Extension

> **Status:** Target architecture/specification. The repository has not yet been inspected and the architecture is not evidence of implemented code.
>
> **Canonical document:** This file owns extension boundaries, permissions principles, stage transitions, target detection, mock payment behavior, cleanup rules, and system invariants. Other context files should refer here rather than redefining these contracts.

## 1. Architecture Goals

- Deliver a demonstrable Chrome extension within six hours.
- Keep all required behavior local to the browser for the prototype.
- Separate extension popup, page integration, checkout guidance, localization/audio, and mock payment logic.
- Ensure the user explicitly starts assistance and remains in control of checkout actions.
- Limit permissions and page interaction to the minimum required for the controlled demo.
- Make failure states explicit and safe.
- Avoid an architecture that implies universal third-party site compatibility.

## 2. Stack

| Layer | Technology | Role / Constraint |
|---|---|---|
| Browser extension | Chrome Extension Manifest V3 | Extension manifest, action popup, content script, optional service worker only if needed |
| Language | TypeScript | Typed stages, messages, page targets, and payment status |
| UI/build | React + Vite | Popup and, if practical, assistant UI bundle |
| Extension build integration | CRXJS or compatible tooling | Use only after inspecting package versions and verifying compatibility |
| In-page UI isolation | Shadow DOM | Reduce CSS collisions with the host page |
| Page integration | Content script | Detect the controlled checkout page, mount overlay, observe supported state changes |
| Dynamic page observation | `MutationObserver`, if needed | Observe only while assistance is active; disconnect during cleanup |
| Localization | Local typed dictionaries | Telugu, Hindi, English; all required keys aligned |
| Audio | Bundled MP3 files | Prerecorded audio; no required runtime TTS service |
| Payment | Local mock service | Deterministic simulation; never a real payment API |
| Storage | In-memory state by default | Avoid persistence unless a specific requirement justifies it |
| Backend/database | None | Not required for the MVP |
| Testing | Existing test setup or minimal focused tests | Inspect repo before adding a new runner |
| Distribution | Load unpacked in Chrome | Primary six-hour demo delivery |

Do not assume exact dependency versions or a particular CRXJS release. Inspect the existing project and use a compatible, maintained setup. If extension tooling conflicts with the existing scaffold, choose the smallest reliable alternative and document the decision.

## 3. High-Level Components and Boundaries

### 3.1 Extension Popup

**Owns:**
- Entry point for the user.
- Language selection if selected before starting.
- Start assistance and stop/close guidance actions.
- Explanation when the active page is unsupported.
- Clear permission or injection failure messaging.
- Optional demo scenario selection if it is simpler and safer to expose here.

**Must not:**
- Parse the checkout DOM directly from the popup.
- Make a real payment request.
- Collect credentials.
- Claim assistance has started until the content script confirms success.

### 3.2 Manifest and Extension Bootstrap

**Owns:**
- Extension metadata and action popup.
- Content-script/build entry declarations.
- Minimum required permissions.
- Static bundled assets and script wiring.

**Permission principle:**
- Prefer the narrowest permission model that works for the controlled demo.
- Consider `activeTab` and `scripting` for user-invoked injection if compatible with the implementation.
- Do not request broad `<all_urls>` host permissions by default.
- Do not add `tabs`, `storage`, `webNavigation`, or other permissions without a concrete need.
- Any permissions actually used must be explained in the README and progress tracker.
- The exact manifest must be checked against the actual implementation and current Chrome requirements.

### 3.3 Content Script / Page Adapter

**Owns:**
- Verify that the current page is the supported controlled demo checkout.
- Locate expected controls through deterministic selectors or stable data attributes.
- Determine the current supported page state.
- Mount the assistant overlay.
- Apply and remove temporary highlights.
- Notify the UI when the expected state changes.
- Clean up observers, event listeners, DOM nodes, and temporary styles when stopped.

**Must not:**
- Automatically click checkout controls.
- Submit forms.
- Read or transmit sensitive input values.
- Infer success from a visual animation alone.
- Guess at a target when selectors are missing or ambiguous.
- Observe the page indefinitely after the assistant closes.

### 3.4 Assistant Overlay

**Owns:**
- Visible step title and localized instruction.
- Replay audio control.
- Next/Back/Close controls appropriate to the current state.
- Contextual target highlight/arrow.
- Payment-state explanation and recovery actions.
- Accessible focus and keyboard behavior.

**Implementation preference:**
- Use Shadow DOM to isolate styles.
- Use a small, self-contained root container.
- Use namespaced classes and local CSS.
- Avoid modifying the host page's layout more than necessary.
- Keep the overlay narrow enough to work at 360px width.
- Do not trap the user in the overlay; the user must be able to close it.

### 3.5 Guidance Engine

**Owns:**
- Typed list of checkout stages.
- Allowed stage transitions.
- Mapping from stage to localization message keys.
- Mapping from stage to expected page target.
- Rules for advancing only after supported state/action confirmation.
- Handling unsupported, missing, ambiguous, or stale targets.
- Separation between the guidance stage and mock payment status.

The guidance engine must not assume a control was activated merely because the user clicked “Next” in the overlay. For page steps, verify the expected page state where practical. If the target or state cannot be verified, tell the user and offer a safe fallback rather than pretending the page advanced.

### 3.6 Localization and Audio

**Owns:**
- Dictionaries for `te`, `hi`, and `en`.
- Compile-time alignment of required message keys.
- Mapping from `(language, messageKey)` to a bundled MP3 path.
- Playback, replay, and audio error handling.
- Best-effort preload after language selection.

**Must not:**
- Call a remote TTS provider at runtime.
- Translate through an LLM at runtime.
- block navigation while preloading.
- require audio playback for the user to continue.
- invent spoken amount wording dynamically without review.

### 3.7 Mock Payment Service

**Owns:**
- Local demo transaction identifiers.
- Deterministic `createOrder()` and `getStatus()` behavior.
- Demo scenario configuration for success, failed, and pending.
- Tracking status checks for the same transaction.

**Must not:**
- Call a real payment API.
- request/store PIN, OTP, password, card, or bank credentials.
- report success based on a button click alone.
- turn unknown/error states into success.
- create a new transaction for a pending status check.

## 4. Recommended Project Structure

Adapt this to the actual repository rather than imposing it blindly.

```text
project-root/
├── public/
│   └── audio/
│       ├── te/
│       ├── hi/
│       └── en/
├── scripts/
│   └── gen_audio.py
├── src/
│   ├── popup/
│   │   ├── Popup.tsx
│   │   └── popup.css
│   ├── content/
│   │   ├── content.ts
│   │   ├── mountAssistant.tsx
│   │   ├── overlay.css
│   │   └── pageAdapter.ts
│   ├── engine/
│   │   ├── machine.ts
│   │   └── selectors.ts
│   ├── i18n/
│   │   ├── messages.en.ts
│   │   ├── messages.hi.ts
│   │   └── messages.te.ts
│   ├── audio/
│   │   └── audioService.ts
│   ├── services/
│   │   └── mockPsp.ts
│   ├── shared/
│   │   └── types.ts
│   └── demo-store/
│       └── (controlled demo checkout page, if housed in the same project)
├── manifest.json (or build-generated equivalent)
├── project-overview.md
├── progress-tracker.md
├── code-standards.md
├── architecture.md
└── ai-workflow-rules.md
```

The actual bundler may require a different folder layout. The critical architectural boundary is more important than these exact filenames.

## 5. Permissions and Trust Boundary

- The user explicitly invokes the extension before page integration begins.
- Use the minimum browser permissions that support the selected architecture.
- Avoid broad host access by default.
- Only interact with the current controlled demo checkout in the MVP.
- If a URL/page check is used, do not assume a URL match alone proves the DOM is safe or supported; verify expected markers too.
- Do not send page content to a server.
- Do not log form values or secrets.
- Never inspect or read PIN/OTP/password/card/bank credential fields.
- Do not inject UI into browser-internal pages, extension stores, or unsupported pages.
- If script injection is blocked, show a clear error in the popup.
- Explain all requested permissions in the README and demo instructions.
- Treat host-page DOM as dynamic and potentially untrusted input.

## 6. Stage Model and State Transitions

The assistant flow should be typed and deterministic. Suggested stage union:

```ts
type CheckoutStage =
  | "WELCOME"
  | "LANGUAGE"
  | "ADDRESS"
  | "ADDRESS_CHANGE_STUB"
  | "METHOD"
  | "REVIEW"
  | "UPI_SIMULATION"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "PENDING"
  | "UNSUPPORTED";
```

This is a proposed type; adapt if the controlled demo's page layout allows a smaller model. `UNSUPPORTED` may be modeled as a separate error state instead of a normal checkout stage.

### Allowed navigation

- `WELCOME` → `LANGUAGE` after the user starts.
- `LANGUAGE` → `ADDRESS` after selecting a language.
- `ADDRESS` → `METHOD` after address confirmation on the demo page.
- `ADDRESS` → `ADDRESS_CHANGE_STUB` for Change; Back returns to `ADDRESS`.
- `METHOD` → `ADDRESS` for Back; Continue → `REVIEW`.
- `REVIEW` → `METHOD` for Back; Confirm → create a mock transaction and enter `UPI_SIMULATION`.
- `UPI_SIMULATION` → `REVIEW` for Back; discard the unused transaction.
- Simulated handoff confirmation → `PROCESSING`; query status for the current transaction ID.
- `PROCESSING` → `SUCCESS`, `FAILED`, or `PENDING` only based on the mock service's returned status.
- `PENDING` → `PROCESSING` or remain in `PENDING` while checking the same transaction.
- `FAILED` → `METHOD` for Retry; a fresh transaction is created only after the user confirms REVIEW again.
- `SUCCESS` → close/reset to the controlled store.
- `UNSUPPORTED` → show explanation; no automatic page interaction.

Do not allow ordinary Back navigation from `PROCESSING`, `SUCCESS`, `FAILED`, or `PENDING` to erase or bypass the current transaction result. A specific recovery action may move state according to the rules above.

## 7. Mock Payment Contract

Suggested contract:

```ts
type PaymentStatus = "success" | "failed" | "pending";

type MockOrder = {
  transactionId: string;
};

interface MockPsp {
  createOrder(): Promise<MockOrder>;
  getStatus(transactionId: string): Promise<PaymentStatus>;
}
```

### Timing

1. `createOrder()` runs once when the user confirms `REVIEW`.
2. It returns a transaction ID only, not a final result.
3. The user reads the simulated-payment instructions and confirms the simulated handoff.
4. The UI enters `PROCESSING` and calls `getStatus(transactionId)`.
5. The returned status determines the displayed result.

### Default behavior

- First status check: `pending`.
- Second check for the same ID: `success`.

### Demo overrides

Support at least:
- Immediate success.
- Immediate failed.
- Pending, then success.
- Pending, then failed.
- Remains pending until reset.

If the time budget forces simplification, preserve the ability to demonstrate success, failed, and pending, and retain the default pending-then-success path.

### Status safety

- A status lookup error or unknown value is unresolved, never success.
- Pending status checks reuse the same transaction ID.
- Pending does not automatically create another transaction.
- Retry is available only after confirmed failure.
- Success is shown only after the mock service returns `success`.
- The service is a simulation and must be labeled as such.

## 8. Page Target Detection Contract

- Use stable `data-testid`/`data-voicecheckout` attributes on the controlled demo page when the team owns that page.
- If interacting with an external test page, use deterministic selectors documented in the adapter and keep the supported page list explicit.
- Before highlighting, verify that the target exists, is connected to the document, is visible, and is not disabled when an enabled control is expected.
- If multiple targets match, treat the target as ambiguous.
- Do not click the target on the user's behalf.
- Do not read input values to determine whether a secret was entered.
- Prefer observing non-sensitive state attributes or explicit page-step markers.
- On a DOM update, revalidate the current target; if it disappeared, pause guidance and explain the issue.
- Disconnect `MutationObserver` and remove event listeners on stop/unmount.
- Restore any previous inline style before removing a highlight.
- Do not leave a page-wide overlay or altered CSS after the extension closes.

## 9. Audio Asset Contract

Use one consistent asset path:

```text
public/audio/{lang}/{messageKey}.mp3
```

The build may copy or transform these paths as needed for extension packaging, but the source convention should remain clear.

- Keys must align across Telugu, Hindi, and English.
- Use fixed, reviewed spoken wording for ₹1,499.
- Include language-name audio if available.
- Essential audio: welcome, language names, each core instruction, review amount, PIN warning, processing, success, failed, pending, and audio/error fallback as appropriate.
- Best-effort preload the selected language.
- Audio playback errors must be caught and reported non-blockingly.
- No runtime network request is required for audio.

Suggested generation-time voices, subject to availability and review:
- Telugu: `te-IN-ShrutiNeural`
- Hindi: `hi-IN-SwaraNeural`
- English (India): `en-IN-NeerjaNeural`

These are suggestions, not verified assets. A fluent speaker should review Telugu/Hindi phrases when possible. If review is not available by about elapsed time 1:30, continue with the best available copy and document that review is incomplete.

## 10. Demo Panel

The demo scenario controls must be available in the built extension/demo, not only in development mode. Prefer a visible demo-only control in the popup or a clearly marked control on the team's demo page. If a keyboard shortcut or hidden activation is also added, it must not be the only way to access it on a phone.

The demo panel is not a security boundary. It should control only mock payment outcomes and must never unlock real payment functionality.

## 11. Cleanup and Lifecycle

When the assistant is closed, stopped, or unmounted:
1. Remove the overlay host and Shadow DOM.
2. Remove highlight classes/temporary styles and restore previous values.
3. Remove listeners registered by the extension.
4. Disconnect `MutationObserver`.
5. Stop extension audio if appropriate.
6. Clear transient UI state unless preserving it is required for a safe current transaction.
7. Do not alter the host page's checkout data.
8. Do not leave global CSS, event handlers, or injected controls behind.

Repeatedly starting and stopping the assistant must not create duplicate overlays, duplicate listeners, or multiple observers.

## 12. Data and Storage Model

- No backend or database.
- No account or authentication.
- In-memory state by default.
- Bundle localization dictionaries and audio with the extension.
- Avoid `chrome.storage` unless a specific feature requires settings to persist between sessions.
- Never persist transaction or page data beyond what the local demo needs.
- Never persist sensitive payment credentials.
- No analytics or telemetry in the MVP.

## 13. Invariants

1. **User control:** The extension never automatically clicks a checkout button, submits a form, initiates real payment, or makes a purchase.
2. **No secrets:** The extension never requests, reads, logs, transmits, or stores PINs, OTPs, passwords, card numbers, or bank credentials.
3. **Explicit activation:** Page integration begins only after the user invokes the extension and starts assistance.
4. **Scope honesty:** The MVP guarantees support only for the controlled demo checkout; unsupported pages are identified honestly.
5. **Minimal permissions:** Request only permissions required by the chosen implementation and document why.
6. **Verified target:** Highlight only a verified, visible, unambiguous target. Never guess.
7. **Status integrity:** Only a `success` response from the mock payment service can produce the success screen.
8. **Pending safety:** Pending is never success, uses the same transaction ID for checks, and warns against paying again while unresolved.
9. **Failure recovery:** Retry is offered only after a confirmed failed result and follows the documented path.
10. **Amount consistency:** The product and total remain fixed at ₹1,499 throughout visible and spoken guidance.
11. **Audio resilience:** Audio failure does not block visible guidance or navigation.
12. **Localization completeness:** Every required message key exists in all three language dictionaries; missing assets are reported honestly.
13. **Overlay cleanup:** Closing the assistant removes its DOM, listeners, observers, and temporary page styling.
14. **No required backend:** The controlled demo works without a backend, database, account, or runtime LLM.
15. **No unsupported claims:** The app and documentation do not claim universal retailer compatibility, verified translation quality, or real payment completion unless independently established.
16. **Build truth:** A phase is not marked tested until its checks have actually run and their results are recorded.

## 14. Failure Handling

| Failure | Required behavior |
|---|---|
| Unsupported page | Explain that the prototype supports the controlled demo checkout; do not inject misleading guidance |
| Permission/injection failure | Show actionable popup error; do not claim the assistant started |
| Target missing | Pause the step, explain what could not be found, offer retry/restart |
| Multiple target matches | Treat as ambiguous; do not highlight a guessed target |
| Target disappears | Pause guidance and revalidate before continuing |
| Audio missing/fails | Keep visible instructions available; allow user to continue |
| Observer throws or becomes stale | Disconnect safely, report the issue, and avoid false progression |
| Unknown payment status | Show unresolved state, never success |
| Payment status check errors | Keep unresolved state; allow a safe status recheck when appropriate |
| Duplicate confirmation | Guard against duplicate mock transaction creation |
| Overlay closes | Remove injected UI/listeners/observers and preserve host-page integrity |
| Language switch | Update messages/audio without unexpectedly resetting stage or transaction |

## 15. Verification Strategy

Before marking a unit complete:
- TypeScript/build checks pass using actual project scripts.
- Extension manifest/build output is valid.
- The extension loads unpacked in Chrome.
- Popup can start and stop assistance.
- Unsupported pages are handled honestly.
- Overlay can mount, update, and clean up.
- The controlled demo's supported states are detected deterministically.
- The three result paths work.
- Pending status uses the same transaction ID and never implies success.
- No automatic checkout action occurs.
- No sensitive value is read or logged.
- The 360px layout has no horizontal overflow.
- Audio fallback works when an asset is missing or playback rejects.
- `progress-tracker.md` records the commands and actual outcomes.

## 16. Known Unknowns

- Actual repository structure and package versions.
- Exact compatible extension build integration.
- Whether the team already has a controlled demo store.
- Which page markers/selectors currently exist.
- Exact manifest permissions needed by the final implementation.
- Whether translation review is available.
- Whether the demo environment is a local page or a deployed page.

Resolve these by inspecting the repository and demo page. Do not invent a site URL, selector, permission, or build script.
