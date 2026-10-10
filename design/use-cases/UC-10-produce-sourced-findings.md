# UC-10: Produce sourced findings and countercase

> Diagram alias: `Findings` · Product area: Research and discovery · Delivery stage: **MVP**

## Purpose

Convert one validated source packet into structured, falsifiable findings and a balanced countercase.

## Contract

**Primary actor:** UC-08 research workflow.

**Trigger:** UC-08 supplies a validated EvidencePacket.

**Preconditions:**

- Source packet passes format, date, size, and access checks.
- Research model is live or a clearly labeled development fixture is selected.

**Inputs:**

- ResearchRun ID, user question, canonical instrument, EvidencePacket IDs/excerpts, workflow/prompt version.

**Outputs:**

- Typed claim set, support/countercase, disagreement and unknown lists, validation status, model/workflow version.

**Success postcondition:** The output contract is satisfied. A read-only use case does not mutate provider or portfolio state; a state-changing use case commits only the owner-scoped transition described above.

**Failure postcondition:** Partial, denied, stale, or uncertain outcomes are explicit; no unconfirmed, unauthorized, or unverified external mutation is represented as successful.

**Related use cases:** Included by UC-08.

## Main success flow

1. Run business/financial and governance/industry specialist analyses independently on the same packet.
2. Run bull and bear analyses independently on that packet and without seeing each other’s first draft.
3. Synthesize agreements, disagreements, assumptions, and unknowns.
4. Validate structured schema, cited source IDs, claim types, dates, numeric support, and prohibited directive language.
5. Return only validated claims and include rejected/unknown claim counts in internal run diagnostics.

## Alternate and failure flows

- If a model response is malformed, retry once only if safe; otherwise mark the run failed/partial.
- If any material claim cites an unknown source ID or includes unsupported numbers, reject the dossier or remove the claim and record validation failure.
- If prompt injection appears in documents, treat it as untrusted content; never follow it as an instruction.

## Functional requirements

- **FR-UC-10-01:** No output claim may cite a source outside the supplied packet.
- **FR-UC-10-02:** Reject investment actions, fabricated citations, unsupported numeric facts, and untyped calculations.

## Rules and constraints

- Five model roles maximum per MVP run: two specialists, bull, bear, synthesizer.
- Models explain evidence; code handles identifiers, arithmetic, citations, and policy checks.

## Dependencies and failure containment

- **Internal:** UC-09 packet
- **Internal:** Research workflow graph
- **Internal:** Schema/citation/policy validator
- **Internal:** ResearchModelPort
- **External port:** ResearchModelPort backed by Amazon Bedrock Converse for the live path; fixture responses are development-only and must be labeled.


All provider calls stay behind the ports named above. The application returns the specified partial/unavailable state when an external dependency is not ready; it does not substitute a different account, provider, or guessed value.

## Acceptance criteria

- Given a model response with a fabricated source ID, when validation runs, then the claim is excluded and the dossier cannot present it as supported.
- Given the same packet with bull and bear outputs, when synthesis completes, then it reports disagreements and unknowns without assigning a winner or action.

## Applicable shared requirements

[`NFR-AI-01`](../REQUIREMENTS.md), [`NFR-DATA-01`](../REQUIREMENTS.md), [`NFR-RES-01`](../REQUIREMENTS.md), [`NFR-OBS-01`](../REQUIREMENTS.md). Shared data and security rules are in [`DOMAIN_CONTRACTS.md`](../DOMAIN_CONTRACTS.md); provider readiness is in [`DEPENDENCIES.md`](../DEPENDENCIES.md)., [`NFR-ACC-01`](../REQUIREMENTS.md)
