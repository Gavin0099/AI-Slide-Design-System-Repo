import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'
import { projectSectionedMarkdown } from '../model/sectioned-markdown.mjs'
import { renderDeckToPptx } from './render-pptx.mjs'
import { assertPptxSourceText } from './check-pptx-source-text.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const runtimeRoot = path.join(repoRoot, 'artifacts', 'runtime', 'source-fidelity')
const outputPath = path.join(runtimeRoot, 'source-fidelity-test.pptx')
const mutatedPath = path.join(runtimeRoot, 'source-fidelity-mutated.pptx')
const markdown = `# Exact title
### Exact subtitle
Exact cover line.

## 2 | Exact slide
### Exact section subtitle
- Exact bullet with **emphasis**.
1. Exact numbered item.
> Exact quoted text.

| A | B |
|---|---|
| Exact cell 1 | Exact cell 2 |
`

await rm(runtimeRoot, { recursive: true, force: true })
await mkdir(runtimeRoot, { recursive: true })
await renderDeckToPptx(projectSectionedMarkdown(markdown), outputPath)
await assertPptxSourceText(markdown, outputPath)

const archive = await JSZip.loadAsync(await readFile(outputPath))
const xml = await archive.file('ppt/slides/slide2.xml').async('string')
archive.file('ppt/slides/slide2.xml', xml.replace('Exact quoted text.', 'Rewritten quoted text.'))
await writeFile(mutatedPath, await archive.generateAsync({ type: 'nodebuffer' }))
await assert.rejects(() => assertPptxSourceText(markdown, mutatedPath), /does not exactly preserve/)

console.log('Source fidelity regression passed: exact PPTX text succeeds and rewritten OOXML fails closed')
