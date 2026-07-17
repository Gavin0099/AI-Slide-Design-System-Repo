# Cross-platform PowerPoint render evidence

This gate answers one narrow question: can Windows PowerPoint and macOS PowerPoint enforce one shared pixel baseline for the same generated PPTX?

It does not treat Slidev, LibreOffice, artifact-tool, PDF conversion, or screenshots of the PowerPoint editing canvas as Microsoft Office evidence.

## Required evidence

Before a shared baseline can become a candidate, collect all of the following:

- two independent per-slide PNG exports from licensed Microsoft PowerPoint on Windows;
- two independent per-slide PNG exports from licensed Microsoft PowerPoint on macOS;
- the same source PPTX SHA-256 in every receipt;
- confirmed local installation of `Noto Sans TC` on every capture host;
- one slide count and one pixel dimension across all runs;
- deterministic hashes within each platform.

The collector rejects a `windows` receipt outside `win32` and a `macos` receipt outside `darwin`. This prevents a Windows host from fabricating a structurally valid macOS receipt by changing a command-line label. The receipt remains operator-attested: it cannot authenticate Office licensing, the PowerPoint process, or the operator identity.

## Capture

Build the governed deck first:

```text
npm run pptx:build
```

Open `dist/ai-governance/ai-governance-editable.pptx` in Microsoft PowerPoint. Confirm the product is licensed, confirm `Noto Sans TC` is installed rather than substituted, and export every slide as PNG. Use 1600x900 when the Office version exposes explicit dimensions. Repeat into a new empty directory without modifying the deck.

Microsoft documents `Presentation.Export(Path, FilterName, ScaleWidth, ScaleHeight)` as the Windows object-model method for per-slide PNG export: <https://learn.microsoft.com/en-us/office/vba/api/powerpoint.presentation.export>.

Create a receipt on the same host that performed the export:

```text
npm run office:evidence:collect -- \
  --platform windows \
  --powerpoint-version "<exact About PowerPoint version>" \
  --pptx dist/ai-governance/ai-governance-editable.pptx \
  --render-dir <absolute export directory> \
  --run-id windows-1 \
  --font-status installed \
  --license-status licensed \
  --width 1600 \
  --height 900 \
  --operator <operator> \
  --output <absolute receipt path>
```

Use `--platform macos` on the Mac. Produce `windows-1`, `windows-2`, `macos-1`, and `macos-2` receipts. Do not copy PNGs or receipts between hosts and relabel them.

## Decision

Compare all four receipts:

```text
npm run office:evidence:compare -- \
  --windows <windows-1.json> \
  --windows <windows-2.json> \
  --macos <macos-1.json> \
  --macos <macos-2.json> \
  --output <decision.json>
```

Decision meanings:

| Decision | CI policy |
| --- | --- |
| `not_enough_evidence` | Keep shared Office pixel enforcement disabled. |
| `invalid_evidence` | Reject the receipt set; recapture the same deck under the declared hosts. |
| `unstable_platform_render` | Do not enforce an Office pixel baseline until repeated exports stabilize. |
| `per_platform_baselines_required` | Maintain separately reviewed Windows and macOS Office baselines. |
| `shared_baseline_candidate` | Route the exact shared manifest and full-size PNGs to human authority review before enabling CI. |

The comparator never grants human approval and never edits CI. A `shared_baseline_candidate` is evidence for review, not permission to enable enforcement.

## Current decision

As of 2026-07-17, the available Windows PowerPoint installation opens an unlicensed-product sign-in gate before the deck, and no macOS Office host is attached to this workspace. Therefore no Windows or macOS Office render receipt exists, and the current decision is `not_enough_evidence`. The shared Office pixel baseline remains disabled.
