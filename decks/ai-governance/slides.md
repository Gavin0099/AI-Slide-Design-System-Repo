---
theme: "../../theme"
title: "AI 投影片設計系統"
info: "以受控語意版型呈現 AI 治理訊息的第一個垂直切片。"
layout: "cover"
eyebrow: "AI SLIDE DESIGN SYSTEM"
---

# 讓 AI 在受控設計空間中生成

## 從自由排版，轉向可重現的語意版型

---
layout: "key-message"
eyebrow: "核心觀念"
visual: "verification-gap"
---

# AI 能產生答案

## 但不能自行證明答案正確

::evidence::

缺少外部驗證時，完成宣稱仍然只是模型的自我陳述。

---
layout: "comparison"
leftTitle: "傳統 AI 工作流"
rightTitle: "可驗證 AI 工作流"
accent: "governance"
---

# 從生成結果走向驗證證據

::left::

- 執行任務
- 回報完成
- 人工判斷真假

::right::

- 宣告範圍
- 產生證據
- 限制可宣稱內容

---
layout: "problem-solution"
problemTitle: "每頁重新設計"
solutionTitle: "使用語意版型"
---

# 從自由排版轉成受控生成

::problem::

- 版面風格漂移
- 規則無法測試
- 修改成本反覆發生

::solution::

- AI 選擇表達意圖
- Renderer 固定結構
- Theme 維持視覺一致

---
layout: "process"
eyebrow: "CONTROLLED GENERATION"
steps: [{"title":"定義訊息","detail":"每頁只保留一個核心觀點"},{"title":"選擇版型","detail":"只使用允許的語意 layout"},{"title":"產生證據","detail":"Build、截圖與人工審查"}]
---

# 把內容意圖變成可審查投影片

---
layout: "architecture"
eyebrow: "SYSTEM ARCHITECTURE"
layers: [{"title":"AI 決策層","detail":"決定訊息、版型與需要呈現的證據"},{"title":"Semantic Model","detail":"限制欄位、內容密度與允許的版型"},{"title":"Renderer + Theme","detail":"把模型轉成可重現的 Slidev 視覺"}]
---

# 三層約束形成一致輸出

---
layout: "evidence"
eyebrow: "EVIDENCE CHAIN"
claim: "六個語意版型已通過 build、截圖與人工審查。"
status: "verified"
sources: ["Semantic model tests","Visual baseline manifest","Human review record"]
---

# 讓證據決定可宣稱範圍

---
layout: "metrics"
eyebrow: "QUALITY METRICS"
metrics: [{"label":"語意版型","value":"10","detail":"全部進入 allowlist"},{"label":"視覺基準","value":"10/10","detail":"固定尺寸並完成審查"},{"label":"像素差異","value":"0.000%","detail":"同環境 regression"}]
---

# 用少數指標呈現品質狀態

---
layout: "decision"
eyebrow: "GOVERNANCE DECISION"
decision: "只有通過模型、建置與視覺審查的版型才能加入 allowlist。"
reasons: ["避免自由 CSS 漂移","讓品質證據可重現","保留可宣稱邊界"]
owner: "Slide Design System Maintainer"
nextAction: "先固定輸出環境，再評估 editable PPTX renderer。"
---

# 把版型擴充變成治理決策

---
layout: "closing"
eyebrow: "CONTROLLED SCALE"
summary: "AI 負責內容意圖，系統負責版型、證據與一致性。"
actions: ["以十種 layout 建立正式 deck","在 CI 驗證固定字型資產","規劃 PptxGenJS renderer"]
nextAction: "下一階段：同一 Semantic Model 輸出 editable PPTX。"
---

# 受控生成已形成可擴充底座
