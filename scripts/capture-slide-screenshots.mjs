import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

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
]

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
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

function safeBuildPath(urlPath) {
  const decoded = decodeURIComponent(urlPath)
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '')
  const candidate = path.resolve(buildRoot, relative)
  return candidate.startsWith(buildRoot) ? candidate : path.join(buildRoot, 'index.html')
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

function startBrowser(browser, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(browser, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    let settled = false
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`Timed out waiting for Chrome DevTools: ${stderr.trim()}`))
    }, 15_000)

    child.stderr.on('data', chunk => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
      if (!match || settled) return
      settled = true
      clearTimeout(timer)
      resolve({ child, browserWebSocketUrl: match[1] })
    })
    child.once('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    child.once('exit', code => {
      if (settled) return
      clearTimeout(timer)
      reject(new Error(`Chrome exited before DevTools was ready (${code}): ${stderr.trim()}`))
    })
  })
}

class CdpClient {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(message.error.message))
      else pending.resolve(message.result)
    })
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) pending.reject(new Error('Chrome DevTools connection closed.'))
      this.pending.clear()
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.socket.close()
  }
}

async function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  return new CdpClient(socket)
}

async function evaluate(client, expression, awaitPromise = false) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function waitForSlide(client, slideNumber) {
  const deadline = Date.now() + 20_000
  let lastState
  while (Date.now() < deadline) {
    const state = await evaluate(client, `(() => {
      const element = document.querySelector('[data-slidev-no="${slideNumber}"]')
      const rect = element?.getBoundingClientRect()
      return {
        href: location.href,
        title: document.title,
        bodyText: document.body?.innerText.slice(0, 160),
        loading: document.querySelectorAll('.slidev-slide-loading').length,
        slide: rect ? {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        } : null,
      }
    })()`)
    lastState = state
    if (state.loading === 0 && state.slide?.width > 0 && state.slide?.height > 0) {
      await evaluate(client, 'document.fonts.ready', true)
      return state.slide
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw new Error(`Timed out waiting for Slidev page ${slideNumber}: ${JSON.stringify(lastState)}`)
}

async function stopBrowser(child) {
  if (!child || child.exitCode !== null) return
  const exited = new Promise(resolve => child.once('exit', resolve))
  child.kill()
  await Promise.race([
    exited,
    new Promise(resolve => setTimeout(resolve, 5_000)),
  ])
}

export async function captureSlides(outputDirectory = defaultOutput) {
  const browser = await findBrowser()
  const profileRoot = await mkdtemp(path.join(tmpdir(), 'slide-baseline-'))
  const { server, baseUrl } = await startStaticServer()
  let browserProcess
  let client

  try {
    await rm(outputDirectory, { recursive: true, force: true })
    await mkdir(outputDirectory, { recursive: true })
    const args = [
      '--headless=new',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-gpu',
      '--disable-sync',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--no-default-browser-check',
      '--no-first-run',
      `--user-data-dir=${path.join(profileRoot, 'browser-profile')}`,
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0',
      'about:blank',
    ]
    if (process.platform === 'linux' && process.getuid?.() === 0) args.unshift('--no-sandbox')
    const launched = await startBrowser(browser, args)
    browserProcess = launched.child
    const devtoolsHost = new URL(launched.browserWebSocketUrl).host
    const targetResponse = await fetch(`http://${devtoolsHost}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })
    if (!targetResponse.ok) throw new Error(`Could not create Chrome target: ${targetResponse.status}`)
    const target = await targetResponse.json()
    client = await connectCdp(target.webSocketDebuggerUrl)
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false,
    })
    for (const slide of slideScreenshots) {
      const outputPath = path.join(outputDirectory, slide.filename)
      await client.send('Page.navigate', { url: `${baseUrl}/${slide.number}?print=true` })
      const container = await waitForSlide(client, slide.number)
      const result = await client.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: true,
        clip: { ...container, scale: 1 },
      })
      const buffer = Buffer.from(result.data, 'base64')
      const image = PNG.sync.read(buffer)
      if (image.width !== 1280 || image.height !== 720) {
        throw new Error(`${slide.layout} captured at ${image.width}x${image.height}; expected 1280x720.`)
      }
      await writeFile(outputPath, buffer)
      console.log(`Captured ${slide.layout}: ${path.relative(repoRoot, outputPath)}`)
    }
  } finally {
    client?.close()
    await stopBrowser(browserProcess)
    await new Promise(resolve => server.close(resolve))
    await rm(profileRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
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
