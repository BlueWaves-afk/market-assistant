# Market Partner design specifications

This folder is the development design baseline for the **full product target** in [`docs/USE_CASES.puml`](../docs/USE_CASES.puml). It contains a separate specification for every use case, shared domain contracts, architectural principles, dependency ports, traceability, and a consistency review.

The use-case specifications distinguish the hackathon MVP from later product phases. “MVP” means the bounded behavior described in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md), not the entire use case as it might exist in a mature product. Provider access, licensing, and sandbox capabilities remain gates where listed; a fixture or a disabled feature is the defined fallback.

## Start here

1. Read [design principles and standards](PRINCIPLES.md).
2. Review the [cross-cutting requirements](REQUIREMENTS.md), [domain and interface contracts](DOMAIN_CONTRACTS.md), and [dependency ports](DEPENDENCIES.md).
3. Use the [use-case index](use-cases/README.md) and [traceability](TRACEABILITY.md) to navigate all 30 use cases and their include/extend relationships.
4. Read the [consistency and dependency audit](REVIEW.md) and current [implementation status](IMPLEMENTATION_STATUS.md) for local coverage and remaining provider gates.

Use the [UC spec template](USE_CASE_TEMPLATE.md) for future additions or revisions.

## Use-case specifications

Specs use the IDs in the first column of the traceability table. Their filenames start with the same ID. Each one defines actor, trigger, preconditions, inputs/outputs, success/failure postconditions, normal and alternate flows, functional requirements, constraints, dependencies, and acceptance criteria.

## Source of truth

- The PlantUML use-case names and aliases are the traceability source. If an alias changes, update the corresponding UC spec and the traceability table in the same change.
- The architecture and HLD define system boundaries and the hackathon scope. These detailed specs refine them; they do not silently promote later-phase behavior into MVP scope.
- The shared domain contracts define data semantics and states used by multiple specs. A use case must not redefine them locally.
- If an implementation constraint requires a behavior change, update the spec and the architecture decision log before changing the externally visible contract.

## Readiness summary

All 30 use cases now have a local fixture path or an explicit unavailable state. Provider and production requirements remain gated as listed in [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) and [`DEPENDENCIES.md`](DEPENDENCIES.md). “Implemented locally” does not mean an external provider has approved access or that an integration has been verified.
