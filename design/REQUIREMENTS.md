# Cross-cutting non-functional requirements

Every UC spec inherits the requirements relevant to its behavior. UC-specific functional requirements are numbered `FR-UC-NN-MM`; this register defines the shared invariants and their verification intent.

| ID | Requirement | Verification intent |
|---|---|---|
| NFR-SEC-01 | Enforce owner-scoped authorization on every persisted record and mutation; deny by default. | Attempt cross-owner reads/writes with mismatched owner IDs; expect denial and no side effect. |
| NFR-SEC-02 | Keep provider/model credentials server-side and out of model context, browser storage, source control, and logs. | Inspect requests, browser storage, repository, and redacted logs using sentinel secrets. |
| NFR-PRIV-01 | Minimize sensitive data collected and sent to models; mask provider account identifiers in UI and responses. | Verify schemas and captured model/browser requests contain only required, masked fields. |
| NFR-DATA-01 | Preserve source, provider, published/fetched/as-of time, units, and fixture/live mode for every displayed financial or research value. | Contract tests reject an unlabelled value; UI shows provenance/freshness. |
| NFR-DATA-02 | Missing or incomplete data is never interpreted as zero or silently filled from an unrelated source. | Inject missing fields and verify explicit partial/unavailable state. |
| NFR-AI-01 | Model claims are bounded to provided evidence; unsupported citations, investment directives, and model-produced arithmetic are rejected or clearly marked. | Feed prompt-injection and invalid claim fixtures; validator blocks them. |
| NFR-API-01 | UI and agents use versioned application contracts; provider-specific SDK types stay behind adapters. | Static/module boundary review and contract tests. |
| NFR-RES-01 | External timeouts, rate limits, auth failures, and malformed responses yield safe partial/unavailable results; no silent provider substitution. | Adapter contract tests cover each normalized failure code. |
| NFR-AUD-01 | Mutations are idempotent or use a one-time action token; uncertain external outcomes are reconciled before retry. | Repeat calls and simulate timeout-after-acceptance; assert one external mutation. |
| NFR-ORD-01 | MVP orders can reach only the Upstox sandbox and require explicit confirmation of an immutable, unexpired preview. | Configuration guard rejects live host; negative confirmation/expiry tests produce no order. |
| NFR-ACC-01 | Voice is never the only path; provide keyboard-accessible text input and readable results with focus/contrast checked against WCAG 2.2 AA. | Manual and automated accessibility checks against applicable WCAG criteria. |
| NFR-OBS-01 | Every workflow has a correlation ID and safe operational outcome; logs exclude transcript, token, full account ID, and portfolio contents by default. | Log inspection with sensitive sentinel values. |
| NFR-STATE-01 | Domain state transitions are explicit and invalid transitions have no side effect. | State-machine transition tests reject illegal edges. |

## Cross-cutting functional prohibitions

- No MVP live order endpoint, autonomous order, AI-selected security, user-specific buy/hold/sell instruction, AI sizing, or generated target price.
- No account or order credentials in prompts, tool outputs, user-visible exceptions, screenshots, or submission video.
- No research claim without a source record in the same run's validated source packet.
- No unapproved broker-authored research presented as Market Partner analysis.
