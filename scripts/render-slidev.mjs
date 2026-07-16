import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import deck from '../decks/ai-governance/deck.mjs'
import { validateDeck } from '../model/slide-model.mjs'

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

function renderSlide(deckToRender, slide, index) {
  if (slide.type === 'cover') {
    return [
      frontmatter({
        theme: '../../theme',
        title: deckToRender.title,
        info: deckToRender.description,
        layout: 'cover',
        eyebrow: slide.eyebrow,
      }),
      `# ${slide.title}`,
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
      `# ${slide.title}`,
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
      `# ${slide.title}`,
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
      `# ${slide.title}`,
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
      `# ${slide.title}`,
    ].join('\n\n')
  }

  if (slide.type === 'architecture') {
    return [
      frontmatter({
        layout: 'architecture',
        eyebrow: slide.eyebrow,
        layers: slide.layers,
      }),
      `# ${slide.title}`,
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
      `# ${slide.title}`,
    ].join('\n\n')
  }

  if (slide.type === 'metrics') {
    return [
      frontmatter({
        layout: 'metrics',
        eyebrow: slide.eyebrow,
        metrics: slide.metrics,
      }),
      `# ${slide.title}`,
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
      `# ${slide.title}`,
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
      `# ${slide.title}`,
    ].join('\n\n')
  }

  throw new Error(`Unsupported slide type at index ${index}: ${slide.type}`)
}

export function renderDeck(deckToRender) {
  const errors = validateDeck(deckToRender)
  if (errors.length > 0) throw new Error(errors.join('\n'))

  // Each slide already owns a complete frontmatter block. Adding another
  // horizontal rule between blocks creates an empty Slidev page.
  return `${deckToRender.slides.map((slide, index) => renderSlide(deckToRender, slide, index)).join('\n\n')}\n`
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

    if (current !== rendered) {
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
