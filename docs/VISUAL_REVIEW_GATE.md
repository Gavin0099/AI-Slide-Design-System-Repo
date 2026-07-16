# Visual review gate

The visual gate separates three claims that must not be collapsed:

1. `npm run visual:baseline:check` verifies committed PNG dimensions and SHA-256 values. It does not render the current deck.
2. `npm run visual:test` renders the current deck and performs pixel comparison against the committed baseline.
3. `npm run visual:authority:check` validates that an explicit human decision is recorded and bound to the exact baseline manifest digest.

`npm run check` is the local Windows/Chrome gate and includes current-render pixel comparison. `npm run check:ci` is the platform-neutral GitHub Actions gate and intentionally excludes pixel comparison until cross-platform evidence supports one shared baseline.

## Human authority contract

The canonical authority receipt is:

```text
tests/visual/baselines/ai-governance/review-authority.json
```

The receipt must use schema `visual-review-authority.v1`, identify a human reviewer, record an explicit `approved` decision, reference the review evidence, and bind the decision to the SHA-256 of `manifest.json`. An agent may serialize a decision only after the named human explicitly makes that decision; it must not infer, pre-generate, or self-sign approval.

Updating screenshot baselines removes the previous receipt because approval for an older manifest cannot authorize new pixels. The full-size images under `artifacts/runtime/visual/current/` must be inspected before a replacement receipt is recorded.

The receipt validator proves schema and digest binding. It cannot prove the real-world identity of the reviewer by itself. `.github/CODEOWNERS` routes relevant pull-request review to `@Gavin0099`; GitHub branch protection must require that review if independent platform enforcement is desired. A direct-push workflow must retain an external reference to the explicit human decision.
