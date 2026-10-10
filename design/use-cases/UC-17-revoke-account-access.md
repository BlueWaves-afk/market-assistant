# UC-17: Disconnect or revoke linked account access

> Diagram alias: `Disconnect` · Product area: Account connections · Delivery stage: **Later/gated: provider revoke semantics and data-retention policy required**

## Purpose

Stop future access to a linked brokerage account, remove local credentials, and clearly explain any retained records.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor selects Disconnect/Revoke for a provider or selected account.

**Preconditions:**

- The investor owns the active connection.
- The system can locate all local tokens, account refs, caches, and provider grant state for that connection.

**Inputs:**

- Owner ID, connection ID, selected accounts or full connection, explicit disconnect confirmation.

**Outputs:**

- Disconnected status, local credential deletion status, provider revoke status, data deletion/retention summary.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; reverses UC-16.

## Main success flow

1. Show provider/accounts affected and what local data will be deleted or retained.
2. On explicit confirmation, mark connection revoked locally first so no new reads can start.
3. Revoke provider authorization where the provider supports it; delete local credentials regardless of remote result.
4. Purge cached holdings/activities for removed accounts under the retention policy; keep unrelated research and paper-order records separate.
5. Return completion state and any provider-side revocation failure requiring user action.

## Alternate and failure flows

- If provider revocation is unavailable, local access is still disabled and the user receives provider-specific manual revoke steps.
- If cache deletion fails, retain a deletion-pending state and retry; do not fetch again.
- If the request targets an unknown/other-owner connection, return not found without disclosing it.

## Functional requirements

- **FR-UC-17-01:** After local revocation, no subsequent provider request may use the old credential.
- **FR-UC-17-02:** Report provider-side revoke and local deletion states separately.

## Rules and constraints

- Disconnect takes effect locally before attempting external cleanup.
- Research dossiers and sandbox order history are separate data classes; their retention is governed separately and must not be implied deleted by account disconnection.

## Dependencies and failure containment

- **Internal:** UC-16 connection registry
- **Internal:** SecretStorePort
- **Internal:** Cache/data retention service
- **Internal:** Audit log
- **External port:** BrokerageReadPort revoke endpoint if available; provider-side failure cannot reactivate local access.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a valid owner connection, when disconnect is confirmed, then local token access is disabled before the provider revoke call.
- Given remote revoke failure, when the workflow completes, then local access remains disabled and the failure/manual action is visible.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-SEC-02`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md), [`NFR-STATE-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
