import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import deck from '../decks/ai-governance/deck.mjs'
import { validateDeck } from '../model/slide-model.mjs'
import { mermaidAssetDataUri } from '../model/mermaid-assets.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.resolve('decks/ai-governance/slides.md')

function yamlValue(value) {
  return JSON.stringify(value)
}

function frontmatter(fields) {
  return [
    '---',
    ...Object.entries(fields).map(([key, value]) => `${key}: ${yamlValue(value)}`),
    '---',
  ].join('\n')
}

function bulletList(items) {
  return items.map(item => `- ${item}`).join('\n')
}

function normalizeLineEndings(value) {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
}

function titleHeading(slide) {
  if (!slide.titleBreakAfter) return `# ${slide.title}`
  return `# ${slide.titleBreakAfter}<br>${slide.title.slice(slide.titleBreakAfter.length)}`
}

function renderSlide(deckToRender, slide, index, themePath, assetRoot) {
  if (slide.type === 'cover') {
    return [
      frontmatter({
        theme: themePath,
        title: deckToRender.title,
        info: deckToRender.description,
        layout: 'cover',
        eyebrow: slide.eyebrow,
      }),
      titleHeading(slide),
      `## ${slide.subtitle}`,
    ].join('\n\n')
  }

  if (slide.type === 'key-message') {
    return [
      frontmatter({
        layout: 'key-message',
        eyebrow: slide.eyebrow,
        visual: slide.visual,
      }),
      titleHeading(slide),
      `## ${slide.subtitle}`,
      '::evidence::',
      slide.evidence,
    ].join('\n\n')
  }

  if (slide.type === 'comparison') {
    return [
      frontmatter({
        layout: 'comparison',
        leftTitle: slide.left.title,
        rightTitle: slide.right.title,
        accent: slide.accent,
      }),
      titleHeading(slide),
      '::left::',
      bulletList(slide.left.items),
      '::right::',
      bulletList(slide.right.items),
    ].join('\n\n')
  }

  if (slide.type === 'problem-solution') {
    return [
      frontmatter({
        layout: 'problem-solution',
        problemTitle: slide.problem.title,
        solutionTitle: slide.solution.title,
      }),
      titleHeading(slide),
      '::problem::',
      bulletList(slide.problem.items),
      '::solution::',
      bulletList(slide.solution.items),
    ].join('\n\n')
  }

  if (slide.type === 'process') {
    return [
      frontmatter({
        layout: 'process',
        eyebrow: slide.eyebrow,
        steps: slide.steps,
      }),
      titleHeading(slide),
    ].join('\n\n')
  }

  if (slide.type === 'architecture') {
    return [
      frontmatter({
        layout: 'architecture',
        eyebrow: slide.eyebrow,
        layers: slide.layers,
      }),
      titleHeading(slide),
    ].join('\n\n')
  }

  if (slide.type === 'evidence') {
    return [
      frontmatter({
        layout: 'evidence',
        eyebrow: slide.eyebrow,
        claim: slide.claim,
        status: slide.status,
        sources: slide.sources,
      }),
      titleHeading(slide),
    ].join('\n\n')
  }

  if (slide.type === 'metrics') {
    return [
      frontmatter({
        layout: 'metrics',
        eyebrow: slide.eyebrow,
        metrics: slide.metrics,
      }),
      titleHeading(slide),
    ].join('\n\n')
  }

  if (slide.type === 'decision') {
    return [
      frontmatter({
        layout: 'decision',
        eyebrow: slide.eyebrow,
        decision: slide.decision,
        reasons: slide.reasons,
        owner: slide.owner,
        nextAction: slide.nextAction,
      }),
      titleHeading(slide),
    ].join('\n\n')
  }

  if (slide.type === 'closing') {
    return [
      frontmatter({
        layout: 'closing',
        eyebrow: slide.eyebrow,
        summary: slide.summary,
        actions: slide.actions,
        nextAction: slide.nextAction,
      }),
      titleHeading(slide),
    ].join('\n\n')
  }

  if (slide.type === 'mermaid') {
    return [
      frontmatter({
        ...(index === 0 ? { theme: themePath, title: deckToRender.title, info: deckToRender.description } : {}),
        layout: 'mermaid',
        eyebrow: slide.eyebrow,
        ...(slide.subtitle ? { subtitle: slide.subtitle } : {}),
        diagramKind: slide.diagram.kind,
        diagramSrc: mermaidAssetDataUri(slide.diagram, { assetRoot }),
        ...(slide.caption ? { caption: slide.caption } : {}),
      }),
      titleHeading(slide),
    ].join('\n\n')
  }


  if (slide.type === 'source') {
    const sourceFrontmatter = {
      ...(index === 0 ? { theme: themePath, title: deckToRender.title, info: deckToRender.description } : {}),
      layout: 'source',
      variant: slide.variant,
      blocks: slide.blocks.map(block => block.kind === 'mermaid'
        ? { ...block, diagramSrc: mermaidAssetDataUri(block.diagram, { assetRoot }) }
        : block),
    }
    return [
      frontmatter(sourceFrontmatter),
      titleHeading(slide),
    ].join('\n\n')
  }

  throw new Error(`Unsupported slide type at index ${index}: ${slide.type}`)
}

export function renderDeck(deckToRender, { themePath = '../../theme', assetRoot = repoRoot } = {}) {
  const errors = validateDeck(deckToRender)
  if (errors.length > 0) throw new Error(errors.join('\n'))

  // Each slide already owns a complete frontmatter block. Adding another
  // horizontal rule between blocks creates an empty Slidev page.
  return `${deckToRender.slides.map((slide, index) => renderSlide(deckToRender, slide, index, themePath, assetRoot)).join('\n\n')}\n`
}

async function main() {
  const checkOnly = process.argv.includes('--check')
  const rendered = renderDeck(deck)

  if (checkOnly) {
    let current = ''
    try {
      current = await readFile(outputPath, 'utf8')
    }
    catch {
      console.error(`Generated deck is missing: ${outputPath}`)
      process.exit(1)
    }

    if (normalizeLineEndings(current) !== rendered) {
      console.error('Generated Slidev Markdown is stale. Run npm run render.')
      process.exit(1)
    }

    console.log(`Render check passed: ${path.relative(process.cwd(), outputPath)}`)
  }
  else {
    await writeFile(outputPath, rendered, 'utf8')
    console.log(`Rendered ${deck.slides.length} slides to ${path.relative(process.cwd(), outputPath)}`)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
