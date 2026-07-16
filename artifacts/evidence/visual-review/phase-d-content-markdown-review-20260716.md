# Phase D Content Markdown review

- Date: 2026-07-16
- Canonical input: `decks/ai-governance/content.md`
- Generated semantic module: `decks/ai-governance/deck.mjs`
- Delivery: `dist/ai-governance/ai-governance-editable.pptx`
- Review status: approved

## Contract evidence

- `npm run content:check` proves the committed `deck.mjs` is the deterministic projection of `content.md`.
- `npm run content:test` exercises the committed fixture plus unknown-layout, missing-field, malformed-structured-item, duplicate-field, and Semantic Model limit failures.
- `npm run content:pptx` completes the default `content.md -> deck.mjs -> editable PPTX` path.
- CRLF and LF generated-file comparisons are normalized so the freshness gate remains stable on the governed Windows checkout.

## Render evidence

- `npm run pptx:test` reports ten semantic slides, native editable text/shapes, provenance notes, and no flattened slide pictures.
- `npm run visual:test` reports `0.000%` pixel difference for all ten Slidev baselines.
- The presentation artifact-tool pipeline rendered all ten PPTX pages; every page was inspected individually at full size for overflow, clipping, wrapping, hierarchy, and unintended overlap.
- `slides_test.py` reports no slide-canvas overflow.

## Claim boundary

This review proves the fixed Markdown fixture can deterministically reproduce the current Semantic Model and editable PPTX in the reviewed Windows toolchain. It does not turn arbitrary prose Markdown into a deck: callers must follow the documented layout and field contract. It also does not prove identical font substitution or pixels across operating systems and PowerPoint versions.
