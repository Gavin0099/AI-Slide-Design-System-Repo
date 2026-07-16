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
- [x] Phase C: Add an editable renderer from the same semantic model
- [x] Phase D: Make Content Markdown the canonical deck input

## Active Sprint

<!-- Required: list current sprint tasks -->

- [x] Pin AI Governance Framework at `634c9b86`
- [x] Adopt and calibrate the repo governance baseline
- [x] Define a constrained Semantic Slide Model
- [x] Implement `cover`, `key-message`, and `comparison` layouts
- [x] Add deterministic render, lint, build, and CI commands
- [x] Add screenshot-based visual regression after the first layout set is reviewed
- [x] Add and visually approve `problem-solution`, `process`, and `architecture`
- [x] Pin repo-local Noto Sans TC, record its official source commit, and enforce local size and SHA-256 integrity
- [x] Add and visually approve `evidence`, `metrics`, `decision`, and `closing`
- [x] Add and visually approve an editable PptxGenJS renderer for all ten layouts
- [x] Add deterministic `content.md -> deck.mjs -> PPTX` generation and failure-path tests
- [x] Close the visual-gate review findings: semantic newline rejection, real-deck structure assertions, local pixel enforcement, and external human authority binding
- [x] Correct the font provenance claim boundary and add an explicit upstream byte/digest verifier

## Backlog

<!-- Required: prioritized items not yet started -->

- P1: Collect platform-specific PPTX and browser visual evidence before deciding whether CI can share one pixel baseline
- P2: Validate PDF export after renderer ownership and font substitution behavior are stable

## Decision Log

<!-- Optional but recommended: record architecture or governance decisions with dates -->

- 2026-07-16: Use Slidev as the HTML/PDF presentation engine and a local theme package as the controlled design surface.
- 2026-07-16: Initially treat `decks/*/deck.mjs` as source and generated `slides.md` as renderer output.
- 2026-07-16: Keep editable PPTX outside Phase A; a future renderer must consume the same semantic model.
- 2026-07-16: Approve 1280x720 Chrome screenshot baselines for the first three layouts; keep cross-platform pixel enforcement out of CI until fonts are pinned.
- 2026-07-16: Expand the controlled library to six layouts and require each new layout to enter the same screenshot manifest before approval.
- 2026-07-16: Pin Noto Sans TC 2.004, record official Google Fonts commit `b950a725`, and reject local asset or manifest SHA drift in `npm run check`; the offline command does not authenticate upstream provenance.
- 2026-07-16: Approve ten semantic layouts through the same model, build, screenshot, pixel-diff, and manual visual review gate.
- 2026-07-16: Render editable PPTX from the same Semantic Model with native PowerPoint text and shapes; keep font embedding outside the current claim boundary.
- 2026-07-16: Promote `decks/*/content.md` to canonical human-authored content; generate `deck.mjs` and `slides.md` deterministically, with PPTX remaining a non-round-trip delivery artifact.
- 2026-07-16: Separate baseline artifact integrity, current-render pixel regression, and human review authority into independent gates; local `check` owns pixel regression while platform-neutral CI uses `check:ci`.
- 2026-07-16: Human visual authority must be an explicit external decision bound to the exact baseline manifest digest; agents may serialize but must not infer or self-sign that decision.
- 2026-07-16: Keep local font integrity and upstream provenance as separate claims. Use an opt-in network verifier for exact official-commit byte comparison; do not duplicate the same digest inside one mutable manifest or add remote availability to the default gate.

## Known Risks

<!-- Optional: track identified risks and mitigation status -->

- Generated Markdown could drift from the semantic source. Mitigation: `npm run render:check` fails when generated output is stale.
- Layout additions can silently reduce visual consistency. Mitigation: layouts remain allowlisted and each type has field limits in the validator.
- Build success does not prove visual polish. Mitigation: Phase B adds screenshot review; Phase A claims buildable structure only.
- Pixel output can vary across operating systems even with one font asset. Mitigation: the font and its load path are pinned; shared cross-platform pixel enforcement waits for platform-specific evidence.
- Editable PPTX references Noto Sans TC but does not embed the repo TTF. Mitigation: structural tests make the boundary explicit and cross-platform Office review remains the next gate.
- Third-party PPTX readers can interpret advanced OOXML effects differently. Mitigation: the renderer uses a conservative shape/effect surface and the final file passes artifact-tool render and overflow checks.
- Strict Markdown input is intentionally less expressive than arbitrary prose. Mitigation: unknown headings, missing fields, malformed structured items, and model-limit violations fail before either renderer runs.
- A committed authority receipt cannot by itself prove real-world reviewer identity. Mitigation: receipt validation binds the decision to exact baseline bytes, CODEOWNERS routes review, and branch protection remains the external enforcement boundary.
- The upstream font verifier depends on GitHub raw content availability and still cannot authenticate a reviewer. Mitigation: keep it outside default checks, restrict it to the official repository and pinned family path, and route font changes through CODEOWNERS review.
