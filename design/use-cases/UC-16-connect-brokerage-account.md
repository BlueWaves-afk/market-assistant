# UC-16: Connect brokerage accounts

> Diagram alias: `Connect` · Product area: Account connections · Delivery stage: **Later/gated: real identity, provider authorization, and secure secret storage required**

## Purpose

Authorize a read-only brokerage data connection and show exactly which provider scopes and accounts are linked.

## Contract

**Primary actor:** Self-directed investor.

**Trigger:** The investor selects Connect account.

**Preconditions:**

- The user is authenticated with a verified owner identity.
- A supported provider, OAuth/hosted-link flow, read-only scope, and secure secret store are configured.

**Inputs:**

- Owner ID, provider selection, requested scopes, redirect URI/state, and consent action.

**Outputs:**

- Connection status, provider name, selected masked account aliases, granted scopes, connected_at, and capability/freshness metadata.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Investor use case; creates the connection used by UC-02 and UC-05; reversed by UC-17.

## Main success flow

1. Explain provider, data categories, scope, refresh behavior, and disconnect path before redirect.
2. Create a short-lived CSRF-protected authorization state and start provider consent.
3. Validate callback state and provider authorization result.
4. Store credentials in SecretStorePort, associate only internal account refs with the owner, and fetch a masked account list.
5. Ask the user to select accounts; persist selected scopes and provider freshness/capabilities.

## Alternate and failure flows

- If consent is denied, timeout occurs, or callback state is invalid, discard the partial authorization and store no active connection.
- If token storage fails, revoke the newly issued provider grant if possible and report no connection.
- If provider grants broader scopes than requested, do not activate; reject or downgrade only through a supported least-privilege flow.

## Functional requirements

- **FR-UC-16-01:** Persist an active connection only after state validation, least-privilege scope check, secure token storage, and explicit account selection.
- **FR-UC-16-02:** Show provider, authorized data scopes, freshness limitations, and revoke control in settings.

## Rules and constraints

- Not MVP. Fixture mode remains the default.
- Request read-only holdings/activities scopes only; never request trading scope for this product path.

## Dependencies and failure containment

- **Internal:** IdentityContextPort
- **Internal:** Connection lifecycle service
- **Internal:** Account selector
- **Internal:** SecretStorePort
- **Internal:** Audit event recorder
- **External port:** BrokerageReadPort such as SnapTrade; provider approval, OAuth/hosted-link flow and scope behavior must be verified.


Provider calls stay behind the named ports. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given an invalid OAuth state, when callback is received, then it is rejected and no token/account is stored.
- Given successful read-only consent, when account selection completes, then only selected masked accounts are attached to the owner and no trading scope exists.

## Applicable shared requirements

[`NFR-SEC-01`](../REQUIREMENTS.md), [`NFR-SEC-02`](../REQUIREMENTS.md), [`NFR-PRIV-01`](../REQUIREMENTS.md), [`NFR-AUD-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
