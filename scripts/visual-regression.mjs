import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { captureSlides, slideScreenshots } from './capture-slide-screenshots.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const baselineRoot = path.join(repoRoot, 'tests', 'visual', 'baselines', 'ai-governance')
const runtimeRoot = path.join(repoRoot, 'artifacts', 'runtime', 'visual')
const currentRoot = path.join(runtimeRoot, 'current')
const diffRoot = path.join(runtimeRoot, 'diff')
const updateMode = process.argv.includes('--update')
const allowedDifferenceRatio = 0.001

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function readPng(filename) {
  const buffer = await readFile(filename)
  return { buffer, image: PNG.sync.read(buffer) }
}

await captureSlides(currentRoot)

if (updateMode) {
  await rm(baselineRoot, { recursive: true, force: true })
  await mkdir(baselineRoot, { recursive: true })
  const files = []

  for (const slide of slideScreenshots) {
    const source = path.join(currentRoot, slide.filename)
    const target = path.join(baselineRoot, slide.filename)
    const { buffer, image } = await readPng(source)
    if (image.width !== 1280 || image.height !== 720) {
      throw new Error(`${slide.filename} is ${image.width}x${image.height}; expected 1280x720.`)
    }
    await copyFile(source, target)
    files.push({
      filename: slide.filename,
      layout: slide.layout,
      width: image.width,
      height: image.height,
      sha256: sha256(buffer),
    })
  }

  await writeFile(path.join(baselineRoot, 'manifest.json'), `${JSON.stringify({
    deck: 'ai-governance',
    viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    files,
  }, null, 2)}\n`)
  console.log(`Updated ${files.length} screenshot baselines in ${path.relative(repoRoot, baselineRoot)}`)
  console.log('Human review authority was invalidated; record a new explicit human decision after full-size inspection')
} else {
  await rm(diffRoot, { recursive: true, force: true })
  await mkdir(diffRoot, { recursive: true })
  let failed = false

  for (const slide of slideScreenshots) {
    const baseline = await readPng(path.join(baselineRoot, slide.filename))
    const current = await readPng(path.join(currentRoot, slide.filename))
    if (baseline.image.width !== current.image.width || baseline.image.height !== current.image.height) {
      console.error(`${slide.layout}: dimension mismatch`)
      failed = true
      continue
    }

    const diff = new PNG({ width: baseline.image.width, height: baseline.image.height })
    const differentPixels = pixelmatch(
      baseline.image.data,
      current.image.data,
      diff.data,
      baseline.image.width,
      baseline.image.height,
      { threshold: 0.1, includeAA: false },
    )
    const ratio = differentPixels / (baseline.image.width * baseline.image.height)
    if (ratio > allowedDifferenceRatio) {
      failed = true
      await writeFile(path.join(diffRoot, slide.filename), PNG.sync.write(diff))
      console.error(`${slide.layout}: ${(ratio * 100).toFixed(3)}% pixels differ`)
    } else {
      console.log(`${slide.layout}: PASS (${(ratio * 100).toFixed(3)}% pixels differ)`)
    }
  }

  if (failed) process.exitCode = 1
}
