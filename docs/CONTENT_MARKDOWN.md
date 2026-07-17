# Content Markdown contract

`decks/**/content.md` is the canonical human-authored deck content. The generated `deck.mjs`, generated `slides.md`, Slidev output, and PPTX output must not be used as round-trip sources.

## Default command

```powershell
npm run content:pptx
```

This command performs:

```text
decks/ai-governance/content.md
  -> model/content-markdown.mjs
  -> decks/ai-governance/deck.mjs
  -> model/slide-model.mjs validation
  -> scripts/render-pptx.mjs
  -> dist/ai-governance/ai-governance-editable.pptx
```

Use `npm run content:build` when only the generated Semantic Model module is needed. Use `npm run check` before commit.

## Document header

The first non-empty line is the deck title. One or more blockquote lines provide the description.

```md
# Deck title
> Audience-facing deck description.
```

## Slide and field syntax

Each slide starts with an allowlisted layout heading. Every layout field uses a level-three heading.

```md
## cover
### eyebrow
AI SLIDE DESIGN SYSTEM
### title
讓 AI 在受控設計空間中生成
### titleBreakAfter
讓 AI 在受控設計空間
### subtitle
從自由排版，轉向可重現的語意版型
```

Text fields may span multiple physical lines; the parser joins them with spaces. Tabs, unknown fields, duplicate fields, missing required fields, and prose outside a `###` field fail closed.

## Lists and structured items

Ordinary lists use Markdown bullets:

```md
### reasons
- 避免自由 CSS 漂移
- 讓品質證據可重現
- 保留人工審查邊界
```

Every array field currently requires exactly three entries. This applies to ordinary lists, process steps, architecture layers, and metrics. One-, two-, and four-item variants fail Semantic Model validation before either renderer runs. See [Array cardinality contract](CARDINALITY_CONTRACT.md) for the compatibility decision and migration guidance.

`titleBreakAfter` is optional on every layout. When present, it must be a
non-empty proper prefix of `title`. Both renderers use it as an explicit visual
line-break intent; changing the title without updating the prefix fails model
validation instead of silently changing the wrap.

Process steps and architecture layers use `title :: detail`:

```md
### steps
- 定義訊息 :: 每頁只保留一個核心觀點
- 產生證據 :: Build、截圖與人工審查
- 核准交付 :: 只交付通過 gate 的輸出
```

Metrics use `label :: value :: detail`:

```md
### metrics
- 語意版型 :: 10 :: 全部進入 allowlist
- 像素差異 :: 0.000% :: 同環境 regression
- 人工審查 :: PASS :: 綁定核准 baseline
```

## Required fields by layout

| Layout | Required fields |
| --- | --- |
| `cover` | `eyebrow`, `title`, `subtitle` |
| `key-message` | `eyebrow`, `title`, `subtitle`, `visual`, `evidence` |
| `comparison` | `title`, `accent`, `leftTitle`, `leftItems`, `rightTitle`, `rightItems` |
| `problem-solution` | `title`, `problemTitle`, `problemItems`, `solutionTitle`, `solutionItems` |
| `process` | `eyebrow`, `title`, `steps` |
| `architecture` | `eyebrow`, `title`, `layers` |
| `evidence` | `eyebrow`, `title`, `claim`, `status`, `sources` |
| `metrics` | `eyebrow`, `title`, `metrics` |
| `decision` | `eyebrow`, `title`, `decision`, `reasons`, `owner`, `nextAction` |
| `closing` | `eyebrow`, `title`, `summary`, `actions`, `nextAction` |

The Semantic Slide Model remains the authority for title length, list density, evidence status, allowed visuals, and other semantic limits. A Markdown file that is structurally valid can still fail model validation.

Semantic validation reports all independent model errors together in deterministic deck, slide, field, and item order. Fixing one field should not be required merely to reveal unrelated errors elsewhere in the same deck. Unknown layouts report their type and common-field errors without guessing at layout-specific fields.

## Generated ownership

- Edit: `decks/**/content.md`.
- Generate, do not edit: `decks/**/deck.mjs`.
- Generate, do not edit: `decks/**/slides.md`.
- Deliver, do not round-trip: `dist/**/*.pptx` and other `dist/**` artifacts.

Manual edits made in PowerPoint are intentionally not imported back. Preserve a change by expressing it in Content Markdown, the Semantic Model, the shared theme, or the renderer.
