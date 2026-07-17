import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const PLATFORM_RUNTIME = Object.freeze({ windows: 'win32', macos: 'darwin' })
const FONT_STATUSES = new Set(['installed', 'substituted', 'unknown'])
const LICENSE_STATUSES = new Set(['licensed', 'unlicensed', 'unknown'])

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || value === undefined)
      throw new Error(`Expected --key value arguments, received: ${argv.slice(index).join(' ')}`)
    args[key.slice(2)] = value
  }
  return args
}

function required(args, name) {
  const value = args[name]?.trim()
  if (!value)
    throw new Error(`Missing required --${name}`)
  return value
}

function slideIndex(filename) {
  const match = path.parse(filename).name.match(/(\d+)\D*$/)
  return match ? Number(match[1]) : undefined
}

export async function collectOfficeRenderEvidence({
  platform,
  powerpointVersion,
  pptxPath,
  renderDir,
  runId,
  fontStatus,
  licenseStatus,
  operator = 'not-recorded',
  expectedWidth,
  expectedHeight,
  runtimePlatform = process.platform,
  capturedAt = new Date().toISOString(),
}) {
  if (!(platform in PLATFORM_RUNTIME))
    throw new Error(`Unsupported platform: ${platform}`)
  if (runtimePlatform !== PLATFORM_RUNTIME[platform])
    throw new Error(`Platform attestation mismatch: ${platform} evidence cannot be collected on ${runtimePlatform}`)
  if (!FONT_STATUSES.has(fontStatus))
    throw new Error(`fontStatus must be one of: ${[...FONT_STATUSES].join(', ')}`)
  if (!LICENSE_STATUSES.has(licenseStatus))
    throw new Error(`licenseStatus must be one of: ${[...LICENSE_STATUSES].join(', ')}`)
  if (!powerpointVersion?.trim() || !runId?.trim())
    throw new Error('powerpointVersion and runId must be non-empty')
  if (expectedWidth !== undefined && (!Number.isInteger(expectedWidth) || expectedWidth <= 0))
    throw new Error('expectedWidth must be a positive integer')
  if (expectedHeight !== undefined && (!Number.isInteger(expectedHeight) || expectedHeight <= 0))
    throw new Error('expectedHeight must be a positive integer')

  const sourceBytes = await readFile(pptxPath)
  const candidates = (await readdir(renderDir, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /\.png$/i.test(entry.name))
    .map(entry => ({ name: entry.name, index: slideIndex(entry.name) }))

  if (!candidates.length)
    throw new Error(`No PNG slides found in ${renderDir}`)
  if (candidates.some(candidate => !Number.isInteger(candidate.index)))
    throw new Error('Every PNG filename must end with a slide number')

  candidates.sort((left, right) => left.index - right.index || left.name.localeCompare(right.name))
  const expectedIndexes = Array.from({ length: candidates.length }, (_, index) => index + 1)
  const actualIndexes = candidates.map(candidate => candidate.index)
  if (actualIndexes.join(',') !== expectedIndexes.join(','))
    throw new Error(`Slide PNG indexes must be contiguous from 1: ${actualIndexes.join(', ')}`)

  const slides = []
  for (const candidate of candidates) {
    const bytes = await readFile(path.join(renderDir, candidate.name))
    const png = PNG.sync.read(bytes)
    if (expectedWidth && png.width !== expectedWidth)
      throw new Error(`Slide ${candidate.index} width ${png.width} does not match ${expectedWidth}`)
    if (expectedHeight && png.height !== expectedHeight)
      throw new Error(`Slide ${candidate.index} height ${png.height} does not match ${expectedHeight}`)
    slides.push({
      index: candidate.index,
      sourceFilename: candidate.name,
      width: png.width,
      height: png.height,
      sha256: sha256(bytes),
    })
  }

  const dimensions = new Set(slides.map(slide => `${slide.width}x${slide.height}`))
  if (dimensions.size !== 1)
    throw new Error(`All slide renders must share one dimension: ${[...dimensions].join(', ')}`)

  const manifestText = slides.map(slide => `${slide.index}\0${slide.width}x${slide.height}\0${slide.sha256}`).join('\n')
  return {
    receipt_schema: 'office_render_evidence.v0.1',
    status: 'collected',
    renderer: 'Microsoft PowerPoint',
    platform,
    runtime_platform: runtimePlatform,
    os_release: os.release(),
    architecture: os.arch(),
    powerpoint_version: powerpointVersion,
    license_status: licenseStatus,
    capture_method: 'PowerPoint per-slide PNG export',
    capture_run_id: runId,
    operator,
    authority: 'operator-attested; the collector validates files and host OS but cannot authenticate the PowerPoint process or operator identity',
    source_pptx: path.normalize(pptxPath),
    source_pptx_sha256: sha256(sourceBytes),
    font_family: 'Noto Sans TC',
    font_status: fontStatus,
    slide_count: slides.length,
    render_dimensions: [...dimensions][0],
    render_manifest_sha256: sha256(Buffer.from(manifestText)),
    captured_at: capturedAt,
    slides,
    cannot_claim: [
      'operator identity or PowerPoint licensing authenticity',
      'font embedding; the deck references but does not embed Noto Sans TC',
      'cross-platform equality until two deterministic receipts exist for both Windows and macOS',
    ],
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const receipt = await collectOfficeRenderEvidence({
    platform: required(args, 'platform'),
    powerpointVersion: required(args, 'powerpoint-version'),
    pptxPath: path.resolve(required(args, 'pptx')),
    renderDir: path.resolve(required(args, 'render-dir')),
    runId: required(args, 'run-id'),
    fontStatus: required(args, 'font-status'),
    licenseStatus: required(args, 'license-status'),
    operator: args.operator?.trim() || 'not-recorded',
    expectedWidth: args.width ? Number(args.width) : undefined,
    expectedHeight: args.height ? Number(args.height) : undefined,
  })
  const outputPath = path.resolve(required(args, 'output'))
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(`Office render receipt written: ${outputPath}`)
  console.log(`${receipt.platform}: ${receipt.slide_count} slides, ${receipt.render_dimensions}, manifest ${receipt.render_manifest_sha256}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
