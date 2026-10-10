# Design principles and standards

**Baseline:** 10 October 2026. These are product engineering requirements for Market Partner. Referencing a standard is not a claim of conformance or certification.

## Architecture and use-case design

- **Keep one abstraction level per diagram.** The C4 context view names people and directly connected systems; container views name applications and data stores; component views decompose one container. Sequence diagrams describe runtime behavior. This follows the [C4 model guidance](https://c4model.com/diagrams), which recommends using only useful levels and keeping each view readable.
- **Specify outcomes before implementation.** Every use case has a stable ID, primary actor, trigger, preconditions, normal flow, alternate/failure behavior, postconditions, typed data contract, constraints, dependencies, and acceptance criteria. Included and extended use cases are independently specified because they have their own observable behavior.
- **Use ports and adapters.** Application workflows depend on domain interfaces, not on SnapTrade, Upstox, a market-data SDK, an email provider, or database implementation details. Provider-specific translation, authentication, retries, and error mapping live in adapters.
- **Make ownership and state explicit.** Every persisted user artifact is scoped to an owner. Mutating commands have a state transition, authorization check, idempotency behavior, and an auditable outcome. Read-only queries do not mutate domain state.
- **Fail closed at consequential boundaries.** Missing, stale, ambiguous, unauthorized, or inconsistent information must be reported as unavailable or partial. Do not replace it with a guess, silently treat missing values as zero, or continue an order action.

## Evidence, calculations, and agent behavior

- Research is bounded to an allowlisted source packet. Retrieved documents are untrusted data, not instructions.
- A material research claim references source IDs from the packet and preserves publication and retrieval dates. Reported facts, deterministic calculations, and interpretation have distinct types.
- A missing citation, stale source, conflicting value, or incomplete packet is visible in the result. An agent cannot create a source ID or make an unsupported number appear verified.
- Financial arithmetic, identifier resolution, criteria evaluation, order validation, and state transitions are deterministic code. The model may explain those results but cannot override them.
- Bull and bear analyses receive the same validated evidence packet and are generated independently before synthesis. The product does not output a buy/hold/sell instruction, target price, confidence score, or position size.

## Security, privacy, and resilience

- Apply least privilege and deny-by-default authorization. Separate user/fixture ownership from provider account identifiers.
- Secrets and provider credentials remain server-side. They are never placed in model context, browser storage, source control, analytics, or ordinary logs.
- Minimize data sent to a model. Do not send account numbers, names, tokens, or full statements; mask account labels and send only the positions required for a calculation.
- Keep retries bounded. Retry only safe, idempotent reads. An uncertain order submission is reconciled by provider order ID/idempotency key before any retry.
- Logs use correlation IDs and redacted event summaries; they exclude transcripts, credentials, full portfolio contents, and unredacted identifiers by default.
- Store UTC timestamps and render a clear local time/as-of label. Any cache must preserve source timestamp and may not make stale data appear current.

## Accessibility and voice interaction

- Voice is an input/output mode, not the only way to complete an action. Provide text entry, keyboard operation, visible focus, and a readable result.
- The web UI targets WCAG 2.2 AA as a design baseline; verify applicable criteria when implementing. The normative reference is the [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/).
- Browser speech is transcribed locally in the hackathon simulator. Do not persist raw audio. Show the recognized order fields before confirmation.
- Order confirmation must be an explicit, separate user action bound to the exact preview. Ambiguous speech, changed fields, expiry, or a disconnected session results in no order submission.

## Secure delivery and verification

- Use the [NIST Secure Software Development Framework (SP 800-218)](https://csrc.nist.gov/pubs/sp/800/218/final) as a lifecycle reference for protecting source, build, and release activities.
- Use [OWASP ASVS 5.0](https://owasp.org/projects/asvs) as a security requirements and verification checklist when the web/API implementation exists. The current design does not claim ASVS conformance.
- The submission's MCP behavior is version-pinned to the hackathon's verified 2025-11-25 contract because its documented demo path requires `initialize`, `tools/list`, and `tools/call` over Streamable HTTP. The [2026-07-28 MCP changelog](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx) removes that initialization handshake and changes Streamable HTTP semantics, so do not mix the two contracts. A protocol upgrade is a separately reviewed change.
- Acceptance criteria in each UC spec should become unit, contract, integration, or UI checks as appropriate. No requirement should be considered verified merely because its prose is present.

## Definition of a complete use-case spec

A use case is ready to implement when:

1. Its user-visible outcome, inputs, outputs, and ownership are unambiguous.
2. Preconditions and all failure/partial-result behavior are explicit.
3. Each dependency is an internal component or named port with a clear adapter, readiness gate, and fallback/disable behavior.
4. Data freshness, units, provenance, authorization, and retention needs are defined.
5. Its acceptance criteria can be observed without relying on model judgment alone.
6. Its stage and relationships agree with the architecture, HLD, domain contracts, and other UC specs.
