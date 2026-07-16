# Pinned Chinese font asset

The theme uses the repo-local `NotoSansTC-VF.ttf` variable font for weights 100–900. It is copied from the official Google Fonts repository at commit `b950a7257470b900078f2bf3223823a8602de7e1` and distributed under the SIL Open Font License 1.1 in `OFL.txt`.

`font-manifest.json` records the pinned upstream path, file sizes, and SHA-256 digests. Run `npm run font:check` to reject local files that differ from the committed manifest. That offline command does not contact GitHub and therefore does not authenticate the recorded source commit.

Run `npm run font:provenance:verify` when upstream provenance must be re-established. It downloads all three assets from the official `google/fonts` repository at the exact 40-character commit and requires byte-for-byte and SHA-256 equality with the local files. The network-dependent verifier is intentionally outside the default local and CI gates.

Pinning the font source removes operating-system font fallback as an uncontrolled variable. It does not by itself prove pixel-identical rasterization across Windows, macOS, and Linux; that requires platform-specific browser evidence.
