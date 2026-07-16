# Phase B Screenshot Baseline Review

- Date: 2026-07-16
- Deck: `ai-governance`
- Scope: `cover`, `key-message`, `comparison`
- Viewport: 1280x720 at device scale factor 1
- Capture method: local Chrome headless through the Chrome DevTools Protocol
- Result: **APPROVED**

## Blocking finding resolved during review

The first capture exposed a renderer defect: three semantic slides produced five Slidev pages because the renderer inserted an extra horizontal rule between complete frontmatter blocks. Pages 2 and 4 were blank.

The renderer now joins complete slide blocks without an extra separator. `scripts/test-render-slidev.mjs` freezes the invariant that three semantic slides produce exactly three page frontmatters.

## Layout review

| Layout | Result | Review notes |
|---|---|---|
| `cover` | PASS | Clear title hierarchy, intentional two-line wrap, balanced visual anchor, no clipping or UI contamination. |
| `key-message` | PASS | Main claim, verification-gap visual, and evidence band remain distinct. Chinese labels replaced mixed-language operational labels. |
| `comparison` | PASS | Two-column alignment and contrast are clear. Explicit square markers restore list scanability. No overflow detected. |

## Approved baselines

- `tests/visual/baselines/ai-governance/01-cover.png`
- `tests/visual/baselines/ai-governance/02-key-message.png`
- `tests/visual/baselines/ai-governance/03-comparison.png`
- `tests/visual/baselines/ai-governance/manifest.json`

## Claim boundary

This review proves that the three current layouts rendered correctly in one Windows/Chrome environment and passed a first human visual inspection. It does not prove pixel identity across operating systems or font stacks. `npm run visual:test` is suitable for same-environment regression checks; promotion to cross-platform CI requires pinned font assets or per-platform baselines.
