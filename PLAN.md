# PLAN.md
<!-- governance-baseline: overridable -->
<!-- baseline_version: 1.0.0 -->

> **最後更新**: 2026-07-16
> **Owner**: GavinWu
> **Freshness**: Sprint (7d)

---

## Current Phase

<!-- Required: fill in current phase ID and description -->

- [x] Phase A: Governance onboarding and buildable Slidev vertical slice
- [ ] Phase B: Expand the semantic layout library and visual regression coverage (in progress)

## Active Sprint

<!-- Required: list current sprint tasks -->

- [x] Pin AI Governance Framework at `634c9b86`
- [x] Adopt and calibrate the repo governance baseline
- [x] Define a constrained Semantic Slide Model
- [x] Implement `cover`, `key-message`, and `comparison` layouts
- [x] Add deterministic render, lint, build, and CI commands
- [x] Add screenshot-based visual regression after the first layout set is reviewed
- [x] Add and visually approve `problem-solution`, `process`, and `architecture`

## Backlog

<!-- Required: prioritized items not yet started -->

- P1: Pin cross-platform font assets before enforcing pixel diffs in CI
- P2: Add `evidence`, `metrics`, `decision`, and `closing` layouts
- P2: Add an editable PptxGenJS renderer from the same semantic model

## Decision Log

<!-- Optional but recommended: record architecture or governance decisions with dates -->

- 2026-07-16: Use Slidev as the HTML/PDF presentation engine and a local theme package as the controlled design surface.
- 2026-07-16: Treat `decks/*/deck.mjs` as source and generated `slides.md` as renderer output.
- 2026-07-16: Keep editable PPTX outside Phase A; a future renderer must consume the same semantic model.
- 2026-07-16: Approve 1280x720 Chrome screenshot baselines for the first three layouts; keep cross-platform pixel enforcement out of CI until fonts are pinned.
- 2026-07-16: Expand the controlled library to six layouts and require each new layout to enter the same screenshot manifest before approval.

## Known Risks

<!-- Optional: track identified risks and mitigation status -->

- Generated Markdown could drift from the semantic source. Mitigation: `npm run render:check` fails when generated output is stale.
- Layout additions can silently reduce visual consistency. Mitigation: layouts remain allowlisted and each type has field limits in the validator.
- Build success does not prove visual polish. Mitigation: Phase B adds screenshot review; Phase A claims buildable structure only.
- Pixel output can vary across operating systems and font stacks. Mitigation: CI verifies baseline integrity now; cross-platform pixel diffs wait for pinned fonts or per-platform baselines.
