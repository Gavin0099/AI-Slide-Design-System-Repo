# Slide Writing Guide

The semantic model keeps the content surface intentionally narrow.

- One slide communicates one core message.
- Titles are limited to 22 visible characters.
- Subtitles are limited to 36 visible characters.
- Lists contain at most three items.
- Evidence wording names what is observed; it does not upgrade a claim by itself.
- Generated `slides.md` is renderer output, not an authoring surface.

Phase A enforces these limits in `model/slide-model.mjs` and verifies them with `npm run lint`.

The owner-approved repository risk posture is `medium`: generated outputs are reversible, but model, renderer, theme, and dependency changes require build-backed review.
