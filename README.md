# AI Slide Design System

這個 repo 把投影片生成限制在可測試的設計空間：AI 決定訊息、語意版型與證據；renderer 決定 Slidev Markdown；theme 決定視覺結構。

## Phase A vertical slice

```text
decks/ai-governance/content.md
        ↓ parse + validate
decks/ai-governance/deck.mjs
        ↓ render
model/slide-model.mjs
        ↓ shared contract
decks/ai-governance/slides.md
        ↘ Slidev          ↘ PptxGenJS
             dist/ai-governance/
```

目前提供十種語意版型：

- `cover`
- `key-message`
- `comparison`
- `problem-solution`
- `process`
- `architecture`
- `evidence`
- `metrics`
- `decision`
- `closing`

## Commands

```powershell
npm install
npm run dev
npm run check
npm run check:ci
npm run font:provenance:verify
npm run visual:test
npm run visual:authority:check
npm run content:pptx
npm run pptx:build
npm run pptx:test
```

- `npm run content:build`：將 `content.md` 解析、驗證並產生 `deck.mjs`。
- `npm run content:check`：檢查 generated `deck.mjs` 是否與 `content.md` 一致。
- `npm run content:test`：驗證固定 Markdown contract、deterministic projection 與 failure paths。
- `npm run content:pptx`：一次完成 `content.md → deck.mjs → editable PPTX`。
- `npm run render`：先由 `content.md` 更新 `deck.mjs`，再產生 Slidev Markdown。
- `npm run render:check`：檢查 generated Markdown 是否與 semantic source 一致。
- `npm run lint`：檢查版型 allowlist、標題長度與內容密度。
- `npm run font:check`：離線驗證 repo-local Noto Sans TC、OFL、metadata、檔案大小與 committed manifest SHA-256；只記錄來源欄位，不會連線或證明檔案來自該 upstream commit。
- `npm run font:provenance:verify`：從官方 `google/fonts` 固定 commit 下載三個 source assets，逐 byte 與 SHA-256 比對本地檔案；此命令依賴網路，因此不屬於預設 `check` / `check:ci`。
- `npm run build`：輸出靜態 Slidev deck 到 `dist/ai-governance/`。
- `npm run visual:baseline:update`：以 1280×720 重新產生十張 baseline，並將 review status 重設為待人工審查。
- `npm run check`：本機完整 gate，包含目前畫面相對 baseline 的 pixel regression。
- `npm run check:ci`：跨平台 CI gate；在共用 pixel baseline 有平台證據前不執行 pixel regression。
- `npm run visual:baseline:check`：不啟動瀏覽器，只驗證 committed baseline 的尺寸與 SHA-256；不代表目前 render 或 human approval 已通過。
- `npm run visual:test`：以本機 Chrome 重新擷取圖片並執行 pixel diff；可用 `SLIDEV_BROWSER_PATH` 指定 Chrome-compatible executable。
- `npm run visual:authority:check`：驗證 human decision receipt 的 schema 與 baseline manifest digest binding；authority 邊界見 `docs/VISUAL_REVIEW_GATE.md`。
- `npm run pptx:build`：先更新 `deck.mjs`，再從同一 Semantic Model 輸出 `dist/ai-governance/ai-governance-editable.pptx`。
- `npm run pptx:test`：解開 OOXML 並驗證投影片數量、語意文字、原生可編輯物件、備註與無平面化圖片。

## Editable PPTX renderer

PptxGenJS renderer 支援與 Slidev 相同的十種 layout。文字、色塊、線條與圖形都是 PowerPoint 原生物件，不是整頁截圖；投影片備註保留 semantic layout 與來源路徑。

PPTX theme 指定 `Noto Sans TC`，但目前檔案不內嵌 repo 內的 TTF。在沒有安裝該字型的電腦上，PowerPoint 可能以系統字型取代，造成換行或字寬差異。

## Content Markdown

之後新增或修改簡報內容時，只編輯 `decks/ai-governance/content.md`，再執行 `npm run content:pptx`。格式使用 `## <layout>` 切分投影片、`### <field>` 定義欄位，清單使用 Markdown bullets，結構化項目使用 ` :: ` 分隔。完整 contract 見 `docs/CONTENT_MARKDOWN.md`。

已核准的 baseline 位於 `tests/visual/baselines/ai-governance/`；本輪固定字型與十版型審查記錄在 `artifacts/evidence/visual-review/phase-b-p2-font-layout-review-20260716.md`。

Theme 使用 `theme/fonts/NotoSansTC-VF.ttf`，來源固定到官方 Google Fonts commit，capture runner 會在截圖前檢查本地字型資產請求與 400/800 字重。這能排除 OS 字型 fallback，但不同 OS 的 rasterizer 是否像素一致仍需各平台證據。

不要直接編輯 `decks/*/deck.mjs` 或 `decks/*/slides.md`。內容變更應先進入 `content.md`，再由相同 Semantic Model 輸出 Slidev 與 editable PPTX。

## Claim boundary

目前證明的是 pinned font asset、semantic model、十個 layout、兩個 renderer、lint、Slidev build、單一 Windows/Chrome 環境下的 screenshot baseline 與人工視覺審查，以及 PPTX 的原生物件與無溢出檢查。它不證明跨作業系統像素一致性、PPTX 字型內嵌、不同 PowerPoint 版本完全一致，或 PDF 匯出品質已驗證。
