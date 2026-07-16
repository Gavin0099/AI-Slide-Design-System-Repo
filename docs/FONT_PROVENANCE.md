# Font provenance verification

The font workflow separates local integrity from upstream provenance.

| Command | Uses network | Proves | Does not prove |
| --- | --- | --- | --- |
| `npm run font:check` | No | Local assets match the committed manifest sizes and SHA-256 values; the theme loads the repo-local family | That the manifest's source commit is authentic or that local bytes came from upstream |
| `npm run font:provenance:test` | No | URL pinning and byte/digest mismatch logic fail closed | Availability or contents of the real upstream repository |
| `npm run font:provenance:verify` | Yes | Local TTF, OFL, and metadata byte-match the official `google/fonts` files at the exact recorded commit | Cryptographic reviewer identity, immutable repository policy, or protection against a reviewed change to the manifest and verifier |

## Decision

Do not add a second `upstreamSha256` beside `sha256` in the same mutable manifest. Two equal values controlled by the same change are still self-consistency, not independent provenance.

Instead, the network verifier constructs raw URLs only under the official `google/fonts` repository and the `ofl/notosanstc/` family, downloads every recorded asset at the full 40-character commit, and compares the upstream bytes directly with both the local bytes and manifest digest.

The network verifier remains outside `npm run check` and `npm run check:ci`. Default development and pull-request gates stay deterministic and do not fail because GitHub raw content is temporarily unavailable. Run the upstream verifier when importing or changing font assets, reviewing a source commit change, or refreshing provenance evidence. A future scheduled workflow may be justified after remote-availability and rate-limit behavior are observed.

## Current pin

- Repository: `https://github.com/google/fonts`
- Commit: `b950a7257470b900078f2bf3223823a8602de7e1`
- Family path: `ofl/notosanstc/`
- TTF SHA-256: `864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f`
- OFL SHA-256: `1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9`
- Metadata SHA-256: `213cbcf6933d48c55d36c95d8253b053cd44d6099f275a691a510b234e325e43`
