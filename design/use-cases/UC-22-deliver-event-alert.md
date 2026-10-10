# UC-22: Deliver event alert

> Diagram alias: `DeliverAlert` · Product area: Monitoring · Delivery stage: **Later/gated: scheduler, verified channel, explicit consent, and delivery provider required**

## Purpose

Deliver a concise, deduplicated notice of a new material evidence event through an enabled channel.

## Contract

**Primary actor:** Monitoring workflow acting under the investor’s alert consent.

**Trigger:** UC-20 creates an eligible alert candidate and the user has an enabled, verified preference.

**Preconditions:**

- Candidate has source IDs, rule/baseline versions, and a materiality reason.
- Channel is enabled, verified, and consented by the same owner.
- No prior successful delivery exists for the same dedupe key/channel.

**Inputs:**

- Alert ID, owner, candidate reason, source links, destination ref, channel, consent version, idempotency key.

**Outputs:**

- Delivery status per channel, provider receipt or safe failure code, and delivered/suppressed timestamp.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Conditional extension of UC-20 when a new material event is found; respects UC-19 and creates UC-21-visible alert.

## Main success flow

1. Recheck alert eligibility, owner, consent, destination verification, quiet hours, and suppression state at dispatch time.
2. Render a privacy-minimized message with instrument, short reason, date, and authenticated deep link.
3. Send through NotificationPort with provider idempotency key where supported.
4. Persist delivery attempt, provider receipt, timestamp, and outcome.
5. Expose the same alert in UC-21 regardless of external delivery success.

## Alternate and failure flows

- If consent was revoked or destination verification expired, suppress the send.
- If provider times out, mark delivery unknown and reconcile receipt before retrying.
- If source content is restricted, include an authenticated link and no excerpt.

## Functional requirements

- **FR-UC-22-01:** Recheck consent immediately before every send and suppress if disabled.
- **FR-UC-22-02:** Persist attempt/outcome separately from the alert so send failure never erases the in-app alert.

## Rules and constraints

- No order placement, holdings detail, credentials, or full dossier content in an alert.
- Duplicate retries must not create duplicate notifications when the provider supports idempotency; otherwise use a local outbox/dedupe key.

## Dependencies and failure containment

- **Internal:** UC-19 preference/consent check
- **Internal:** UC-20 alert candidate
- **Internal:** Transactional outbox and dedupe service
- **Internal:** UC-21 in-app alert record
- **External port:** NotificationPort provider not selected; destination verification, provider terms, and delivery receipt behavior are gates.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given consent is revoked after enqueue, when dispatch runs, then no external send occurs and the attempt is marked suppressed.
- Given the same alert/channel is retried after provider acceptance, when reconciled, then one delivered notification is recorded.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
