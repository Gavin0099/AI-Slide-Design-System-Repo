import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function parseArgs(argv) {
  const args = { windows: [], macos: [] }
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || value === undefined)
      throw new Error(`Expected --key value arguments, received: ${argv.slice(index).join(' ')}`)
    const name = key.slice(2)
    if (name === 'windows' || name === 'macos')
      args[name].push(value)
    else
      args[name] = value
  }
  return args
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function computedManifest(receipt) {
  return sha256(receipt.slides.map(slide => `${slide.index}\0${slide.width}x${slide.height}\0${slide.sha256}`).join('\n'))
}

function validReceipt(receipt, platform) {
  const slidesValid = Array.isArray(receipt?.slides)
    && receipt.slides.length === receipt.slide_count
    && receipt.slides.every((slide, index) => slide.index === index + 1
      && Number.isInteger(slide.width) && slide.width > 0
      && Number.isInteger(slide.height) && slide.height > 0
      && `${slide.width}x${slide.height}` === receipt.render_dimensions
      && /^[a-f0-9]{64}$/.test(slide.sha256))
  return receipt?.receipt_schema === 'office_render_evidence.v0.1'
    && receipt.status === 'collected'
    && receipt.renderer === 'Microsoft PowerPoint'
    && receipt.platform === platform
    && receipt.runtime_platform === (platform === 'windows' ? 'win32' : 'darwin')
    && typeof receipt.powerpoint_version === 'string' && receipt.powerpoint_version.trim().length > 0
    && typeof receipt.capture_run_id === 'string' && receipt.capture_run_id.trim().length > 0
    && /^[a-f0-9]{64}$/.test(receipt.source_pptx_sha256)
    && /^[a-f0-9]{64}$/.test(receipt.render_manifest_sha256)
    && slidesValid
    && computedManifest(receipt) === receipt.render_manifest_sha256
}

function same(values) {
  return new Set(values).size === 1
}

export function decideOfficeBaseline({ windows = [], macos = [], minimumRuns = 2 }) {
  if (!Number.isInteger(minimumRuns) || minimumRuns < 2)
    throw new Error('minimumRuns must be an integer of at least 2')
  const evidenceCounts = { windows: windows.length, macos: macos.length, minimum_runs_per_platform: minimumRuns }
  if (windows.length < minimumRuns || macos.length < minimumRuns) {
    return {
      decision: 'not_enough_evidence',
      shared_baseline_candidate: false,
      recommended_ci_policy: 'keep shared Office pixel baseline disabled',
      evidence_counts: evidenceCounts,
      reasons: ['two independent Microsoft PowerPoint capture runs are required on both Windows and macOS'],
    }
  }

  if (windows.some(receipt => !validReceipt(receipt, 'windows')) || macos.some(receipt => !validReceipt(receipt, 'macos'))) {
    return {
      decision: 'invalid_evidence',
      shared_baseline_candidate: false,
      recommended_ci_policy: 'keep shared Office pixel baseline disabled',
      evidence_counts: evidenceCounts,
      reasons: ['one or more receipts fail the renderer, platform, schema, or slide-count contract'],
    }
  }

  const receipts = [...windows, ...macos]
  if (new Set(windows.map(receipt => receipt.capture_run_id)).size !== windows.length
    || new Set(macos.map(receipt => receipt.capture_run_id)).size !== macos.length) {
    return {
      decision: 'invalid_evidence',
      shared_baseline_candidate: false,
      recommended_ci_policy: 'keep shared Office pixel baseline disabled',
      evidence_counts: evidenceCounts,
      reasons: ['capture_run_id values must be unique within each platform'],
    }
  }
  if (!same(receipts.map(receipt => receipt.source_pptx_sha256))) {
    return {
      decision: 'invalid_evidence',
      shared_baseline_candidate: false,
      recommended_ci_policy: 'keep shared Office pixel baseline disabled',
      evidence_counts: evidenceCounts,
      reasons: ['all receipts must render the exact same PPTX SHA-256'],
    }
  }
  if (receipts.some(receipt => receipt.font_status !== 'installed')) {
    return {
      decision: 'not_enough_evidence',
      shared_baseline_candidate: false,
      recommended_ci_policy: 'keep shared Office pixel baseline disabled',
      evidence_counts: evidenceCounts,
      reasons: ['Noto Sans TC must be confirmed installed on every capture host'],
    }
  }
  if (receipts.some(receipt => receipt.license_status !== 'licensed')) {
    return {
      decision: 'not_enough_evidence',
      shared_baseline_candidate: false,
      recommended_ci_policy: 'keep shared Office pixel baseline disabled',
      evidence_counts: evidenceCounts,
      reasons: ['every capture must explicitly attest a licensed PowerPoint product'],
    }
  }
  if (!same(receipts.map(receipt => receipt.render_dimensions)) || !same(receipts.map(receipt => receipt.slide_count))) {
    return {
      decision: 'per_platform_baselines_required',
      shared_baseline_candidate: false,
      recommended_ci_policy: 'use separately reviewed Windows and macOS Office baselines',
      evidence_counts: evidenceCounts,
      reasons: ['Office exports disagree on slide dimensions or slide count'],
    }
  }

  const windowsStable = same(windows.map(receipt => receipt.render_manifest_sha256))
  const macosStable = same(macos.map(receipt => receipt.render_manifest_sha256))
  if (!windowsStable || !macosStable) {
    return {
      decision: 'unstable_platform_render',
      shared_baseline_candidate: false,
      recommended_ci_policy: 'do not enforce Office pixel baselines until repeated captures stabilize',
      evidence_counts: evidenceCounts,
      reasons: [
        ...(!windowsStable ? ['Windows PowerPoint captures are not deterministic'] : []),
        ...(!macosStable ? ['macOS PowerPoint captures are not deterministic'] : []),
      ],
    }
  }

  const crossPlatformEqual = windows[0].render_manifest_sha256 === macos[0].render_manifest_sha256
  return crossPlatformEqual
    ? {
        decision: 'shared_baseline_candidate',
        shared_baseline_candidate: true,
        recommended_ci_policy: 'route the exact shared manifest to human authority review before enabling CI enforcement',
        evidence_counts: evidenceCounts,
        shared_render_manifest_sha256: windows[0].render_manifest_sha256,
        reasons: ['two deterministic runs per platform produced identical per-slide PNG hashes'],
      }
    : {
        decision: 'per_platform_baselines_required',
        shared_baseline_candidate: false,
        recommended_ci_policy: 'use separately reviewed Windows and macOS Office baselines',
        evidence_counts: evidenceCounts,
        platform_manifests: {
          windows: windows[0].render_manifest_sha256,
          macos: macos[0].render_manifest_sha256,
        },
        reasons: ['each platform is deterministic, but Windows and macOS rendered pixels differ'],
      }
}

async function readReceipts(paths) {
  return Promise.all(paths.map(async receiptPath => JSON.parse(await readFile(path.resolve(receiptPath), 'utf8'))))
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const decision = decideOfficeBaseline({
    windows: await readReceipts(args.windows),
    macos: await readReceipts(args.macos),
    minimumRuns: args['minimum-runs'] ? Number(args['minimum-runs']) : 2,
  })
  const report = {
    decision_schema: 'office_baseline_decision.v0.1',
    generated_at: new Date().toISOString(),
    ...decision,
  }
  if (args.output) {
    const outputPath = path.resolve(args.output)
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`)
  }
  console.log(JSON.stringify(report, null, 2))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
