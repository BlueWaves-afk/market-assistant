# UC-26: Validate exact preview and confirmation

> Diagram alias: `ValidateOrder` · Product area: Paper trading · Delivery stage: **MVP: mandatory guard before any sandbox submission**

## Purpose

Enforce the confirmation boundary as a deterministic policy check with no model discretion.

## Contract

**Primary actor:** UC-25 order service.

**Trigger:** UC-25 receives a confirmation attempt.

**Preconditions:**

- An immutable OrderPreview exists.
- The caller identity and sandbox mode are available.

**Inputs:**

- Owner, preview ID, displayed request hash, confirmation event/token, current time, provider mode, idempotency key.

**Outputs:**

- Validation decision with stable code, validated preview reference, and atomic submission claim or denial.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-25; shared validation primitive for UC-30 order changes.

## Main success flow

1. Load preview by ID and verify owner and exact immutable request hash.
2. Check PREVIEWED state, expiry, instrument/account capability, and explicit confirmation token/action.
3. Check the configured provider host is allowlisted sandbox and no live credentials/URL are reachable.
4. Atomically claim the preview/idempotency key and transition to SUBMITTING.
5. Return allow/deny with stable reason code; do not call the external provider itself.

## Alternate and failure flows

- If preview is missing, foreign, expired, already consumed, altered, or unsupported, deny without state mutation except safe expiry/attempt audit.
- If sandbox host/capability cannot be proven, deny closed.
- If database compare-and-swap detects a concurrent confirmation, return the existing state/result.

## Functional requirements

- **FR-UC-26-01:** Perform all checks before network submission and claim the preview atomically.
- **FR-UC-26-02:** A denied validation decision cannot invoke the execution adapter.

## Rules and constraints

- Validation is deterministic; never ask a model whether the user meant yes.
- Never permit confirmation to change order fields.

## Dependencies and failure containment

- **Internal:** OrderPreview repository/transaction boundary
- **Internal:** Owner authorization
- **Internal:** Sandbox endpoint allowlist
- **Internal:** Idempotency store
- **External port:** PaperExecutionPort capability metadata is read-only; this validator itself makes no provider request.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a mismatched request hash, when validation runs, then it denies and no execution-port call occurs.
- Given two concurrent identical confirmations, when both run, then only one submission claim is granted.

## Applicable shared requirements

[`NFR-ORD-01`](../REQUIREMENTS.md), [`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
