# Architecture decisions

Design baseline for the Build, Ship, Shape Alexa+ submission. Updated 10 October 2026.

## D1 — Build a browser simulator and a real MCP server

**Decision:** The demo uses an Alexa+ style browser interface and a self-hosted MCP server over Streamable HTTP.
**Reason:** The hackathon FAQ says the Alexa+ SDK/toolkit and real-device integration are unavailable to participants. The rules allow a simulated web experience; the FAQ confirms a real web-hosted MCP client can demonstrate the server.
**Implication:** The conversation host must perform `initialize`, `tools/list`, and `tools/call` over Streamable HTTP at runtime and show the resulting workflow in the demo. Do not imply native Alexa+ device integration.

## D2 — Use marketsearch as the design reference, not a code dependency

**Decision:** Build the hackathon service in this repository. Carry forward marketsearch's evidence/provenance model, point-in-time discipline, and independent bull/bear design; do not import the full engine.
**Reason:** The old research pipeline is still unimplemented, its current decision hub emits action labels unsuitable for this user-facing assistant, and its source-data coverage is incomplete for current company research.
**Implication:** Selectively port deterministic functions only after reviewing their interfaces, license and data freshness.

## D3 — Use a bounded LangGraph research workflow

**Decision:** Run two specialist analysts in parallel, then independent Bull and Bear agents in parallel, followed by a constrained synthesizer and deterministic evidence validator.
**Reason:** This preserves meaningful disagreement and makes the multi-agent behavior visible while limiting run time and model cost. A free-roaming agent swarm would be hard to audit and demo.
**Implication:** Every agent receives the same approved source packet and returns structured claims tied to source IDs.

## D4 — Report evidence; do not issue investment actions

**Decision:** The dossier contains supported case, countercase, disagreement and unknowns. It has no BUY/HOLD/SELL field, conviction tier or target weight.
**Reason:** This is a research companion; the user should decide. Amazon's Alexa+ financial policy prohibits directive advice, and a commercial Indian product needs a separate regulatory review.
**Implication:** The app can prepare a paper order only when the user supplies its ticker, quantity, price and explicit confirmation.

## D5 — Separate portfolio reading from paper execution

**Decision:** Broker portfolio data is read-only; paper order execution is a separate Upstox sandbox adapter.
**Reason:** SnapTrade's account access and trade availability vary by broker, while Upstox provides an India-market sandbox. Mixing the providers would create a misleading “any broker can trade” claim.
**Implication:** Clearly label account origin and order mode in UI, voice responses, screenshots and video.

## D6 — Make fixtures the judge-safe default

**Decision:** The repo includes fixture accounts and a bounded source pack; real authorized accounts are optional.
**Reason:** Brokerage approval and judge-specific OAuth access are not guaranteed by the deadline. The core use case must remain reproducible without personal credentials.
**Implication:** A fixture cannot be called a live integration. If the demo uses one live connection plus one fixture, say exactly that.

## D7 — Keep the first demo India-specific and one-company-at-a-time

**Decision:** Research NSE/BSE cash equities, one company per run, with a selected source packet of official exchange and issuer documents.
**Reason:** It aligns the company sources, holdings context and Upstox sandbox in one market and limits retrieval complexity.
**Implication:** Select the demo ticker by 12 October after checking source quality and sandbox instrument support; do not add options or market-wide ranking.

## D8 — No marketsearch conviction or sizing logic in this MVP

**Decision:** The existing marketsearch sizing and decision functions remain out of scope. Portfolio exposure is descriptive and hypothetical.
**Reason:** Position sizing from AI conviction is not required to show the hackathon workflow and would make the product sound like a personalized adviser.
**Implication:** A future thesis journal can be reconsidered after the evidence and regulatory model are clearer.

## D9 — Separate the full product target from the hackathon MVP

**Decision:** The product target includes portfolio intelligence, research and screening, event monitoring, and paper-order lifecycle management. The hackathon MVP delivers a one-company research workflow, fixture-first read-only portfolio context, hypothetical exposure, and a sandbox paper-order flow.
**Reason:** The expanded product direction makes the long-term value clear, while the limited submission scope keeps the demo buildable and verifiable by the deadline.
**Implication:** Performance history, broker research feeds, screening, scheduled alerts, and order modification/cancellation need their own data-quality and integration gates before implementation.

## Open gates to close before implementation

- Verify whether two team-owned brokerage accounts can be connected read-only using an approved integration.
- Verify Upstox sandbox order creation and status retrieval for the chosen cash-equity instrument.
- Select one company with sufficient current, official primary-source material for both sides of the dossier.
- Verify AWS Bedrock access, region/model availability and a small spend cap for development and the demo.
