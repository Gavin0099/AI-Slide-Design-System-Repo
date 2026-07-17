import { createHash } from 'node:crypto'

export const MERMAID_ENGINE = 'mermaid'
export const MERMAID_VERSION = '11.16.0'
export const MERMAID_KINDS = Object.freeze(['flowchart', 'sequence'])
export const MERMAID_SEMANTIC_ROLES = Object.freeze([
  'input',
  'capability',
  'agent',
  'tool',
  'repository',
  'outcome',
  'governance',
  'boundary',
])
export const MERMAID_ROLE_STYLES = Object.freeze({
  input: Object.freeze({ fill: '#b8ddb6', stroke: '#2f7d45', text: '#163d27', strokeWidth: '1.6' }),
  capability: Object.freeze({ fill: '#ffd08a', stroke: '#f07b16', text: '#56310a', strokeWidth: '1.6' }),
  agent: Object.freeze({ fill: '#8fc5ef', stroke: '#176fb8', text: '#123a5b', strokeWidth: '1.8' }),
  tool: Object.freeze({ fill: '#50b7e3', stroke: '#087aae', text: '#063c55', strokeWidth: '2.2' }),
  repository: Object.freeze({ fill: '#fff0a8', stroke: '#f09b19', text: '#4b3904', strokeWidth: '1.6' }),
  outcome: Object.freeze({ fill: '#c9e6c8', stroke: '#4b9b57', text: '#183e21', strokeWidth: '1.6' }),
  governance: Object.freeze({ fill: '#ffffff', stroke: '#747474', text: '#292929', strokeWidth: '1.8', dasharray: '8 6' }),
  boundary: Object.freeze({ fill: '#fbfbfb', fillOpacity: '0.45', stroke: '#7b7b7b', text: '#292929', strokeWidth: '1.8', dasharray: '8 6' }),
})
export const MERMAID_LIMITS = Object.freeze({
  characters: 5000,
  lines: 60,
  lineCharacters: 220,
  flowchartNodes: 24,
  subgraphs: 6,
  sequenceParticipants: 12,
  sequenceMessages: 24,
})

export const MERMAID_RENDER_CONFIG = Object.freeze({
  theme: 'base',
  securityLevel: 'strict',
  htmlLabels: false,
  deterministicIds: true,
  fontFamily: 'Noto Sans TC',
  flowchart: Object.freeze({ htmlLabels: false, curve: 'basis', nodeSpacing: 38, rankSpacing: 52 }),
  sequence: Object.freeze({ useMaxWidth: true, wrap: true, diagramMarginX: 36, diagramMarginY: 24 }),
  themeVariables: Object.freeze({
    primaryColor: '#eef0ff',
    primaryTextColor: '#122033',
    primaryBorderColor: '#4d57c8',
    lineColor: '#4d57c8',
    secondaryColor: '#e8f7f8',
    tertiaryColor: '#ffffff',
    noteBkgColor: '#e8f7f8',
    noteTextColor: '#122033',
    noteBorderColor: '#29a8b7',
    actorBkg: '#eef0ff',
    actorBorder: '#4d57c8',
    actorTextColor: '#122033',
    signalColor: '#2f388f',
    signalTextColor: '#122033',
    labelBoxBkgColor: '#ffffff',
    labelBoxBorderColor: '#dbe2ec',
    labelTextColor: '#122033',
    loopTextColor: '#122033',
  }),
})

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function normalizeMermaidSource(value) {
  if (typeof value !== 'string') return value
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim()
}

export function mermaidKind(source) {
  const first = normalizeMermaidSource(source)?.split('\n')[0]?.trim() ?? ''
  if (/^flowchart\s+(?:TB|TD|BT|LR|RL)$/u.test(first)) return 'flowchart'
  if (first === 'sequenceDiagram') return 'sequence'
  return undefined
}

function commonErrors(source, path) {
  const errors = []
  if (typeof source !== 'string' || source.trim() === '') return [`${path}.source must be a non-empty string`]
  const normalized = normalizeMermaidSource(source)
  const lines = normalized.split('\n')
  if (normalized.length > MERMAID_LIMITS.characters)
    errors.push(`${path}.source exceeds ${MERMAID_LIMITS.characters} characters`)
  if (lines.length > MERMAID_LIMITS.lines)
    errors.push(`${path}.source exceeds ${MERMAID_LIMITS.lines} lines`)
  lines.forEach((line, index) => {
    if (line.length > MERMAID_LIMITS.lineCharacters)
      errors.push(`${path}.source line ${index + 1} exceeds ${MERMAID_LIMITS.lineCharacters} characters`)
    if (line.includes('\t')) errors.push(`${path}.source line ${index + 1} must not contain tabs`)
  })
  const forbidden = [
    [/%%\{/u, 'initialization directives'],
    [/<\/?[A-Za-z]/u, 'HTML labels'],
    [/\b(?:click|href|classDef|style|linkStyle)\b/iu, 'interactive or arbitrary styling directives'],
    [/@\{/u, 'shape metadata directives'],
    [/\b(?:https?|javascript|data):/iu, 'external or executable URLs'],
    [/^---\s*$/mu, 'frontmatter delimiters'],
  ]
  forbidden.forEach(([pattern, label]) => {
    if (pattern.test(normalized)) errors.push(`${path}.source must not contain ${label}`)
  })
  return errors
}

function flowchartErrors(source, path) {
  const errors = []
  const lines = source.split('\n').slice(1).map(line => line.trim()).filter(Boolean)
  let subgraphDepth = 0
  let subgraphs = 0
  const nodeIds = new Set()
  const roleAssignments = new Map()
  for (const [index, line] of lines.entries()) {
    const subgraph = line.match(/^subgraph\s+([A-Za-z][A-Za-z0-9_-]*)\s*(?:\[[^\]]+\])?$/u)
    if (subgraph) {
      subgraphDepth += 1
      subgraphs += 1
      nodeIds.add(subgraph[1])
      continue
    }
    if (line === 'end') {
      subgraphDepth -= 1
      if (subgraphDepth < 0) errors.push(`${path}.source has unmatched end at flowchart line ${index + 2}`)
      continue
    }
    if (/^direction\s+(?:TB|TD|BT|LR|RL)$/u.test(line)) continue
    const role = line.match(/^class\s+([A-Za-z][A-Za-z0-9_-]*(?:\s*,\s*[A-Za-z][A-Za-z0-9_-]*)*)\s+([a-z]+)$/u)
    if (role) {
      if (!MERMAID_SEMANTIC_ROLES.includes(role[2])) {
        errors.push(`${path}.source flowchart line ${index + 2} role must be one of ${MERMAID_SEMANTIC_ROLES.join(', ')}`)
        continue
      }
      for (const id of role[1].split(',').map(value => value.trim())) {
        if (roleAssignments.has(id))
          errors.push(`${path}.source flowchart node ${id} must not declare more than one semantic role`)
        else
          roleAssignments.set(id, role[2])
      }
      continue
    }
    if (/^class\b/u.test(line)) {
      errors.push(`${path}.source flowchart line ${index + 2} must use class <node[,node]> <fixed semantic role>`)
      continue
    }
    if (line.includes(';')) errors.push(`${path}.source flowchart line ${index + 2} must not contain semicolons`)
    if (!/(?:-->|---|-.->|==>|\[[^\]]+\]|\([^)]*\)|\{[^}]+\})/u.test(line))
      errors.push(`${path}.source flowchart line ${index + 2} is outside the restricted node/edge grammar`)
    for (const match of line.matchAll(/(?:^|\s|[>|-])([A-Za-z][A-Za-z0-9_-]*)\s*(?=[[(\{]|$|[-=.])/gu))
      nodeIds.add(match[1])
  }
  for (const id of roleAssignments.keys()) {
    if (!nodeIds.has(id)) errors.push(`${path}.source semantic role references unknown node or subgraph ${id}`)
  }
  if (subgraphDepth !== 0) errors.push(`${path}.source must balance every subgraph with end`)
  if (subgraphs > MERMAID_LIMITS.subgraphs)
    errors.push(`${path}.source exceeds ${MERMAID_LIMITS.subgraphs} subgraphs`)
  if (nodeIds.size > MERMAID_LIMITS.flowchartNodes)
    errors.push(`${path}.source exceeds ${MERMAID_LIMITS.flowchartNodes} flowchart nodes`)
  return errors
}

function sequenceErrors(source, path) {
  const errors = []
  const lines = source.split('\n').slice(1).map(line => line.trim()).filter(Boolean)
  const participants = new Set()
  let messages = 0
  const blockStack = []
  for (const [index, line] of lines.entries()) {
    let match = line.match(/^(?:participant|actor)\s+([A-Za-z][A-Za-z0-9_-]*)(?:\s+as\s+.+)?$/u)
    if (match) {
      participants.add(match[1])
      continue
    }
    match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*(?:->>|-->>|-\)|--\)|-x|--x)\s*([A-Za-z][A-Za-z0-9_-]*)\s*:\s*\S.*$/u)
    if (match) {
      participants.add(match[1])
      participants.add(match[2])
      messages += 1
      continue
    }
    if (/^(?:activate|deactivate)\s+[A-Za-z][A-Za-z0-9_-]*$/u.test(line)) continue
    if (/^Note\s+(?:left of|right of|over)\s+[A-Za-z][A-Za-z0-9_-]*(?:\s*,\s*[A-Za-z][A-Za-z0-9_-]*)?\s*:\s*\S.*$/u.test(line)) continue
    match = line.match(/^(loop|alt|opt|par|critical|break)\s+\S.*$/u)
    if (match) {
      blockStack.push(match[1])
      continue
    }
    if (/^(?:else|and|option)\s+\S.*$/u.test(line) && blockStack.length > 0) continue
    if (line === 'end' && blockStack.length > 0) {
      blockStack.pop()
      continue
    }
    errors.push(`${path}.source sequence line ${index + 2} is outside the restricted participant/message/note/block grammar`)
  }
  if (blockStack.length > 0) errors.push(`${path}.source must balance every sequence block with end`)
  if (participants.size > MERMAID_LIMITS.sequenceParticipants)
    errors.push(`${path}.source exceeds ${MERMAID_LIMITS.sequenceParticipants} sequence participants`)
  if (messages > MERMAID_LIMITS.sequenceMessages)
    errors.push(`${path}.source exceeds ${MERMAID_LIMITS.sequenceMessages} sequence messages`)
  return errors
}

export function validateMermaidSource(source, path = 'diagram') {
  const normalized = normalizeMermaidSource(source)
  const errors = commonErrors(source, path)
  if (errors.length > 0 && (typeof normalized !== 'string' || normalized === '')) return errors
  const kind = mermaidKind(normalized)
  if (!kind) {
    errors.push(`${path}.source must begin with flowchart TB|TD|BT|LR|RL or sequenceDiagram`)
    return errors
  }
  errors.push(...(kind === 'flowchart' ? flowchartErrors(normalized, path) : sequenceErrors(normalized, path)))
  return errors
}

export function createMermaidDiagram(source) {
  const normalized = normalizeMermaidSource(source)
  const errors = validateMermaidSource(normalized)
  if (errors.length > 0) throw new Error(errors.join('\n'))
  const sourceSha256 = sha256(normalized)
  return Object.freeze({
    engine: MERMAID_ENGINE,
    kind: mermaidKind(normalized),
    source: normalized,
    sourceSha256,
    asset: `dist/mermaid-assets/${sourceSha256}.svg`,
  })
}

export function validateMermaidDiagram(value, path, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path} must be a Mermaid diagram object`)
    return
  }
  if (value.engine !== MERMAID_ENGINE) errors.push(`${path}.engine must be mermaid`)
  const sourceErrors = validateMermaidSource(value.source, path)
  errors.push(...sourceErrors)
  if (sourceErrors.length > 0) return
  const expected = createMermaidDiagram(value.source)
  if (value.kind !== expected.kind) errors.push(`${path}.kind must match ${expected.kind}`)
  if (value.source !== expected.source) errors.push(`${path}.source must use normalized LF line endings without outer whitespace`)
  if (value.sourceSha256 !== expected.sourceSha256) errors.push(`${path}.sourceSha256 must match normalized source bytes`)
  if (value.asset !== expected.asset) errors.push(`${path}.asset must be ${expected.asset}`)
}
