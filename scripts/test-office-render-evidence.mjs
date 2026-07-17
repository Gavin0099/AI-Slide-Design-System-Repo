import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PNG } from 'pngjs'
import { collectOfficeRenderEvidence } from './collect-office-render-evidence.mjs'
import { decideOfficeBaseline } from './compare-office-render-evidence.mjs'

const root = await mkdtemp(path.join(os.tmpdir(), 'office-render-evidence-'))
const renderDir = path.join(root, 'rendered')
const pptxPath = path.join(root, 'deck.pptx')
await mkdir(renderDir)
await writeFile(pptxPath, 'same semantic deck')

for (let index = 1; index <= 2; index += 1) {
  const png = new PNG({ width: 16, height: 9 })
  png.data.fill(index * 32)
  await writeFile(path.join(renderDir, `Slide${index}.PNG`), PNG.sync.write(png))
}

const windowsReceipt = await collectOfficeRenderEvidence({
  platform: 'windows',
  powerpointVersion: '16.0.test',
  pptxPath,
  renderDir,
  runId: 'windows-1',
  fontStatus: 'installed',
  licenseStatus: 'licensed',
  expectedWidth: 16,
  expectedHeight: 9,
  runtimePlatform: 'win32',
  capturedAt: '2026-07-17T00:00:00Z',
})
assert.equal(windowsReceipt.slide_count, 2)
assert.equal(windowsReceipt.render_dimensions, '16x9')
assert.throws(() => decideOfficeBaseline({ minimumRuns: 1 }), /at least 2/)

await assert.rejects(
  collectOfficeRenderEvidence({
    platform: 'macos',
    powerpointVersion: '16.0.test',
    pptxPath,
    renderDir,
    runId: 'forged-macos',
    fontStatus: 'installed',
    licenseStatus: 'licensed',
    runtimePlatform: 'win32',
  }),
  /Platform attestation mismatch/,
)

const macosReceipt = {
  ...windowsReceipt,
  platform: 'macos',
  runtime_platform: 'darwin',
  capture_run_id: 'macos-1',
}

function alterRender(receipt, captureRunId, hashCharacter) {
  const slides = receipt.slides.map((slide, index) => index === 0 ? { ...slide, sha256: hashCharacter.repeat(64) } : slide)
  const manifest = slides.map(slide => `${slide.index}\0${slide.width}x${slide.height}\0${slide.sha256}`).join('\n')
  return {
    ...receipt,
    capture_run_id: captureRunId,
    slides,
    render_manifest_sha256: createHash('sha256').update(manifest).digest('hex'),
  }
}

assert.equal(decideOfficeBaseline({ windows: [windowsReceipt], macos: [] }).decision, 'not_enough_evidence')

const shared = decideOfficeBaseline({
  windows: [windowsReceipt, { ...windowsReceipt, capture_run_id: 'windows-2' }],
  macos: [macosReceipt, { ...macosReceipt, capture_run_id: 'macos-2' }],
})
assert.equal(shared.decision, 'shared_baseline_candidate')
assert.equal(shared.shared_baseline_candidate, true)

const tamperedManifest = decideOfficeBaseline({
  windows: [windowsReceipt, { ...windowsReceipt, capture_run_id: 'windows-2', render_manifest_sha256: 'd'.repeat(64) }],
  macos: [macosReceipt, { ...macosReceipt, capture_run_id: 'macos-2' }],
})
assert.equal(tamperedManifest.decision, 'invalid_evidence')

const differentMac = alterRender(macosReceipt, 'macos-different', 'f')
const separate = decideOfficeBaseline({
  windows: [windowsReceipt, { ...windowsReceipt, capture_run_id: 'windows-2' }],
  macos: [differentMac, { ...differentMac, capture_run_id: 'macos-2' }],
})
assert.equal(separate.decision, 'per_platform_baselines_required')

const unstable = decideOfficeBaseline({
  windows: [windowsReceipt, alterRender(windowsReceipt, 'windows-2', 'e')],
  macos: [macosReceipt, { ...macosReceipt, capture_run_id: 'macos-2' }],
})
assert.equal(unstable.decision, 'unstable_platform_render')

const wrongDeck = decideOfficeBaseline({
  windows: [windowsReceipt, { ...windowsReceipt, capture_run_id: 'windows-2' }],
  macos: [macosReceipt, { ...macosReceipt, capture_run_id: 'macos-2', source_pptx_sha256: 'a'.repeat(64) }],
})
assert.equal(wrongDeck.decision, 'invalid_evidence')

console.log('Office render evidence regression passed: host attestation, repetition, font, deck digest, stability, and shared/per-platform decisions fail closed')
