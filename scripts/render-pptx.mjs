import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import pptxgen from 'pptxgenjs'
import deck from '../decks/ai-governance/deck.mjs'
import { validateDeck } from '../model/slide-model.mjs'
import { loadMermaidAsset } from '../model/mermaid-assets.mjs'

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
  addCard(slide, 0.88, 5.95, 11.56, 0.76)
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
  addCard(slide, 0.88, 1.94, 11.56, 0.92, { line: statusColors[model.status], fill: 'F3FBF8' })
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
  addCard(slide, 0.88, 1.88, 11.56, 0.84, { line: C.accent, fill: 'F0F1FF' })
  slide.addShape(pptxgen.ShapeType.rect, { x: 0.88, y: 1.88, w: 0.08, h: 0.84, fill: { color: C.accent }, line: { color: C.accent } })
  addText(slide, 'DECISION', 1.25, 2.12, 1.3, 0.3, { fontSize: 10, bold: true, color: C.accent, charSpacing: 1.6 })
  addText(slide, model.decision, 2.85, 2.04, 9.0, 0.46, { fontSize: 17, bold: true })
  model.reasons.forEach((reason, index) => {
    const y = 3.06 + index * 1.13
    addCard(slide, 0.88, y, 6.24, 0.93)
    addText(slide, `0${index + 1}`, 1.1, y + 0.31, 0.5, 0.28, { fontSize: 10, bold: true, color: C.cyan })
    addText(slide, reason, 1.62, y + 0.22, 4.95, 0.45, { fontSize: 16, bold: true })
  })
  addCard(slide, 7.36, 3.06, 5.08, 3.19)
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

function sourceBlockText(block) {
  if (block.kind === 'table-row') return block.cells.join('    ')
  if (block.kind === 'mermaid') return ''
  if (block.kind === 'bullet') return `\u2022 ${block.text}`
  return block.text
}

function svgContainBox(svg, x, y, w, h) {
  const match = svg.match(/viewBox=["']\s*[-+\d.]+\s+[-+\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/iu)
  if (!match) return { x, y, w, h }
  const sourceAspect = Number(match[1]) / Number(match[2])
  const boxAspect = w / h
  if (!Number.isFinite(sourceAspect) || sourceAspect <= 0) return { x, y, w, h }
  if (sourceAspect > boxAspect) {
    const fittedHeight = w / sourceAspect
    return { x, y: y + (h - fittedHeight) / 2, w, h: fittedHeight }
  }
  const fittedWidth = h * sourceAspect
  return { x: x + (w - fittedWidth) / 2, y, w: fittedWidth, h }
}

function addMermaidImage(slide, diagram, x, y, w, h, assetRoot) {
  const asset = loadMermaidAsset(diagram, { assetRoot })
  addCard(slide, x, y, w, h, { fill: C.surface, line: C.line })
  const box = svgContainBox(asset.svg, x + 0.18, y + 0.16, w - 0.36, h - 0.32)
  slide.addImage({ path: asset.absolutePath, ...box })
}

function sourceBodyFontSize(model, blocks) {
  const characters = blocks.reduce((total, block) => total + sourceBlockText(block).length, 0)
  if (model.variant === 'dense' || characters > 650) return 11.5
  if (characters > 480) return 12.5
  if (characters > 340) return 14
  if (characters > 220) return 15.5
  return 18
}

function sourceBlockColor(kind, index = 0) {
  if (kind === 'quote') return { fill: 'EAF8F8', line: 'B7E4E8', accent: C.cyan }
  if (kind === 'subtitle') return { fill: 'ECEEFF', line: 'CDD1FA', accent: C.accent }
  if (kind === 'small') return { fill: 'F1F3F7', line: 'E1E5EC', accent: C.muted }
  const palette = [
    { fill: 'FFFFFF', line: 'DCE2EC', accent: C.accent },
    { fill: 'F7F8FF', line: 'DDE0F7', accent: C.cyan },
    { fill: 'F9FBFC', line: 'DDE8EA', accent: C.accentStrong },
  ]
  return palette[index % palette.length]
}

function addSourceChrome(slide) {
  slide.addShape(pptxgen.ShapeType.rect, {
    x: 0.38, y: 0.5, w: 0.08, h: 6.48,
    fill: { color: C.accent }, line: { color: C.accent, transparency: 100 },
  })
  slide.addShape(pptxgen.ShapeType.arc, {
    x: 10.36, y: 5.78, w: 2.66, h: 1.34,
    adjustPoint: 0.28,
    rotate: 180,
    fill: { color: 'E8EAFF', transparency: 100 },
    line: { color: C.accent, transparency: 55, width: 1.4 },
  })
  slide.addShape(pptxgen.ShapeType.ellipse, {
    x: 11.9, y: 6.14, w: 0.5, h: 0.5,
    fill: { color: C.cyan, transparency: 18 },
    line: { color: C.cyan, transparency: 100 },
  })
}

function sourceBlockWeight(block, compact = false) {
  const text = sourceBlockText(block)
  const divisor = compact ? 84 : 62
  return 1 + Math.max(0, Math.ceil(text.length / divisor) - 1) * 0.56
}

function sourceBlockHeights(blocks, available, gap, compact = false) {
  const usable = Math.max(0.4, available - gap * Math.max(0, blocks.length - 1))
  const weights = blocks.map(block => sourceBlockWeight(block, compact))
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1
  return weights.map(weight => usable * weight / total)
}

function addSourceBlock(slide, block, index, x, y, w, h, options = {}) {
  const colors = sourceBlockColor(block.kind, index)
  const compact = options.compact ?? false
  const fontSize = options.fontSize ?? (compact ? 12.5 : 16)
  addCard(slide, x, y, w, h, {
    fill: options.fill ?? colors.fill,
    line: options.line ?? colors.line,
    lineWidth: 0.9,
  })
  slide.addShape(pptxgen.ShapeType.roundRect, {
    x: x + 0.14, y: y + 0.16, w: compact ? 0.06 : 0.08, h: Math.max(0.18, h - 0.32),
    rectRadius: 0.03,
    fill: { color: colors.accent }, line: { color: colors.accent, transparency: 100 },
  })
  addText(slide, sourceBlockText(block), x + (compact ? 0.32 : 0.4), y + 0.1, w - (compact ? 0.5 : 0.62), h - 0.2, {
    fontSize,
    bold: block.kind === 'subtitle' || block.kind === 'quote',
    italic: block.kind === 'quote',
    color: block.kind === 'small' ? C.muted : C.ink,
    breakLine: true,
    valign: 'middle',
    fit: 'shrink',
  })
}

function renderSourceStack(slide, blocks, bodyY, options = {}) {
  const gap = options.gap ?? 0.14
  const bottom = options.bottom ?? 6.74
  const heights = sourceBlockHeights(blocks, bottom - bodyY, gap, options.compact)
  let y = bodyY
  blocks.forEach((block, index) => {
    addSourceBlock(slide, block, index, 0.9, y, 11.52, heights[index], options)
    y += heights[index] + gap
  })
}

function renderSourceColumns(slide, blocks, bodyY, options = {}) {
  const split = Math.ceil(blocks.length / 2)
  const groups = [blocks.slice(0, split), blocks.slice(split)]
  const xs = [0.9, 6.72]
  groups.forEach((group, columnIndex) => {
    if (group.length === 0) return
    addCard(slide, xs[columnIndex], bodyY, 5.7, 6.74 - bodyY, {
      fill: columnIndex === 0 ? 'F8F9FF' : 'F6FBFB',
      line: columnIndex === 0 ? 'DDE0F7' : 'D9EAEC',
    })
    const gap = options.gap ?? 0.1
    const insetY = bodyY + 0.16
    const heights = sourceBlockHeights(group, 6.42 - bodyY, gap, true)
    let y = insetY
    group.forEach((block, index) => {
      addSourceBlock(slide, block, index + columnIndex * split, xs[columnIndex] + 0.14, y, 5.42, heights[index], {
        compact: true,
        fontSize: options.fontSize ?? 13.2,
        fill: 'FFFFFF',
      })
      y += heights[index] + gap
    })
  })
}

function renderSource(pptx, model, { assetRoot = repoRoot } = {}) {
  const slide = pptx.addSlide()
  addDecor(slide)
  if (model.variant === 'cover') {
    slide.addShape(pptxgen.ShapeType.rect, {
      x: 0, y: 0, w: 0.22, h: H,
      fill: { color: C.accentStrong }, line: { color: C.accentStrong, transparency: 100 },
    })
    addText(slide, model.title, 0.88, 1.55, 7.4, 1.4, {
      fontSize: 50,
      bold: true,
      breakLine: true,
      valign: 'middle',
    })
    const body = model.blocks.map(sourceBlockText).join('\n')
    addText(slide, body, 0.88, 3.28, 7.5, 2.5, {
      fontSize: sourceBodyFontSize(model, model.blocks),
      color: C.muted,
      breakLine: true,
      valign: 'top',
      fit: 'shrink',
      paraSpaceAfterPt: 10,
    })
    slide.addShape(pptxgen.ShapeType.roundRect, {
      x: 8.84, y: 1.46, w: 3.64, h: 4.46, rotate: 7,
      fill: { color: 'E7E9FF', transparency: 18 },
      line: { color: C.accent, transparency: 54, width: 1.2 },
    })
    slide.addShape(pptxgen.ShapeType.roundRect, {
      x: 9.34, y: 1.92, w: 2.9, h: 3.56, rotate: -5,
      fill: { color: 'E8F7F8', transparency: 12 },
      line: { color: C.cyan, transparency: 38, width: 1.2 },
    })
    slide.addShape(pptxgen.ShapeType.ellipse, {
      x: 10.04, y: 2.62, w: 1.48, h: 1.48,
      fill: { color: C.accent, transparency: 18 },
      line: { color: C.accent, transparency: 100 },
    })
    slide.addShape(pptxgen.ShapeType.ellipse, {
      x: 10.48, y: 3.06, w: 0.6, h: 0.6,
      fill: { color: C.cyan, transparency: 0 },
      line: { color: C.cyan, transparency: 100 },
    })
    slide.addNotes(`Semantic layout: source\nSource section: ${model.sourceSection}`)
    return
  }

  addSourceChrome(slide)
  addTitle(slide, model.title, 0.54, C.ink, model.title.length > 28 ? 29 : 34)
  const subtitle = model.blocks[0]?.kind === 'subtitle' ? model.blocks[0] : undefined
  const bodyBlocks = subtitle ? model.blocks.slice(1) : model.blocks
  let bodyY = 1.56
  if (subtitle) {
    addText(slide, subtitle.text, 0.88, 1.48, 11.56, 0.58, {
      fontSize: model.variant === 'dense' ? 17 : 20,
      bold: true,
      color: C.accentStrong,
      fit: 'shrink',
    })
    bodyY = 2.18
  }
  const body = bodyBlocks.map(sourceBlockText).join('\n')
  const codeSurface = model.variant === 'code'
  if (model.variant === 'diagram') {
    const diagramBlocks = bodyBlocks.filter(block => block.kind === 'mermaid')
    const proseBlocks = bodyBlocks.filter(block => block.kind !== 'mermaid')
    if (diagramBlocks.length !== 1) throw new Error('Source diagram layout requires exactly one Mermaid block')
    if (proseBlocks.length > 0) {
      const gap = 0.12
      const heights = sourceBlockHeights(proseBlocks, 6.68 - bodyY, gap, true)
      let y = bodyY
      proseBlocks.forEach((block, index) => {
        addSourceBlock(slide, block, index, 0.9, y, 3.6, heights[index], { compact: true, fontSize: 13.4 })
        y += heights[index] + gap
      })
      addMermaidImage(slide, diagramBlocks[0].diagram, 4.68, bodyY, 7.74, 6.74 - bodyY, assetRoot)
    }
    else {
      addMermaidImage(slide, diagramBlocks[0].diagram, 0.9, bodyY, 11.52, 6.74 - bodyY, assetRoot)
    }
    slide.addNotes(`Semantic layout: source\nSource section: ${model.sourceSection}`)
    return
  }
  if (model.variant === 'table') {
    const firstTable = bodyBlocks.findIndex(block => block.kind === 'table-row')
    const lastTable = bodyBlocks.findLastIndex(block => block.kind === 'table-row')
    const before = bodyBlocks.slice(0, firstTable)
    const rows = bodyBlocks.slice(firstTable, lastTable + 1).map(block => block.cells)
    const after = bodyBlocks.slice(lastTable + 1)
    const beforeHeight = before.length > 0 ? 0.72 : 0
    if (before.length > 0)
      addText(slide, before.map(sourceBlockText).join('\n'), 1.02, bodyY, 11.28, beforeHeight, {
        fontSize: 13.5, valign: 'top', fit: 'shrink', breakLine: true,
      })
    const tableY = bodyY + beforeHeight + (beforeHeight ? 0.12 : 0)
    const tableHeight = Math.min(3.75, Math.max(1.2, rows.length * 0.72))
    slide.addTable(rows.map((row, rowIndex) => row.map(cell => ({
      text: cell,
      options: rowIndex === 0 ? { bold: true, color: C.accentStrong, fill: 'EEF0FF' } : {},
    }))), {
      x: 1.02, y: tableY, w: 11.28, h: tableHeight,
      border: { type: 'solid', color: C.line, pt: 1 },
      fill: C.surface,
      color: C.ink,
      fontFace: FONT,
      fontSize: rows[0]?.length > 4 ? 9.5 : 11.5,
      margin: 0.06,
      valign: 'middle',
      breakLine: false,
      autoFit: false,
      rowH: tableHeight / rows.length,
    })
    const afterY = tableY + tableHeight + 0.12
    if (after.length > 0)
      addText(slide, after.map(sourceBlockText).join('\n'), 1.02, afterY, 11.28, Math.max(0.4, 6.52 - afterY), {
        fontSize: 12.5,
        valign: 'top',
        fit: 'shrink',
        breakLine: true,
        paraSpaceAfterPt: 4,
      })
    slide.addNotes(`Semantic layout: source\nSource section: ${model.sourceSection}`)
    return
  }
  if (model.variant === 'statement') {
    renderSourceStack(slide, bodyBlocks, bodyY, {
      fontSize: bodyBlocks.length <= 2 ? 20 : 17.5,
      gap: 0.2,
    })
    slide.addNotes(`Semantic layout: source\nSource section: ${model.sourceSection}`)
    return
  }
  if (model.variant === 'list') {
    renderSourceStack(slide, bodyBlocks, bodyY, {
      fontSize: bodyBlocks.length > 8 ? 13.2 : 15.2,
      gap: bodyBlocks.length > 8 ? 0.08 : 0.12,
      compact: bodyBlocks.length > 8,
    })
    slide.addNotes(`Semantic layout: source\nSource section: ${model.sourceSection}`)
    return
  }
  if (model.variant === 'dense' || model.variant === 'narrative') {
    renderSourceColumns(slide, bodyBlocks, bodyY, {
      fontSize: model.variant === 'dense' ? 11.7 : 13.5,
      gap: model.variant === 'dense' ? 0.06 : 0.1,
    })
    slide.addNotes(`Semantic layout: source\nSource section: ${model.sourceSection}`)
    return
  }
  if (codeSurface)
    addCard(slide, 0.88, bodyY - 0.08, 11.56, 6.68 - bodyY, { fill: '182237', line: '182237' })
  else
    slide.addShape(pptxgen.ShapeType.line, { x: 0.88, y: bodyY - 0.14, w: 11.56, h: 0, line: { color: C.line, width: 1 } })
  addText(slide, body, 1.02, bodyY, 11.28, 6.52 - bodyY, {
    fontSize: sourceBodyFontSize(model, bodyBlocks),
    color: codeSurface ? 'EDF2FF' : C.ink,
    breakLine: true,
    valign: 'top',
    fit: 'shrink',
    paraSpaceAfterPt: model.variant === 'dense' ? 4 : 8,
  })
  slide.addNotes(`Semantic layout: source\nSource section: ${model.sourceSection}`)
}

function renderMermaid(pptx, model, { assetRoot = repoRoot } = {}) {
  const slide = pptx.addSlide()
  addDecor(slide)
  addSourceChrome(slide)
  addEyebrow(slide, model.eyebrow)
  addTitle(slide, titleText(model), 0.9, C.ink, model.title.length > 28 ? 31 : 36)
  if (model.subtitle)
    addText(slide, model.subtitle, 0.92, 1.34, 11.42, 0.44, { fontSize: 15.5, color: C.muted, fit: 'shrink' })
  const diagramY = model.subtitle ? 1.92 : 1.72
  const captionHeight = model.caption ? 0.48 : 0
  addMermaidImage(slide, model.diagram, 0.9, diagramY, 11.52, 4.98 - captionHeight, assetRoot)
  if (model.caption)
    addText(slide, model.caption, 1.02, 6.28, 11.28, 0.42, { fontSize: 13.5, color: C.muted, fit: 'shrink' })
  slide.addNotes(`Semantic layout: mermaid\nMermaid kind: ${model.diagram.kind}\nSource SHA-256: ${model.diagram.sourceSha256}`)
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
  mermaid: renderMermaid,
  source: renderSource,
})

export function createEditablePresentation(deckToRender, { assetRoot = repoRoot } = {}) {
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
    renderer(pptx, slide, { assetRoot })
  })

  return pptx
}

export async function renderDeckToPptx(deckToRender, outputPath = defaultPptxOutput, options = {}) {
  const pptx = createEditablePresentation(deckToRender, options)
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
