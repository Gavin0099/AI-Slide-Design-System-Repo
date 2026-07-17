import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import JSZip from 'jszip'
import { createMermaidDiagram, validateMermaidSource } from '../model/mermaid-contract.mjs'
import { projectSectionedMarkdown, sourceVisibleStrings } from '../model/sectioned-markdown.mjs'
import { validateDeck } from '../model/slide-model.mjs'
import { buildMermaidAssets } from './build-mermaid-assets.mjs'
import { renderDeckToPptx } from './render-pptx.mjs'
import { renderDeck } from './render-slidev.mjs'

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

const flowchart = createMermaidDiagram(`flowchart LR
  A[Task input] --> B[Governance gate]
  B --> C[AI 執行]
  C --> D[Evidence]
  class A input
  class B governance
  class C agent
  class D tool`)
const subgraph = createMermaidDiagram(`flowchart LR
  A[Request] --> B[Pre-task gate]
  subgraph GOV[Governance boundary]
    B --> C[Agent execution]
    C --> D[Post-task evidence]
  end
  D --> E[Human decision]
  class A input
  class C agent
  class E outcome
  class GOV boundary`)
const sequence = createMermaidDiagram(`sequenceDiagram
  participant U as User
  participant G as Governance gate
  participant A as AI agent
  U->>G: Submit task
  G->>A: Release approved task
  A-->>G: Return result and evidence
  G-->>U: Report verified outcome`)

const demoDeck = {
  title: 'Mermaid contract',
  description: 'Flowchart, subgraph, and sequence diagrams share fixed SVG assets.',
  slides: [
    { type: 'mermaid', eyebrow: 'FLOWCHART', title: 'Evidence flow', subtitle: 'Fixed semantic roles, not arbitrary CSS.', diagram: flowchart, caption: 'Restricted flowchart grammar.' },
    { type: 'mermaid', eyebrow: 'ARCHITECTURE', title: 'Governance boundary', diagram: subgraph, caption: 'Subgraph is allowed only inside flowchart.' },
    { type: 'mermaid', eyebrow: 'SEQUENCE', title: 'Task handoff', diagram: sequence, caption: 'Restricted participants and messages.' },
  ],
}
assert.deepEqual(validateDeck(demoDeck), [])

for (const invalid of [
  'stateDiagram-v2\n  A --> B',
  'flowchart LR\n  %%{init: {"theme":"dark"}}%%\n  A --> B',
  'flowchart LR\n  click A "https://example.com"',
  'flowchart LR\n  A[<b>HTML</b>] --> B[Gate]',
  'flowchart LR\n  A[Gate]\n  classDef danger fill:red',
  'flowchart LR\n  A[Gate]\n  class A arbitrary',
  'flowchart LR\n  A[Gate]\n  class Missing governance',
  'sequenceDiagram\n  participant A\n  link A: Dashboard @ https://example.com',
]) assert.notEqual(validateMermaidSource(invalid).length, 0, `restricted Mermaid must reject: ${invalid}`)

const sectioned = `# Diagram deck
### Exact prose

## Governed flow
This prose remains exact.

\`\`\`mermaid
${subgraph.source}
\`\`\`
`
const sourceDeck = projectSectionedMarkdown(sectioned, { sourceName: 'diagram-source.md' })
assert.equal(sourceDeck.slides[1].variant, 'diagram')
assert.equal(sourceDeck.slides[1].blocks.at(-1).kind, 'mermaid')
assert.deepEqual(sourceVisibleStrings({ ...sourceDeck.slides[1], heading: sourceDeck.slides[1].title, lines: sectioned.split('## Governed flow\n')[1].split('\n') }), ['Governed flow', 'This prose remains exact.'])

const assetRoot = await mkdtemp(path.join(os.tmpdir(), 'ai-slide-mermaid-'))
const first = await buildMermaidAssets(demoDeck, { assetRoot })
assert.equal(first.entries.length, 3)
const manifestPath = path.join(assetRoot, 'dist', 'mermaid-assets', 'manifest.json')
const firstManifest = await readFile(manifestPath, 'utf8')
const firstSvgs = new Map(await Promise.all(first.entries.map(async entry => [entry.asset, await readFile(path.join(assetRoot, ...entry.asset.split('/')))])))
for (const [asset, bytes] of firstSvgs) {
  const svg = bytes.toString('utf8')
  assert.doesNotMatch(svg, /<(?:foreignObject|style)\b/iu, `fixed SVG must not rely on HTML or embedded CSS: ${asset}`)
  assert.doesNotMatch(svg, /marker-end=/iu, `fixed SVG must not rely on marker arrowheads: ${asset}`)
  assert.match(svg, /<polygon\b/iu, `fixed SVG must materialize arrowheads as polygons: ${asset}`)
}
const mixedLabelSvg = firstSvgs.get(flowchart.asset).toString('utf8')
assert.match(mixedLabelSvg, />AI(?:<|\s)/u, 'mixed Latin and CJK labels must retain the Latin text run')
assert.match(mixedLabelSvg, />執行</u, 'mixed Latin and CJK labels must retain the CJK text run')
assert.match(mixedLabelSvg, /fill:\s*rgb\(184, 221, 182\)/u, 'fixed input role color must be materialized in SVG bytes')
assert.match(mixedLabelSvg, /stroke-dasharray:\s*(?:8px, 6px|8 6)/u, 'fixed governance role must materialize a dashed border')

const second = await buildMermaidAssets(demoDeck, { assetRoot })
assert.equal(await readFile(manifestPath, 'utf8'), firstManifest, 'Mermaid manifest must be deterministic')
for (const entry of second.entries)
  assert.deepEqual(await readFile(path.join(assetRoot, ...entry.asset.split('/'))), firstSvgs.get(entry.asset), `Mermaid SVG must be deterministic: ${entry.asset}`)
await buildMermaidAssets(demoDeck, { assetRoot, checkOnly: true })

const slidev = renderDeck(demoDeck, { themePath: '../../theme', assetRoot })
assert.equal((slidev.match(/^layout: "mermaid"$/gmu) ?? []).length, 3)
assert.equal((slidev.match(/data:image\/svg\+xml;base64,/gu) ?? []).length, 3)
assert.match(slidev, /^subtitle: "Fixed semantic roles, not arbitrary CSS\."$/mu)

const outputPath = path.join(assetRoot, 'mermaid-contract.pptx')
await renderDeckToPptx(demoDeck, outputPath, { assetRoot })
const archive = await JSZip.loadAsync(await readFile(outputPath))
const embeddedSvgs = Object.keys(archive.files).filter(name => /^ppt\/media\/.*\.svg$/u.test(name))
assert.equal(embeddedSvgs.length, 3, 'PPTX must embed one SVG media part per Mermaid slide')
const embeddedDigests = new Set(await Promise.all(embeddedSvgs.map(async name => digest(await archive.file(name).async('nodebuffer')))))
assert.deepEqual(embeddedDigests, new Set(first.entries.map(entry => entry.svgSha256)), 'PPTX must embed the exact manifest-bound SVG bytes')

const mutatedAsset = path.join(assetRoot, ...flowchart.asset.split('/'))
await writeFile(mutatedAsset, `${await readFile(mutatedAsset, 'utf8')}\n<!-- mutation -->\n`, 'utf8')
assert.throws(
  () => renderDeck(demoDeck, { assetRoot }),
  /SVG digest mismatch/,
  'both renderers must fail closed when fixed SVG bytes drift from the manifest',
)

console.log('Mermaid contract tests passed: restricted grammar, deterministic SVGs, manifest binding, source projection, and dual-renderer byte reuse')
