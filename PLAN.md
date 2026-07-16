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
- [x] Phase B: Expand the semantic layout library and visual regression coverage
- [ ] Phase C: Add an editable renderer from the same semantic model

## Active Sprint

<!-- Required: list current sprint tasks -->

- [x] Pin AI Governance Framework at `634c9b86`
- [x] Adopt and calibrate the repo governance baseline
- [x] Define a constrained Semantic Slide Model
- [x] Implement `cover`, `key-message`, and `comparison` layouts
- [x] Add deterministic render, lint, build, and CI commands
- [x] Add screenshot-based visual regression after the first layout set is reviewed
- [x] Add and visually approve `problem-solution`, `process`, and `architecture`
- [x] Pin repo-local Noto Sans TC with license, source commit, and SHA-256 checks
- [x] Add and visually approve `evidence`, `metrics`, `decision`, and `closing`

## Backlog

<!-- Required: prioritized items not yet started -->

- P1: Add an editable PptxGenJS renderer from the same semantic model
- P2: Collect platform-specific visual evidence before deciding whether CI can share one pixel baseline

## Decision Log

<!-- Optional but recommended: record architecture or governance decisions with dates -->

- 2026-07-16: Use Slidev as the HTML/PDF presentation engine and a local theme package as the controlled design surface.
- 2026-07-16: Treat `decks/*/deck.mjs` as source and generated `slides.md` as renderer output.
- 2026-07-16: Keep editable PPTX outside Phase A; a future renderer must consume the same semantic model.
- 2026-07-16: Approve 1280x720 Chrome screenshot baselines for the first three layouts; keep cross-platform pixel enforcement out of CI until fonts are pinned.
- 2026-07-16: Expand the controlled library to six layouts and require each new layout to enter the same screenshot manifest before approval.
- 2026-07-16: Pin Noto Sans TC 2.004 from official Google Fonts commit `b950a725` and reject asset or SHA drift in `npm run check`.
- 2026-07-16: Approve ten semantic layouts through the same model, build, screenshot, pixel-diff, and manual visual review gate.

## Known Risks

<!-- Optional: track identified risks and mitigation status -->

- Generated Markdown could drift from the semantic source. Mitigation: `npm run render:check` fails when generated output is stale.
- Layout additions can silently reduce visual consistency. Mitigation: layouts remain allowlisted and each type has field limits in the validator.
- Build success does not prove visual polish. Mitigation: Phase B adds screenshot review; Phase A claims buildable structure only.
- Pixel output can vary across operating systems even with one font asset. Mitigation: the font and its load path are pinned; shared cross-platform pixel enforcement waits for platform-specific evidence.
