import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const submodulePath = 'additional/ai-governance-framework'

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function lineEndingEquivalentDigests(bytes) {
  const digests = new Set([sha256(bytes)])
  const source = bytes.toString('utf8')
  if (Buffer.from(source, 'utf8').equals(bytes)) {
    const lf = source.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
    digests.add(sha256(Buffer.from(lf, 'utf8')))
    digests.add(sha256(Buffer.from(lf.replaceAll('\n', '\r\n'), 'utf8')))
  }
  return digests
}

function scalar(source, key) {
  return source.match(new RegExp(`^${key.replaceAll('.', '\\.')}:\\s*["']?([^"'\\s#]+)`, 'mu'))?.[1]
}

function topLevelFields(source) {
  const fields = new Map()
  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/u)
    if (match) fields.set(match[1], match[2].replace(/^['"]|['"]$/gu, '').trim())
  }
  return fields
}

function listUnder(source, key) {
  const lines = source.split(/\r?\n/u)
  const start = lines.findIndex(line => line.trim() === `${key}:`)
  if (start < 0) return []
  const values = []
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^\s+-\s+(.+?)\s*$/u)
    if (!match) break
    values.push(match[1].replace(/^['"]|['"]$/gu, ''))
  }
  return values
}

export async function checkGovernanceProjection({ repoRoot = defaultRepoRoot, gitlinkCommit } = {}) {
  const baseline = await readFile(path.join(repoRoot, '.governance', 'baseline.yaml'), 'utf8')
  const lock = JSON.parse(await readFile(path.join(repoRoot, 'governance', 'framework.lock.json'), 'utf8'))
  const gitmodules = await readFile(path.join(repoRoot, '.gitmodules'), 'utf8')
  const agentsBase = await readFile(path.join(repoRoot, 'AGENTS.base.md'))
  const contractSource = await readFile(path.join(repoRoot, 'contract.yaml'), 'utf8')

  const resolvedGitlink = gitlinkCommit ?? execFileSync(
    'git', ['rev-parse', `HEAD:${submodulePath}`], { cwd: repoRoot, encoding: 'utf8' },
  ).trim()
  assert.match(resolvedGitlink, /^[0-9a-f]{40}$/u, 'governance submodule gitlink must be a full Git commit')
  assert.equal(lock.adopted_commit, resolvedGitlink, 'framework.lock.json adopted_commit must match the committed submodule gitlink')
  assert.ok(Array.isArray(lock.adopted_surfaces) && lock.adopted_surfaces.includes('submodule_pin'), 'framework.lock.json must declare the submodule pin surface')
  assert.match(gitmodules, /path\s*=\s*additional\/ai-governance-framework/u, '.gitmodules must retain the governed submodule path')
  assert.ok(gitmodules.includes(lock.framework_repo), '.gitmodules URL must match framework.lock.json framework_repo')

  const protectedFiles = [...baseline.matchAll(/^overridable\.(.+):\s*protected\s*$/gmu)].map(match => match[1])
  assert.ok(protectedFiles.length > 0, 'baseline.yaml must declare at least one protected governance file')
  for (const relativePath of protectedFiles) {
    const recorded = scalar(baseline, `sha256.${relativePath}`)
    assert.match(recorded ?? '', /^[0-9a-f]{64}$/u, `baseline.yaml must record SHA-256 for protected file ${relativePath}`)
    const bytes = relativePath === 'AGENTS.base.md'
      ? agentsBase
      : await readFile(path.join(repoRoot, ...relativePath.split('/')))
    assert.ok(lineEndingEquivalentDigests(bytes).has(recorded), `protected governance file drifted beyond LF/CRLF equivalence: ${relativePath}`)
  }
  assert.match(agentsBase.toString('utf8'), /governance-baseline:\s*protected/u, 'AGENTS.base.md must retain its protected sentinel')

  const contract = topLevelFields(contractSource)
  const requiredFields = listUnder(baseline, 'contract_required_fields')
  assert.ok(requiredFields.length > 0, 'baseline.yaml must declare contract_required_fields')
  for (const field of requiredFields)
    assert.ok(contract.get(field), `contract.yaml must define non-empty required field ${field}`)

  return { gitlinkCommit: resolvedGitlink, protectedFiles, requiredFields }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkGovernanceProjection().then(result => {
    console.log(`Governance projection integrity passed: gitlink ${result.gitlinkCommit.slice(0, 12)}, ${result.protectedFiles.length} protected file, ${result.requiredFields.length} contract fields`)
    console.log('Claim boundary: internal upstream freshness and full framework drift were not checked on the GitHub-hosted runner')
  }).catch(error => {
    console.error(`Governance projection integrity failed: ${error.message}`)
    process.exitCode = 1
  })
}
