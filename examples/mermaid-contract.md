# Mermaid 圖表契約
> 受限 flowchart、subgraph 與 sequenceDiagram 共用固定 SVG。

## mermaid
### eyebrow
FLOWCHART
### title
治理證據流程
### subtitle
顏色代表語意角色；內容仍是受限 Mermaid，不接受任意 CSS 或外部資源。
### diagram
```mermaid
flowchart LR
  task[任務輸入] --> gate[治理檢查]
  gate --> agent[AI 執行]
  agent --> evidence[證據驗證]
  evidence --> human[人類裁決]
  class task input
  class gate governance
  class agent agent
  class evidence tool
  class human outcome
```
### caption
固定角色色票讓責任與產出可被快速辨識。

## mermaid
### eyebrow
ARCHITECTURE
### title
Prompt、Skill、Agent、Harness 與 Governance 的關係
### subtitle
Prompt 與 Skill 提供任務與做法；Agent 在 Harness 中執行；Governance 橫跨流程並要求證據。
### diagram
```mermaid
flowchart LR
  prompt(使用者任務 / Prompt) --> agent[AI Agent]
  skill[Skill 能力包] --> agent
  subgraph HARNESS[Harness 執行框架]
    direction TB
    agent --> tools[工具、終端、檔案、測試]
    tools --> repo[(Driver / Firmware Repo)]
  end
  repo --> outcome[差異、測試、風險、結案]
  outcome --> governance[Governance 治理層]
  governance -.-> agent
  governance -.-> tools
  class prompt input
  class skill capability
  class agent agent
  class tools tool
  class repo repository
  class outcome outcome
  class governance governance
  class HARNESS boundary
```
### caption
虛線框表示執行與治理邊界；點線箭頭表示治理回饋，不代表執行資料流。

## mermaid
### eyebrow
SEQUENCE
### title
一次任務的治理時序
### subtitle
把權限釋放、執行、證據回傳與人類結論分成可追蹤的交接點。
### diagram
```mermaid
sequenceDiagram
  participant U as 使用者
  participant G as 治理閘門
  participant A as AI Agent
  U->>G: 提交任務
  G->>A: 釋放核准任務
  A-->>G: 回傳結果與證據
  G-->>U: 回報驗證結論
```
### caption
時序圖只允許參與者、訊息、註記與受限控制區塊。
