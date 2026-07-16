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

目前提供六種語意版型：

- `cover`
- `key-message`
- `comparison`
- `problem-solution`
- `process`
- `architecture`

## Commands

```powershell
npm install
npm run dev
npm run check
npm run visual:test
```

- `npm run render`：由 `deck.mjs` 產生 Slidev Markdown。
- `npm run render:check`：檢查 generated Markdown 是否與 semantic source 一致。
- `npm run lint`：檢查版型 allowlist、標題長度與內容密度。
- `npm run build`：輸出靜態 Slidev deck 到 `dist/ai-governance/`。
- `npm run visual:baseline:update`：以 1280×720 重新產生六張 baseline，並將 review status 重設為待人工審查。
- `npm run visual:baseline:check`：不啟動瀏覽器，驗證已核准 baseline 的尺寸與 SHA-256。
- `npm run visual:test`：以本機 Chrome 重新擷取圖片並執行 pixel diff；可用 `SLIDEV_BROWSER_PATH` 指定 Chrome-compatible executable。

已核准的 baseline 位於 `tests/visual/baselines/ai-governance/`；初始三版型與 P1 擴充審查分別記錄在 `artifacts/evidence/visual-review/phase-b-baseline-review-20260716.md` 與 `phase-b-p1-layout-review-20260716.md`。

不要直接編輯 `decks/*/slides.md`。內容變更應先進入 `deck.mjs`，讓相同 semantic model 未來能同時供 Slidev 與 editable PPTX renderer 使用。

## Claim boundary

目前證明的是 semantic model、六個 layout、renderer、lint、Slidev build，以及單一 Windows/Chrome 環境下的 screenshot baseline 與人工視覺審查。它不證明完整 layout library、跨作業系統像素一致性、PDF/PPTX 匯出品質或 editable PPTX renderer 已完成。
