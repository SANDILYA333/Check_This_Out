# AI Workflow Rules — VoiceCheckout Extension

## 1. Approach

Build VoiceCheckout incrementally using a spec-driven workflow. These five context files define the product scope, architecture, implementation standards, current progress, and AI workflow. Treat them as the project's working contract.

The product direction is locked as a **Chrome Extension Manifest V3 prototype** that provides multilingual, voice-guided checkout assistance on a controlled demo checkout page. It is not a standalone mobile app and not an autonomous checkout agent.

Implement against the specifications rather than inventing behavior from scratch. If an implementation requirement is missing or contradictory, record the issue in `progress-tracker.md`, resolve it in the relevant context file, and only then implement.

The six-hour timebox is a priority constraint. Build the smallest reliable vertical slice first. Correctness, safe transaction-state handling, explicit user control, and a working demonstration outrank decorative polish or broad retailer compatibility.

## 2. Source of Truth

- `project-overview.md` — product purpose, goals, user flow, scope, and acceptance criteria.
- `architecture.md` — canonical extension architecture, permissions principles, boundaries, page detection, state transitions, mock payment contract, and invariants.
- `code-standards.md` — TypeScript, React, extension, DOM, audio, localization, accessibility, privacy, and verification rules.
- `progress-tracker.md` — actual current phase, completed work, in-progress work, blockers, commands, and verification results.
- `ai-workflow-rules.md` — incremental implementation and collaboration rules.

If two documents conflict, do not silently pick one. Update the canonical document and any dependent references before coding. `architecture.md` is authoritative for runtime behavior and safety invariants.

## 3. Mandatory Scope Lock

The current product direction supersedes the earlier standalone mobile-first web-app plan.

### Build

- Chrome Manifest V3 extension.
- React + TypeScript + Vite, subject to repository inspection.
- Popup that lets the user start/stop assistance.
- Content-script overlay, preferably isolated with Shadow DOM.
- Controlled demo checkout page owned by the team.
- Telugu, Hindi, and English instructions.
- Bundled prerecorded MP3 voice prompts.
- Verified contextual highlighting.
- User-controlled step-by-step guidance.
- Mock payment states: success, failed, pending.
- Safe pending/retry behavior.
- Documentation and a verified load-unpacked demonstration.

### Do not add without explicit scope change

- Standalone mobile app/APK.
- Universal extension compatibility across all retailers.
- Browser automation that clicks or submits checkout controls.
- Autonomous checkout/payment agent.
- Real payment processing.
- Backend/database/authentication.
- Runtime LLM or translation.
- Voice input/speech recognition/microphone permissions.
- Additional languages.
- Persistent analytics, order history, or credential storage.
- Broad host permissions without a demonstrated need.

Do not reopen settled decisions unless new evidence makes the current plan infeasible or the user explicitly changes scope.

## 4. First Actions in a Fresh Chat or Session

1. Inspect the actual repository and working directory.
2. Read `package.json`, lockfile, TypeScript/Vite configuration, extension manifest if present, source tree, scripts, and Git status.
3. Read all five context documents and reconcile any stale wording or contradictions.
4. Check hackathon rules for a mandatory real payment integration. Default remains mock-only unless a rule explicitly requires real integration.
5. Determine whether a controlled demo checkout page already exists.
6. Inspect existing extension tooling before installing or upgrading packages.
7. Update `progress-tracker.md` with actual observations and a next action.
8. Begin Phase 0 only after the environment and scope are understood.

Do not ask the user to repeat information already in the context files. Ask a question only when a genuinely blocking fact cannot be discovered from the repository or supplied project materials.

## 5. Six-Hour Plan

Use the agreed phase budgets:

| Phase | Budget | Goal |
|---|---:|---|
| 0. Extension Foundation | 30 min | Manifest V3, popup, content entry, controlled demo scaffold |
| 1. Guidance Engine | 45 min | Typed state model, deterministic stage/target detection |
| 2. On-Page Assistant | 105 min | Shadow DOM overlay, highlights, safe navigation and cleanup |
| 3. Voice and Localization | 60 min | Three dictionaries and essential bundled audio |
| 4. State Verification and Safety | 45 min | Mock outcomes, pending recovery, error handling |
| 5. Integration and Demonstration | 75 min | Build, load unpacked, full-flow verification, documentation |
| **Total** | **360 min** | |

At every phase boundary:
- Compare remaining time with remaining scope.
- Cut optional polish and generic-site support before cutting safety-critical behavior.
- Keep the project runnable.
- Do not spend a long period debugging an optional dependency if a simpler compatible approach can deliver the required behavior.
- Never skip verification of pending-state integrity or overlay cleanup.

## 6. Work in Small Units

- Work on one feature unit at a time.
- Prefer small, verifiable increments over speculative large changes.
- Separate manifest/build setup, popup behavior, content injection, overlay UI, target detection, audio, and mock payment.
- Avoid combining multiple browser permission changes with unrelated UI redesign.
- Avoid rewriting the entire project when a small compatible change is sufficient.
- After each unit, inspect the diff and run the narrowest useful verification command.
- Keep changes easy to revert if a toolchain issue appears.
- Do not continue building on top of a known broken build without recording why.

## 7. Required Safety and Architecture Checks

Before accepting a change, confirm it does not violate these invariants from `architecture.md`:

1. The extension never automatically clicks, submits, or pays.
2. It never requests, reads, logs, transmits, or stores payment credentials.
3. Page integration starts only after explicit user activation.
4. Unsupported pages are identified honestly.
5. Permissions remain minimal and documented.
6. Only verified, visible, unambiguous targets are highlighted.
7. Only mock-service success can show success.
8. Pending remains unresolved until the mock service returns a final status; status checks reuse the same transaction ID.
9. Retry is allowed only after confirmed failure.
10. The amount stays ₹1,499.
11. Audio failure never blocks visible guidance.
12. All required message keys exist across the three languages.
13. Closing the assistant cleans up overlay DOM, observers, listeners, and temporary styles.
14. The demo requires no backend or runtime LLM.
15. No unverified compatibility, translation, or payment claims are made.

If a change could violate one of these, stop and resolve it before implementation.

## 8. Handling Browser Permissions and Tooling

- Inspect the current manifest and build system before changing them.
- Do not assume a particular CRXJS version or package configuration.
- Prefer `activeTab` and `scripting` for user-invoked integration if the architecture and build support it.
- Do not request `<all_urls>` just to avoid designing a controlled demo.
- Do not add a background service worker unless required.
- Do not add permissions without explaining their need in `architecture.md` and `README.md`.
- Test injection failure on an unsupported/restricted page.
- Do not run broad browser automation or modify unrelated browser settings.
- Do not edit `node_modules` or third-party internals.
- If the existing project is already compatible, preserve its package manager and lockfile.

## 9. Handling Missing or Ambiguous Requirements

- Do not invent product behavior.
- If a requirement is ambiguous, update the relevant context document before coding.
- If a requirement is missing but non-blocking, add it to `progress-tracker.md` as an open question and continue with the smallest safe assumption only if necessary.
- If a requirement is genuinely blocking, ask one concise clarification.
- Treat a user request to change product scope as an explicit scope change and update all affected documents.
- Do not treat old documentation as more authoritative than the user's latest explicit decision.

## 10. Localization and Audio Workflow

1. Define the complete set of required message keys.
2. Create aligned dictionaries for `te`, `hi`, and `en`.
3. Send Telugu/Hindi copy for fluent review as early as possible, ideally at elapsed hour 0.
4. Generate audio assets using a development-time tool such as `edge-tts` only after confirming voice availability and output.
5. Store source assets using `public/audio/{lang}/{messageKey}.mp3`.
6. Best-effort preload the chosen language without blocking navigation.
7. Test missing-file and rejected-playback paths.
8. If proofreading has not returned by approximately elapsed time 1:30, continue with the best available copy and record that review is incomplete.
9. Never claim a language has been reviewed unless the review happened.
10. Use fixed reviewed wording for ₹1,499 and the PIN warning.

## 11. Verification Before Moving On

A feature unit can be marked complete only when:
1. The defined behavior exists in code.
2. Its acceptance conditions have been checked.
3. No architecture invariant has been violated.
4. Relevant build/typecheck/test commands actually ran, and results are recorded.
5. `progress-tracker.md` is updated.
6. Known limitations are written down.
7. The next unit is explicit.

For browser-dependent behavior, a TypeScript build alone is not sufficient. Load the unpacked extension in Chrome and test the actual popup/content-script interaction.

Before finalizing the project, verify:
- Extension build succeeds.
- Unpacked extension loads.
- Popup starts and stops assistance.
- Unsupported page is handled honestly.
- Controlled checkout stages are detected.
- Overlay highlights correct targets and cleans up on close.
- All three languages work to the extent assets exist.
- Audio fallback works.
- Success, failed, and pending are all demonstrable.
- Pending uses the same transaction ID and never implies success.
- Failed retry follows the specified path.
- No automatic click/form submission or credential reading occurs.
- 360px layout is usable.
- README includes install, permissions, demonstration, and limitations.

## 12. Progress Tracker Discipline

Update `progress-tracker.md` at meaningful implementation-unit boundaries. Include:
- Current phase and elapsed time if known.
- Actual files created/changed.
- What is implemented.
- Commands run and actual outcomes.
- What was tested manually in Chrome.
- What remains unverified.
- Blockers and decisions.
- Translation/audio review status.
- Next action and remaining budget.

Use these labels consistently:
- **Specified:** requirements documented, code not necessarily present.
- **Implemented:** code/assets have been created.
- **Built:** relevant build command completed successfully.
- **Tested:** behavior was actually checked.
- **Verified in Chrome:** unpacked extension behavior was observed in Chrome.
- **Demonstrated:** the end-to-end flow was run using the intended demo scenario.

Never mark a feature complete merely because code was generated.

## 13. Protected Areas

Do not modify these without an explicit requirement:
- `node_modules/` and third-party package internals.
- Generated output directories such as `dist/`, except through the build process.
- Lockfiles manually, except through the package manager.
- User data, secrets, browser profile data, or unrelated repository files.
- Existing project configuration that has not been inspected.

If the repo contains generated UI components or project-specific protected files, add them to this section after inspection.

## 14. Keeping Documents in Sync

Whenever implementation changes:
- Product scope or success criteria → update `project-overview.md`.
- Runtime boundaries, permissions, stage behavior, selectors, payment contract, or invariants → update `architecture.md`.
- Code conventions or folder boundaries → update `code-standards.md`.
- Current implementation/testing truth → update `progress-tracker.md`.
- Workflow rules → update `ai-workflow-rules.md`.

Make cross-document changes in the same implementation unit when possible. Re-read affected sections after editing to catch contradictory statements.

## 15. Communication Style

- Be direct and concrete.
- Give exact commands when a command is the next action.
- Explain the purpose and expected result of commands briefly.
- Do not dump a huge implementation before inspecting the repo.
- Do not ask the user to repeat settled decisions.
- Call out assumptions and unknowns.
- Distinguish planned work from verified work.
- When blocked, identify the smallest unblocker and ask only the necessary question.
- Keep the six-hour goal visible in tradeoffs.

## 16. Session Handoff Format

At the end of a session or when moving to another chat, summarize:
- Current phase and remaining time budget.
- Repository path and stack versions actually inspected.
- Files changed.
- Features implemented.
- Build/test/Chrome verification commands and results.
- Known limitations and open blockers.
- Next exact action.
- Any documentation that needs synchronization.

Do not hand off only a broad summary; include enough detail for the next AI to resume without repeating completed work.
