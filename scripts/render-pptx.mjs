import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import pptxgen from 'pptxgenjs'
import deck from '../decks/ai-governance/deck.mjs'
import { validateDeck } from '../model/slide-model.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const defaultPptxOutput = path.join(repoRoot, 'dist', 'ai-governance', 'ai-governance-editable.pptx')

// PptxGenJS 4 exposes the shape catalog on presentation instances. Keep the
// renderer call sites declarative without creating a second live deck.
pptxgen.ShapeType = new pptxgen().ShapeType

const FONT = 'Noto Sans TC'
const W = 13.333
const H = 7.5
const C = Object.freeze({
  bg: 'F5F7FB',
  surface: 'FFFFFF',
  ink: '122033',
  muted: '5B6678',
  line: 'DBE2EC',
  accent: '4D57C8',
  accentStrong: '2F388F',
  cyan: '29A8B7',
  warning: 'E58D2D',
  success: '24856F',
  danger: 'C94F5E',
})

// Keep the OOXML effect surface conservative. Some third-party PPTX readers
// overflow while parsing PptxGenJS outer-shadow values after slide scaling.
const shadow = undefined

function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: FONT,
    fontSize: 18,
    color: C.ink,
    margin: 0,
    breakLine: false,
    fit: 'shrink',
    valign: 'mid',
    ...options,
  })
}

function addDecor(slide) {
  slide.background = { color: C.bg }
  slide.addShape(pptxgen.ShapeType.ellipse, {
    x: 10.72, y: 0.12, w: 2.4, h: 2.4,
    line: { color: C.accent, transparency: 100 },
    fill: { color: 'E8EAFF', transparency: 44 },
  })
}

function addEyebrow(slide, text, color = C.accent) {
  addText(slide, text, 0.88, 0.62, 5.4, 0.28, {
    fontSize: 11,
    bold: true,
    color,
    charSpacing: 2.2,
  })
}

function addTitle(slide, text, y = 0.94, color = C.ink, fontSize = 36) {
  addText(slide, text, 0.88, y, 11.57, 0.66, {
    fontSize,
    bold: true,
    color,
    breakLine: false,
  })
}

function addCard(slide, x, y, w, h, options = {}) {
  slide.addShape(pptxgen.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: options.fill ?? C.surface, transparency: options.transparency ?? 0 },
    line: { color: options.line ?? C.line, width: options.lineWidth ?? 1 },
    shadow: options.shadow === false ? undefined : shadow,
  })
}

function addList(slide, items, x, y, w, options = {}) {
  const gap = options.gap ?? 0.54
  items.forEach((item, index) => {
    slide.addShape(options.marker === 'dash' ? pptxgen.ShapeType.line : pptxgen.ShapeType.rect, {
      x,
      y: y + index * gap + (options.marker === 'dash' ? 0.18 : 0.17),
      w: options.marker === 'dash' ? 0.12 : 0.09,
      h: options.marker === 'dash' ? 0 : 0.09,
      line: { color: options.color ?? C.accent, width: options.marker === 'dash' ? 1.6 : 0 },
      fill: { color: options.color ?? C.accent },
    })
    addText(slide, item, x + 0.28, y + index * gap, w - 0.28, 0.38, {
      fontSize: options.fontSize ?? 18,
      color: options.textColor ?? C.ink,
      bold: options.bold ?? false,
    })
  })
}

function titleText(model) {
  if (!model.titleBreakAfter) return model.title
  return `${model.titleBreakAfter}\n${model.title.slice(model.titleBreakAfter.length)}`
}

function renderCover(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addEyebrow(slide, model.eyebrow)
  addText(slide, titleText(model), 0.88, 2.56, 7.2, 1.66, {
    fontSize: 50,
    bold: true,
    breakLine: true,
    valign: 'mid',
  })
  addText(slide, model.subtitle, 0.88, 4.48, 7.1, 0.48, { fontSize: 22, color: C.muted })
  slide.addShape(pptxgen.ShapeType.ellipse, {
    x: 9.02, y: 2.02, w: 3.42, h: 3.42,
    fill: { color: C.surface },
    line: { color: 'D4D8F6', width: 1.2 },
    shadow,
  })
  slide.addShape(pptxgen.ShapeType.ellipse, {
    x: 9.52, y: 2.52, w: 2.42, h: 2.42,
    fill: { color: C.surface, transparency: 100 },
    line: { color: 'D4D8F6', width: 1.2 },
  })
  addText(slide, 'AI', 10.05, 3.2, 1.36, 0.64, { fontSize: 42, bold: true, color: C.accentStrong, align: 'center' })
  slide.addNotes(`Semantic layout: cover\nSource: decks/ai-governance/deck.mjs`)
}

function renderKeyMessage(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addEyebrow(slide, model.eyebrow)
  addText(slide, titleText(model), 0.88, 2.55, 6.2, 0.75, { fontSize: 43, bold: true })
  addText(slide, model.subtitle, 0.88, 3.46, 6.25, 0.5, { fontSize: 22, color: C.muted })
  addCard(slide, 8.38, 2.18, 4.05, 2.55)
  slide.addShape(pptxgen.ShapeType.roundRect, { x: 8.7, y: 2.5, w: 3.4, h: 0.68, fill: { color: C.accent }, line: { color: C.accent } })
  addText(slide, '生成', 8.7, 2.5, 3.4, 0.68, { fontSize: 18, bold: true, color: 'FFFFFF', align: 'center' })
  slide.addShape(pptxgen.ShapeType.line, { x: 8.7, y: 3.48, w: 1.38, h: 0, line: { color: C.danger, width: 1.3 } })
  slide.addShape(pptxgen.ShapeType.line, { x: 10.72, y: 3.48, w: 1.38, h: 0, line: { color: C.danger, width: 1.3 } })
  addText(slide, '驗證缺口', 10.02, 3.3, 0.78, 0.36, { fontSize: 10, bold: true, color: C.danger, align: 'center' })
  slide.addShape(pptxgen.ShapeType.roundRect, { x: 8.7, y: 3.76, w: 3.4, h: 0.68, fill: { color: C.success }, line: { color: C.success } })
  addText(slide, '驗證', 8.7, 3.76, 3.4, 0.68, { fontSize: 18, bold: true, color: 'FFFFFF', align: 'center' })
  addCard(slide, 0.88, 5.95, 11.56, 0.76, { shadow: false })
  slide.addShape(pptxgen.ShapeType.roundRect, { x: 1.12, y: 6.16, w: 0.62, h: 0.34, fill: { color: C.accent }, line: { color: C.accent } })
  addText(slide, '證據', 1.12, 6.16, 0.62, 0.34, { fontSize: 10, bold: true, color: 'FFFFFF', align: 'center' })
  addText(slide, model.evidence, 1.94, 6.08, 9.92, 0.46, { fontSize: 15, color: C.muted })
  slide.addNotes(`Semantic layout: key-message\nVisual: ${model.visual}`)
}

function renderComparison(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addTitle(slide, titleText(model), 0.62, C.ink, 36)
  const columns = [
    { x: 0.88, data: model.left, accent: C.muted, fill: C.surface },
    { x: 6.83, data: model.right, accent: C.accent, fill: 'F1F2FF' },
  ]
  columns.forEach(column => {
    addCard(slide, column.x, 1.78, 5.62, 4.95, { line: column.accent, fill: column.fill })
    addText(slide, column.data.title, column.x + 0.4, 2.18, 4.82, 0.44, { fontSize: 17, bold: true, color: column.accent })
    addList(slide, column.data.items, column.x + 0.42, 2.86, 4.74, { color: column.accent, gap: 0.58, fontSize: 19 })
  })
  slide.addNotes('Semantic layout: comparison')
}

function renderProblemSolution(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addTitle(slide, titleText(model), 0.62, C.ink, 36)
  slide.addShape(pptxgen.ShapeType.chevron, { x: 6.28, y: 3.64, w: 0.5, h: 0.48, fill: { color: C.accent }, line: { color: C.accent } })
  const cards = [
    { x: 0.88, data: model.problem, label: '問題', accent: C.danger, fill: 'FFF6F7' },
    { x: 7.05, data: model.solution, label: '解法', accent: C.success, fill: 'F2FBF8' },
  ]
  cards.forEach(card => {
    addCard(slide, card.x, 1.78, 5.42, 4.95, { line: card.accent, lineWidth: 1.4, fill: card.fill })
    addText(slide, card.label, card.x + 0.4, 2.12, 1.5, 0.28, { fontSize: 11, bold: true, color: C.muted, charSpacing: 1.8 })
    addText(slide, card.data.title, card.x + 0.4, 2.48, 4.6, 0.48, { fontSize: 21, bold: true })
    addList(slide, card.data.items, card.x + 0.42, 3.16, 4.46, { marker: 'dash', color: C.ink, gap: 0.55, fontSize: 17 })
  })
  slide.addNotes('Semantic layout: problem-solution')
}

function renderProcess(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addEyebrow(slide, model.eyebrow)
  addTitle(slide, titleText(model), 0.94, C.ink, 36)
  slide.addShape(pptxgen.ShapeType.line, { x: 1.56, y: 2.75, w: 9.98, h: 0, line: { color: C.cyan, width: 2 } })
  const cardW = 3.66
  model.steps.forEach((step, index) => {
    const x = 0.88 + index * 3.94
    addCard(slide, x, 2.32, cardW, 4.1)
    slide.addShape(pptxgen.ShapeType.ellipse, { x: x + 0.32, y: 2.48, w: 0.62, h: 0.62, fill: { color: C.accent }, line: { color: C.bg, width: 4 } })
    addText(slide, String(index + 1).padStart(2, '0'), x + 0.32, 2.48, 0.62, 0.62, { fontSize: 13, bold: true, color: 'FFFFFF', align: 'center' })
    addText(slide, step.title, x + 0.32, 3.5, cardW - 0.64, 0.46, { fontSize: 21, bold: true })
    addText(slide, step.detail, x + 0.32, 4.1, cardW - 0.64, 0.72, { fontSize: 16, color: C.muted, valign: 'top' })
  })
  slide.addNotes('Semantic layout: process')
}

function renderArchitecture(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addEyebrow(slide, model.eyebrow)
  addTitle(slide, titleText(model), 0.94, C.ink, 36)
  const accents = [C.accent, C.cyan, C.success]
  model.layers.forEach((layer, index) => {
    const x = 0.88 + index * 0.3
    const y = 2.08 + index * 1.58
    addCard(slide, x, y, 11.56, 1.36, { line: accents[index], lineWidth: 1.5 })
    slide.addShape(pptxgen.ShapeType.rect, { x, y, w: 0.08, h: 1.36, fill: { color: accents[index] }, line: { color: accents[index] } })
    addText(slide, `L${index + 1}`, x + 0.34, y + 0.47, 0.72, 0.32, { fontSize: 11, bold: true, color: C.accent })
    addText(slide, layer.title, x + 1.34, y + 0.36, 2.7, 0.52, { fontSize: 20, bold: true })
    addText(slide, layer.detail, x + 4.32, y + 0.34, 6.5, 0.58, { fontSize: 15, color: C.muted })
  })
  slide.addNotes('Semantic layout: architecture')
}

function renderEvidence(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addEyebrow(slide, model.eyebrow)
  addTitle(slide, titleText(model), 0.94, C.ink, 36)
  const statusColors = { verified: C.success, detected: C.warning, unproven: C.danger }
  const statusLabels = { verified: 'VERIFIED / 已驗證', detected: 'DETECTED / 已偵測', unproven: 'UNPROVEN / 未證明' }
  addCard(slide, 0.88, 1.94, 11.56, 0.92, { line: statusColors[model.status], fill: 'F3FBF8', shadow: false })
  slide.addShape(pptxgen.ShapeType.roundRect, { x: 1.18, y: 2.18, w: 1.75, h: 0.44, fill: { color: statusColors[model.status] }, line: { color: statusColors[model.status] } })
  addText(slide, statusLabels[model.status], 1.18, 2.18, 1.75, 0.44, { fontSize: 10, bold: true, color: 'FFFFFF', align: 'center' })
  addText(slide, model.claim, 3.2, 2.12, 8.7, 0.56, { fontSize: 18, bold: true })
  model.sources.forEach((source, index) => {
    const x = 0.88 + index * 3.94
    addCard(slide, x, 3.18, 3.66, 3.5)
    addText(slide, `0${index + 1}`, x + 0.3, 3.46, 0.6, 0.3, { fontSize: 11, bold: true, color: C.accent })
    addText(slide, source, x + 0.3, 5.78, 3.05, 0.5, { fontSize: 15, bold: true, valign: 'bottom' })
  })
  slide.addNotes(`Semantic layout: evidence\nClaim status: ${model.status}`)
}

function renderMetrics(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addEyebrow(slide, model.eyebrow)
  addTitle(slide, titleText(model), 0.94, C.ink, 36)
  const accents = [C.accent, C.cyan, C.success]
  model.metrics.forEach((metric, index) => {
    const x = 0.88 + index * 3.94
    addCard(slide, x, 2.02, 3.66, 3.9, { line: accents[index], lineWidth: 1.6 })
    slide.addShape(pptxgen.ShapeType.rect, { x, y: 2.02, w: 3.66, h: 0.07, fill: { color: accents[index] }, line: { color: accents[index] } })
    addText(slide, metric.label, x + 0.34, 2.42, 2.2, 0.3, { fontSize: 12, bold: true, color: C.muted })
    addText(slide, `0${index + 1}`, x + 2.85, 2.42, 0.44, 0.3, { fontSize: 11, bold: true, color: C.muted, align: 'right' })
    addText(slide, metric.value, x + 0.34, 3.12, 2.98, 0.84, { fontSize: 43, bold: true })
    addText(slide, metric.detail, x + 0.34, 4.96, 2.98, 0.5, { fontSize: 14, color: C.muted })
  })
  slide.addNotes('Semantic layout: metrics')
}

function renderDecision(pptx, model) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addEyebrow(slide, model.eyebrow)
  addTitle(slide, titleText(model), 0.94, C.ink, 36)
  addCard(slide, 0.88, 1.88, 11.56, 0.84, { line: C.accent, fill: 'F0F1FF', shadow: false })
  slide.addShape(pptxgen.ShapeType.rect, { x: 0.88, y: 1.88, w: 0.08, h: 0.84, fill: { color: C.accent }, line: { color: C.accent } })
  addText(slide, 'DECISION', 1.25, 2.12, 1.3, 0.3, { fontSize: 10, bold: true, color: C.accent, charSpacing: 1.6 })
  addText(slide, model.decision, 2.85, 2.04, 9.0, 0.46, { fontSize: 17, bold: true })
  model.reasons.forEach((reason, index) => {
    const y = 3.06 + index * 1.13
    addCard(slide, 0.88, y, 6.24, 0.93, { shadow: false })
    addText(slide, `0${index + 1}`, 1.1, y + 0.31, 0.5, 0.28, { fontSize: 10, bold: true, color: C.cyan })
    addText(slide, reason, 1.62, y + 0.22, 4.95, 0.45, { fontSize: 16, bold: true })
  })
  addCard(slide, 7.36, 3.06, 5.08, 3.19, { shadow: false })
  addText(slide, 'OWNER', 7.72, 3.62, 1.2, 0.28, { fontSize: 10, bold: true, color: C.accent, charSpacing: 1.6 })
  addText(slide, model.owner, 7.72, 4.02, 4.35, 0.46, { fontSize: 15, bold: true })
  slide.addShape(pptxgen.ShapeType.line, { x: 7.36, y: 4.78, w: 5.08, h: 0, line: { color: C.line, width: 1 } })
  addText(slide, 'NEXT ACTION', 7.72, 5.12, 1.7, 0.28, { fontSize: 10, bold: true, color: C.accent, charSpacing: 1.6 })
  addText(slide, model.nextAction, 7.72, 5.52, 4.2, 0.5, { fontSize: 14, bold: true })
  slide.addNotes('Semantic layout: decision')
}

function renderClosing(pptx, model) {
  const slide = pptx.addSlide()
  slide.background = { color: C.accentStrong }
  slide.addShape(pptxgen.ShapeType.ellipse, { x: 9.16, y: 0.08, w: 4.0, h: 4.0, fill: { color: C.cyan, transparency: 28 }, line: { color: C.cyan, transparency: 100 } })
  addEyebrow(slide, model.eyebrow, 'BCEFF5')
  addTitle(slide, titleText(model), 3.24, 'FFFFFF', 42)
  addText(slide, model.summary, 0.88, 4.22, 10.5, 0.44, { fontSize: 19, color: 'D9E1FF' })
  model.actions.forEach((action, index) => {
    const x = 0.88 + index * 3.94
    slide.addShape(pptxgen.ShapeType.roundRect, { x, y: 5.14, w: 3.66, h: 0.76, fill: { color: 'FFFFFF', transparency: 84 }, line: { color: 'FFFFFF', transparency: 66, width: 1 } })
    addText(slide, `0${index + 1}`, x + 0.2, 5.36, 0.42, 0.28, { fontSize: 9, bold: true, color: 'BCEFF5' })
    addText(slide, action, x + 0.6, 5.25, 2.82, 0.48, { fontSize: 14, bold: true, color: 'FFFFFF' })
  })
  slide.addShape(pptxgen.ShapeType.line, { x: 0.88, y: 6.24, w: 11.56, h: 0, line: { color: 'FFFFFF', transparency: 65, width: 1 } })
  addText(slide, 'NEXT', 0.88, 6.47, 0.62, 0.28, { fontSize: 10, bold: true, color: 'BCEFF5', charSpacing: 1.6 })
  addText(slide, model.nextAction, 1.7, 6.38, 9.9, 0.46, { fontSize: 15, bold: true, color: 'FFFFFF' })
  slide.addNotes('Semantic layout: closing')
}

const renderers = Object.freeze({
  cover: renderCover,
  'key-message': renderKeyMessage,
  comparison: renderComparison,
  'problem-solution': renderProblemSolution,
  process: renderProcess,
  architecture: renderArchitecture,
  evidence: renderEvidence,
  metrics: renderMetrics,
  decision: renderDecision,
  closing: renderClosing,
})

export function createEditablePresentation(deckToRender) {
  const errors = validateDeck(deckToRender)
  if (errors.length > 0) throw new Error(errors.join('\n'))

  const pptx = new pptxgen()
  pptx.defineLayout({ name: 'AI_GOVERNANCE_WIDE', width: W, height: H })
  pptx.layout = 'AI_GOVERNANCE_WIDE'
  pptx.author = 'AI Slide Design System'
  pptx.company = 'AI Slide Design System'
  pptx.subject = deckToRender.description
  pptx.title = deckToRender.title
  pptx.lang = 'zh-TW'
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT }

  deckToRender.slides.forEach((slide, index) => {
    const renderer = renderers[slide.type]
    if (!renderer) throw new Error(`Unsupported PPTX slide type at index ${index}: ${slide.type}`)
    renderer(pptx, slide)
  })

  return pptx
}

export async function renderDeckToPptx(deckToRender, outputPath = defaultPptxOutput) {
  const pptx = createEditablePresentation(deckToRender)
  await mkdir(path.dirname(outputPath), { recursive: true })
  await pptx.writeFile({ fileName: outputPath, compression: true })
  return outputPath
}

function readOutputArgument(argv) {
  const index = argv.indexOf('--output')
  return index === -1 ? defaultPptxOutput : path.resolve(repoRoot, argv[index + 1])
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  renderDeckToPptx(deck, readOutputArgument(process.argv.slice(2)))
    .then(output => console.log(`Rendered ${deck.slides.length} editable slides to ${path.relative(repoRoot, output)}`))
    .catch(error => {
      console.error(error.message)
      process.exitCode = 1
    })
}
