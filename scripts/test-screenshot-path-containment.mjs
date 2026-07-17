import assert from 'node:assert/strict'
import path from 'node:path'
import { isPathContained, safeBuildPath } from './capture-slide-screenshots.mjs'

const testBuildRoot = path.resolve('virtual-dist', 'ai-governance')
const fallback = path.join(testBuildRoot, 'index.html')
const nestedAsset = path.join(testBuildRoot, 'assets', 'app.js')
const siblingRoot = `${testBuildRoot}-x`
const siblingCandidate = path.join(siblingRoot, 'secret.js')

assert.equal(isPathContained(testBuildRoot, testBuildRoot), true)
assert.equal(isPathContained(testBuildRoot, nestedAsset), true)
assert.equal(safeBuildPath('/', testBuildRoot), fallback)
assert.equal(safeBuildPath('/assets/app.js', testBuildRoot), nestedAsset)

assert.equal(
  siblingCandidate.startsWith(testBuildRoot),
  true,
  'mutation precondition: the removed string-prefix guard would accept the sibling path',
)
assert.equal(isPathContained(testBuildRoot, siblingCandidate), false)
assert.equal(isPathContained(testBuildRoot, path.resolve(testBuildRoot, '..', 'outside.js')), false)

const siblingBypass = new URL(
  `/%2e%2e%2f${path.basename(siblingRoot)}%2fsecret.js`,
  'http://127.0.0.1',
).pathname
const parentTraversal = new URL('/%2e%2e%2foutside.js', 'http://127.0.0.1').pathname
const siblingMutationCandidate = path.resolve(
  testBuildRoot,
  decodeURIComponent(siblingBypass).replace(/^\/+/, ''),
)

assert.equal(siblingMutationCandidate, siblingCandidate)
assert.equal(siblingMutationCandidate.startsWith(testBuildRoot), true)
assert.equal(safeBuildPath(siblingBypass, testBuildRoot), fallback)
assert.equal(safeBuildPath(parentTraversal, testBuildRoot), fallback)

console.log('Screenshot path containment regression passed: nested assets resolve, while parent traversal and sibling-prefix mutations fall back to index.html')
