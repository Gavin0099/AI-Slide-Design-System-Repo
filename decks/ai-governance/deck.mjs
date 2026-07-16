import { defineDeck } from '../../model/slide-model.mjs'

export default defineDeck({
  title: 'AI 投影片設計系統',
  description: '以受控語意版型呈現 AI 治理訊息的第一個垂直切片。',
  slides: [
    {
      type: 'cover',
      eyebrow: 'AI SLIDE DESIGN SYSTEM',
      title: '讓 AI 在受控設計空間中生成',
      subtitle: '從自由排版，轉向可重現的語意版型',
    },
    {
      type: 'key-message',
      eyebrow: '核心觀念',
      title: 'AI 能產生答案',
      subtitle: '但不能自行證明答案正確',
      visual: 'verification-gap',
      evidence: '缺少外部驗證時，完成宣稱仍然只是模型的自我陳述。',
    },
    {
      type: 'comparison',
      title: '從生成結果走向驗證證據',
      accent: 'governance',
      left: {
        title: '傳統 AI 工作流',
        items: ['執行任務', '回報完成', '人工判斷真假'],
      },
      right: {
        title: '可驗證 AI 工作流',
        items: ['宣告範圍', '產生證據', '限制可宣稱內容'],
      },
    },
  ],
})
