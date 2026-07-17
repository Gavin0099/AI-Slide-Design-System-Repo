# AI 投影片設計系統
> 以受控語意版型呈現 AI 治理訊息的第一個垂直切片。

## cover
### eyebrow
AI SLIDE DESIGN SYSTEM
### title
讓 AI 在受控設計空間中生成
### titleBreakAfter
讓 AI 在受控設計空間
### subtitle
從自由排版，轉向可重現的語意版型

## key-message
### eyebrow
核心觀念
### title
AI 能產生答案
### subtitle
但不能自行證明答案正確
### visual
verification-gap
### evidence
缺少外部驗證時，完成宣稱仍然只是模型的自我陳述。

## comparison
### title
從生成結果走向驗證證據
### accent
governance
### leftTitle
傳統 AI 工作流
### leftItems
- 執行任務
- 回報完成
- 人工判斷真假
### rightTitle
可驗證 AI 工作流
### rightItems
- 宣告範圍
- 產生證據
- 限制可宣稱內容

## problem-solution
### title
從自由排版轉成受控生成
### problemTitle
每頁重新設計
### problemItems
- 版面風格漂移
- 規則無法測試
- 修改成本反覆發生
### solutionTitle
使用語意版型
### solutionItems
- AI 選擇表達意圖
- Renderer 固定結構
- Theme 維持視覺一致

## process
### eyebrow
CONTROLLED GENERATION
### title
把內容意圖變成可審查投影片
### steps
- 定義訊息 :: 每頁只保留一個核心觀點
- 選擇版型 :: 只使用允許的語意 layout
- 產生證據 :: Build、截圖與人工審查

## architecture
### eyebrow
SYSTEM ARCHITECTURE
### title
三層約束形成一致輸出
### layers
- AI 決策層 :: 決定訊息、版型與需要呈現的證據
- Semantic Model :: 限制欄位、內容密度與允許的版型
- Renderer + Theme :: 把模型轉成可重現的 Slidev 與 editable PPTX

## evidence
### eyebrow
EVIDENCE CHAIN
### title
讓證據決定可宣稱範圍
### claim
十個語意版型已通過 build、截圖與人工審查。
### status
verified
### sources
- Semantic model tests
- Visual baseline manifest
- Human review record

## metrics
### eyebrow
QUALITY METRICS
### title
用少數指標呈現品質狀態
### metrics
- 語意版型 :: 10 :: 全部進入 allowlist
- 視覺基準 :: 10/10 :: 固定尺寸並完成審查
- 像素差異 :: 0.000% :: 同環境 regression

## decision
### eyebrow
GOVERNANCE DECISION
### title
把版型擴充變成治理決策
### decision
只有通過模型、建置與視覺審查的版型才能加入 allowlist。
### reasons
- 避免自由 CSS 漂移
- 讓品質證據可重現
- 保留可宣稱邊界
### owner
Slide Design System Maintainer
### nextAction
驗證 editable PPTX 的可編輯性、版面與跨平台字型邊界。

## closing
### eyebrow
CONTROLLED SCALE
### title
受控生成已形成可擴充底座
### summary
AI 負責內容意圖，系統負責版型、證據與一致性。
### actions
- 以十種 layout 建立正式 deck
- 在 CI 驗證固定字型資產
- 交付 editable PPTX renderer
### nextAction
下一階段：蒐集跨平台 PPTX 與像素輸出證據。
