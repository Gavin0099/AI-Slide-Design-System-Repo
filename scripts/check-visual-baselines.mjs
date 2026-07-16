import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselineRoot = path.join(repoRoot, 'tests', 'visual', 'baselines', 'ai-governance')
const expected = [
  { filename: '01-cover.png', layout: 'cover' },
  { filename: '02-key-message.png', layout: 'key-message' },
  { filename: '03-comparison.png', layout: 'comparison' },
]

const manifest = JSON.parse(await readFile(path.join(baselineRoot, 'manifest.json'), 'utf8'))
assert.equal(manifest.deck, 'ai-governance')
assert.deepEqual(manifest.viewport, { width: 1280, height: 720, deviceScaleFactor: 1 })
assert.equal(manifest.reviewStatus, 'approved-human-review')
assert.deepEqual(
  manifest.files.map(({ filename, layout }) => ({ filename, layout })),
  expected,
)

for (const entry of manifest.files) {
  const buffer = await readFile(path.join(baselineRoot, entry.filename))
  const image = PNG.sync.read(buffer)
  const digest = createHash('sha256').update(buffer).digest('hex')
  assert.equal(image.width, entry.width, `${entry.filename} width drifted`)
  assert.equal(image.height, entry.height, `${entry.filename} height drifted`)
  assert.equal(entry.width, 1280, `${entry.filename} baseline width must remain fixed`)
  assert.equal(entry.height, 720, `${entry.filename} baseline height must remain fixed`)
  assert.equal(digest, entry.sha256, `${entry.filename} SHA-256 drifted`)
}

console.log('Visual baseline integrity passed: 3 approved 1280x720 screenshots match manifest SHA-256 values')
