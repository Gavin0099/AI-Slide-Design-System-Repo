import { createServer } from 'node:http'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { chromium } from 'playwright-core'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildRoot = path.join(repoRoot, 'dist', 'ai-governance')
const defaultOutput = path.join(repoRoot, 'artifacts', 'runtime', 'visual', 'current')

export const slideScreenshots = [
  { number: 1, layout: 'cover', filename: '01-cover.png' },
  { number: 2, layout: 'key-message', filename: '02-key-message.png' },
  { number: 3, layout: 'comparison', filename: '03-comparison.png' },
  { number: 4, layout: 'problem-solution', filename: '04-problem-solution.png' },
  { number: 5, layout: 'process', filename: '05-process.png' },
  { number: 6, layout: 'architecture', filename: '06-architecture.png' },
  { number: 7, layout: 'evidence', filename: '07-evidence.png' },
  { number: 8, layout: 'metrics', filename: '08-metrics.png' },
  { number: 9, layout: 'decision', filename: '09-decision.png' },
  { number: 10, layout: 'closing', filename: '10-closing.png' },
]

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

async function exists(candidate) {
  if (!candidate) return false
  try {
    await stat(candidate)
    return true
  } catch {
    return false
  }
}

async function findBrowser() {
  const candidates = [
    process.env.SLIDEV_BROWSER_PATH,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate
  }

  throw new Error('No Chrome-compatible browser found. Set SLIDEV_BROWSER_PATH to an executable path.')
}

export function isPathContained(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate))
  return relative === ''
    || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
}

export function safeBuildPath(urlPath, root = buildRoot) {
  const decoded = decodeURIComponent(urlPath)
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '')
  const candidate = path.resolve(root, relative)
  return isPathContained(root, candidate) ? candidate : path.join(root, 'index.html')
}

async function startStaticServer() {
  if (!(await exists(path.join(buildRoot, 'index.html')))) {
    throw new Error(`Slidev build not found at ${buildRoot}. Run npm run build first.`)
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      let target = safeBuildPath(url.pathname)
      if (!(await exists(target)) || (await stat(target)).isDirectory()) {
        target = path.join(buildRoot, 'index.html')
      }
      const body = await readFile(target)
      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type': mimeTypes.get(path.extname(target)) ?? 'application/octet-stream',
      })
      response.end(body)
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(String(error))
    }
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Could not resolve screenshot server port.')
  return { server, baseUrl: `http://127.0.0.1:${address.port}` }
}

async function waitForSlide(page, slideNumber) {
  const slide = page.locator(`[data-slidev-no="${slideNumber}"]`)
  await slide.waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForFunction(number => {
    const element = document.querySelector(`[data-slidev-no="${number}"]`)
    const rect = element?.getBoundingClientRect()
    return document.querySelectorAll('.slidev-slide-loading').length === 0
      && Boolean(rect?.width && rect?.height)
  }, slideNumber, { timeout: 20_000 })
  await page.evaluate(() => document.fonts.ready)

  const fontState = await page.evaluate(number => {
    const layout = document.querySelector(`[data-slidev-no="${number}"] .slidev-layout`)
    const resources = performance.getEntriesByType('resource').map(entry => entry.name)
    return {
      family: layout ? getComputedStyle(layout).fontFamily : '',
      regular: document.fonts.check('400 24px "Noto Sans TC Local"', '治理字型'),
      bold: document.fonts.check('800 56px "Noto Sans TC Local"', '治理字型'),
      localAssetRequested: resources.some(name => name.includes('NotoSansTC-VF')),
    }
  }, slideNumber)
  if (!fontState.family.startsWith('"Noto Sans TC Local"')
    || !fontState.regular
    || !fontState.bold
    || !fontState.localAssetRequested) {
    throw new Error(`Pinned font did not load on slide ${slideNumber}: ${JSON.stringify(fontState)}`)
  }
  return slide
}

export async function captureSlides(outputDirectory = defaultOutput) {
  const browser = await findBrowser()
  const { server, baseUrl } = await startStaticServer()
  let browserInstance

  try {
    await rm(outputDirectory, { recursive: true, force: true })
    await mkdir(outputDirectory, { recursive: true })
    browserInstance = await chromium.launch({
      executablePath: browser,
      headless: true,
      args: [
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--no-default-browser-check',
      '--no-first-run',
      ],
    })
    const context = await browserInstance.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    for (const slide of slideScreenshots) {
      const outputPath = path.join(outputDirectory, slide.filename)
      await page.goto(`${baseUrl}/${slide.number}?print=true`, { waitUntil: 'domcontentloaded' })
      const slideElement = await waitForSlide(page, slide.number)
      const buffer = await slideElement.screenshot({ animations: 'disabled', type: 'png' })
      const image = PNG.sync.read(buffer)
      if (image.width !== 1280 || image.height !== 720) {
        throw new Error(`${slide.layout} captured at ${image.width}x${image.height}; expected 1280x720.`)
      }
      await writeFile(outputPath, buffer)
      console.log(`Captured ${slide.layout}: ${path.relative(repoRoot, outputPath)}`)
    }
  } finally {
    await browserInstance?.close()
    await new Promise(resolve => server.close(resolve))
  }

  return { browser, outputDirectory, slides: slideScreenshots }
}

function readOutputArgument(argv) {
  const index = argv.indexOf('--output')
  return index === -1 ? defaultOutput : path.resolve(repoRoot, argv[index + 1])
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  captureSlides(readOutputArgument(process.argv.slice(2))).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
