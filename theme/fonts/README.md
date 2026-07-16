# Pinned Chinese font asset

The theme uses the repo-local `NotoSansTC-VF.ttf` variable font for weights 100–900. It is copied from the official Google Fonts repository at commit `b950a7257470b900078f2bf3223823a8602de7e1` and distributed under the SIL Open Font License 1.1 in `OFL.txt`.

`font-manifest.json` records the immutable upstream path, file sizes, and SHA-256 digests. Run `npm run font:check` to reject missing, replaced, or system-font-dependent assets.

Pinning the font source removes operating-system font fallback as an uncontrolled variable. It does not by itself prove pixel-identical rasterization across Windows, macOS, and Linux; that requires platform-specific browser evidence.
