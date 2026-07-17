import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workflows = [
  '.github/workflows/slide-quality.yml',
  '.github/workflows/governance-drift.yml',
]

for (const relativePath of workflows) {
  const source = await readFile(path.join(repoRoot, ...relativePath.split('/')), 'utf8')
  assert.match(source, /uses:\s*actions\/checkout@v6/u, `${relativePath} must use the Node 24 checkout action`)
  assert.match(source, /submodules:\s*["']?false["']?/u, `${relativePath} must explicitly skip the internal GitLab submodule`)
  assert.doesNotMatch(source, /submodules:\s*(?:recursive|["']?true["']?)/u, `${relativePath} must not clone submodules on GitHub-hosted runners`)
}

const slideQuality = await readFile(path.join(repoRoot, '.github', 'workflows', 'slide-quality.yml'), 'utf8')
assert.match(slideQuality, /uses:\s*actions\/setup-node@v6/u, 'slide-quality.yml must use the Node 24 setup-node action')

const governanceDrift = await readFile(path.join(repoRoot, '.github', 'workflows', 'governance-drift.yml'), 'utf8')
assert.match(governanceDrift, /uses:\s*actions\/setup-node@v6/u, 'governance-drift.yml must use the Node 24 setup-node action')
assert.match(governanceDrift, /node scripts\/check-governance-projection\.mjs/u, 'governance drift must validate the committed repo-owned projection without package-script coupling')
assert.doesNotMatch(governanceDrift, /governance\/governance_tools/u, 'governance drift must not call framework tooling that is absent without the submodule')
for (const triggerPath of [
  '.github/workflows/governance-drift.yml',
  'scripts/check-governance-projection.mjs',
  'scripts/test-github-workflows.mjs',
]) {
  assert.equal(governanceDrift.split(`- "${triggerPath}"`).length, 3, `governance drift push and pull_request filters must include ${triggerPath}`)
}

assert.match(slideQuality, /node scripts\/test-github-workflows\.mjs/u, 'slide quality must execute the workflow regression before dependency installation')

console.log('GitHub workflow regression passed: Node 24 actions are pinned, internal GitLab submodules are skipped, and projection checks stay repo-local')
