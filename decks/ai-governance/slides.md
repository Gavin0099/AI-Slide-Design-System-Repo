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
