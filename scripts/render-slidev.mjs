import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import deck from '../decks/ai-governance/deck.mjs'
import { validateDeck } from '../model/slide-model.mjs'

const outputPath = path.resolve('decks/ai-governance/slides.md')
const checkOnly = process.argv.includes('--check')

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

function renderSlide(slide, index) {
  if (slide.type === 'cover') {
    return [
      frontmatter({
        theme: '../../theme',
        title: deck.title,
        info: deck.description,
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

  throw new Error(`Unsupported slide type at index ${index}: ${slide.type}`)
}

const errors = validateDeck(deck)
if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const rendered = `${deck.slides.map(renderSlide).join('\n\n---\n\n')}\n`

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
