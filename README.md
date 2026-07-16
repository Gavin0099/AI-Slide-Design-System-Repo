# AI Slide Design System

這個 repo 把投影片生成限制在可測試的設計空間：AI 決定訊息、語意版型與證據；renderer 決定 Slidev Markdown；theme 決定視覺結構。

## Phase A vertical slice

```text
decks/ai-governance/deck.mjs
        ↓ validate
model/slide-model.mjs
        ↓ render
decks/ai-governance/slides.md
        ↓ build with ../../theme
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
npm run visual:test
npm run pptx:build
npm run pptx:test
```

- `npm run render`：由 `deck.mjs` 產生 Slidev Markdown。
- `npm run render:check`：檢查 generated Markdown 是否與 semantic source 一致。
- `npm run lint`：檢查版型 allowlist、標題長度與內容密度。
- `npm run font:check`：驗證 repo-local Noto Sans TC、OFL 授權、來源 commit、檔案大小與 SHA-256。
- `npm run build`：輸出靜態 Slidev deck 到 `dist/ai-governance/`。
- `npm run visual:baseline:update`：以 1280×720 重新產生十張 baseline，並將 review status 重設為待人工審查。
- `npm run visual:baseline:check`：不啟動瀏覽器，驗證已核准 baseline 的尺寸與 SHA-256。
- `npm run visual:test`：以本機 Chrome 重新擷取圖片並執行 pixel diff；可用 `SLIDEV_BROWSER_PATH` 指定 Chrome-compatible executable。
- `npm run pptx:build`：從同一份 `deck.mjs` Semantic Model 輸出 `dist/ai-governance/ai-governance-editable.pptx`。
- `npm run pptx:test`：解開 OOXML 並驗證投影片數量、語意文字、原生可編輯物件、備註與無平面化圖片。

## Editable PPTX renderer

PptxGenJS renderer 支援與 Slidev 相同的十種 layout。文字、色塊、線條與圖形都是 PowerPoint 原生物件，不是整頁截圖；投影片備註保留 semantic layout 與來源路徑。

PPTX theme 指定 `Noto Sans TC`，但目前檔案不內嵌 repo 內的 TTF。在沒有安裝該字型的電腦上，PowerPoint 可能以系統字型取代，造成換行或字寬差異。

已核准的 baseline 位於 `tests/visual/baselines/ai-governance/`；本輪固定字型與十版型審查記錄在 `artifacts/evidence/visual-review/phase-b-p2-font-layout-review-20260716.md`。

Theme 使用 `theme/fonts/NotoSansTC-VF.ttf`，來源固定到官方 Google Fonts commit，capture runner 會在截圖前檢查本地字型資產請求與 400/800 字重。這能排除 OS 字型 fallback，但不同 OS 的 rasterizer 是否像素一致仍需各平台證據。

不要直接編輯 `decks/*/slides.md`。內容變更應先進入 `deck.mjs`，Slidev 與 editable PPTX renderer 都從同一 Semantic Model 輸出。

## Claim boundary

目前證明的是 pinned font asset、semantic model、十個 layout、兩個 renderer、lint、Slidev build、單一 Windows/Chrome 環境下的 screenshot baseline 與人工視覺審查，以及 PPTX 的原生物件與無溢出檢查。它不證明跨作業系統像素一致性、PPTX 字型內嵌、不同 PowerPoint 版本完全一致，或 PDF 匯出品質已驗證。
