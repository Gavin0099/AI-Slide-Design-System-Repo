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

目前提供三種語意版型：

- `cover`
- `key-message`
- `comparison`

## Commands

```powershell
npm install
npm run dev
npm run check
```

- `npm run render`：由 `deck.mjs` 產生 Slidev Markdown。
- `npm run render:check`：檢查 generated Markdown 是否與 semantic source 一致。
- `npm run lint`：檢查版型 allowlist、標題長度與內容密度。
- `npm run build`：輸出靜態 Slidev deck 到 `dist/ai-governance/`。

不要直接編輯 `decks/*/slides.md`。內容變更應先進入 `deck.mjs`，讓相同 semantic model 未來能同時供 Slidev 與 editable PPTX renderer 使用。

## Claim boundary

Phase A 證明的是 semantic model、三個 layout、renderer、lint 與 Slidev build 能形成可執行的垂直切片。它不證明完整 layout library、跨環境視覺一致性、PDF/PPTX 匯出品質或 editable PPTX renderer 已完成。
