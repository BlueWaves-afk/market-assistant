# UC-19: Set alert delivery preferences

> Diagram alias: `AlertPreferences` · Product area: Monitoring · Delivery stage: **Later/gated: notification provider, destination verification, and consent required**

## Purpose

Choose, verify, and revoke the channels through which the investor wants permitted event alerts delivered.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor configures alert settings or changes channel consent.

**Preconditions:**

- Owner identity is resolved.
- Any destination is validated and verified before external delivery is enabled.

**Inputs:**

- Owner, channel, destination, event classes, quiet hours/timezone, opt-in state, consent timestamp.

**Outputs:**

- Owner-scoped AlertPreference with verified status, enabled channels, consent time, and delivery policy.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-18 and checked by UC-22.

## Main success flow

1. Present available channels and the data each channel receives.
2. Collect a positive opt-in for each external channel separately.
3. Verify destination ownership through the provider’s verification flow.
4. Persist preferences and suppression/quiet-hour settings.
5. Apply revocation immediately to queued but unsent notifications.

## Alternate and failure flows

- If a destination is unverified, keep that channel disabled.
- If provider is unavailable, retain in-app-only preference and do not queue external delivery.
- If opt-in is revoked, cancel queued sends where possible and suppress future delivery.

## Functional requirements

- **FR-UC-19-01:** An external channel can send only when enabled, verified, and consented by the same owner.
- **FR-UC-19-02:** Revoking consent suppresses all future sends and is auditable.

## Rules and constraints

- In-app alerts may be enabled independently; email/push requires explicit verified consent.
- Do not include holdings, account identifiers, or full research dossier text in notification previews.

## Dependencies and failure containment

- **Internal:** Preference repository
- **Internal:** Consent/verification state machine
- **Internal:** UC-22 notification dispatch
- **External port:** NotificationPort provider not selected; email/push credentials and delivery receipts are required before enablement.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given an unverified destination, when preference is saved, then external delivery remains disabled.
- Given an opt-out while a message is queued, when dispatch checks consent, then the message is suppressed.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
