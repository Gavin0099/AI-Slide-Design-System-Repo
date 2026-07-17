# Array cardinality contract

## Decision

All array-driven layouts in the current Semantic Slide Model require exactly three entries. The validator rejects both underfilled and overfilled arrays before either renderer runs.

This is the reviewed three-slot contract for:

| Layout | Array fields |
| --- | --- |
| `comparison` | `left.items`, `right.items` |
| `problem-solution` | `problem.items`, `solution.items` |
| `process` | `steps` |
| `architecture` | `layers` |
| `evidence` | `sources` |
| `metrics` | `metrics` |
| `decision` | `reasons` |
| `closing` | `actions` |

## Why fixed three was selected

The approved Slidev screenshots and editable PPTX were reviewed with three occupied slots. A diagnostic render using the old minimum cardinalities produced visibly unbalanced layouts: one-item cards stayed at the left edge, two-step flows left a third slot empty, and one- or two-item evidence, metrics, decision, and closing pages retained large unused regions.

Merely recording those outputs as new baselines would approve weak layouts. Supporting one or two entries properly requires adaptive centering and spacing in both renderers, layout-specific regression tests, full-size PPTX inspection, and separately approved visual baselines. That work is intentionally outside this bounded repair.

## Compatibility and migration

This is a breaking Semantic Model change: arrays with one or two entries that were previously valid now fail validation. The committed `content.md` already contains exactly three entries for every affected field, so no repository deck migration is required.

External content should migrate by adding meaningful content until each array contains three entries. Do not add duplicate or invented evidence merely to satisfy the validator. If a message genuinely has fewer than three items, introduce a separately reviewed low-cardinality layout instead of weakening this contract.

## Claim boundary

The repository proves the reviewed three-slot surface and fail-closed validation for all ten array fields. It does not claim adaptive support for one-, two-, or more-than-three-item layouts.
