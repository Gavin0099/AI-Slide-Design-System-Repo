import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { manifestSha256, validateVisualReviewAuthority } from './visual-review-authority.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselineRoot = path.join(repoRoot, 'tests', 'visual', 'baselines', 'ai-governance')

async function main() {
  const manifestBuffer = await readFile(path.join(baselineRoot, 'manifest.json'))
  let receiptSource
  try {
    receiptSource = await readFile(path.join(baselineRoot, 'review-authority.json'), 'utf8')
  }
  catch (error) {
    if (error?.code === 'ENOENT')
      throw new Error('Visual review authority receipt is missing; an explicit human decision is required')
    throw error
  }
  const receipt = JSON.parse(receiptSource)

  validateVisualReviewAuthority(receipt, manifestSha256(manifestBuffer))

  console.log(`Visual review authority receipt passed: explicit human decision recorded for ${receipt.reviewerId}`)
  console.log(`Authority evidence: ${receipt.evidenceRef}`)
  if (receipt.independenceMode === 'single-contributor')
    console.log('Claim boundary: human visual approval recorded; independent reviewer approval is not claimed')
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
