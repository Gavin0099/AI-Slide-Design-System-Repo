function fail(sourceName, message) {
  throw new Error(`${sourceName}: ${message}`)
}

function normalize(markdown, sourceName) {
  if (typeof markdown !== 'string' || markdown.trim() === '') fail(sourceName, 'file must not be empty')
  return markdown.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
}

function sourceSection(level, ordinal) {
  return `h${level}:${ordinal}`
}

export function parseSectionedMarkdown(markdown, { sourceName = 'source.md' } = {}) {
  const lines = normalize(markdown, sourceName)
  const sections = []
  let inFence = false
  let fenceMarker
  let active
  let h1Count = 0
  let h2Count = 0

  lines.forEach((line, index) => {
    const fence = line.match(/^\s*(```+|~~~+)/)
    if (fence) {
      const marker = fence[1][0]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      }
      else if (marker === fenceMarker) {
        inFence = false
        fenceMarker = undefined
      }
      if (active) active.lines.push(line)
      return
    }

    if (!inFence) {
      const h1 = line.match(/^#\s+(.+?)\s*$/)
      if (h1) {
        h1Count += 1
        if (h1Count > 1) fail(sourceName, `multiple level-one headings are not allowed; found another at line ${index + 1}`)
        if (sections.length > 0) fail(sourceName, `level-one heading must precede every level-two slide heading`)
        active = {
          sourceSection: sourceSection(1, 1),
          level: 1,
          heading: h1[1].trim(),
          lineNumber: index + 1,
          lines: [],
        }
        sections.push(active)
        return
      }

      const h2 = line.match(/^##\s+(.+?)\s*$/)
      if (h2) {
        if (h1Count === 0) fail(sourceName, `level-two slide heading appears before the deck title at line ${index + 1}`)
        h2Count += 1
        active = {
          sourceSection: sourceSection(2, h2Count),
          level: 2,
          heading: h2[1].trim(),
          lineNumber: index + 1,
          lines: [],
        }
        sections.push(active)
        return
      }
    }

    if (active) active.lines.push(line)
  })

  if (h1Count === 0) fail(sourceName, 'one # deck title is required')
  if (h2Count === 0) fail(sourceName, 'at least one ## slide heading is required')

  return {
    title: sections[0].heading,
    sections,
  }
}

export function validateSectionCoverage(source, deck) {
  const errors = []
  const expected = source?.sections ?? []
  const actual = Array.isArray(deck?.slides) ? deck.slides : []

  if (actual.length !== expected.length)
    errors.push(`section coverage requires ${expected.length} slides; received ${actual.length}`)

  const actualIds = actual.map(slide => slide?.sourceSection)
  const seen = new Set()
  actualIds.forEach((id, index) => {
    if (typeof id !== 'string' || id.trim() === '') {
      errors.push(`slides[${index}].sourceSection is required for section coverage`)
      return
    }
    if (seen.has(id)) errors.push(`slides[${index}].sourceSection duplicates ${id}`)
    seen.add(id)
  })

  expected.forEach((section, index) => {
    const slide = actual[index]
    if (!actualIds.includes(section.sourceSection))
      errors.push(`missing source section ${section.sourceSection}: ${section.heading}`)
    if (!slide) return
    if (slide.sourceSection !== section.sourceSection)
      errors.push(`slides[${index}].sourceSection must be ${section.sourceSection}; received ${slide.sourceSection ?? 'missing'}`)
    if (slide.sourceHeading !== section.heading)
      errors.push(`slides[${index}].sourceHeading must match ${section.heading}`)
  })

  actualIds.forEach((id, index) => {
    if (typeof id === 'string' && !expected.some(section => section.sourceSection === id))
      errors.push(`slides[${index}].sourceSection is not present in the source: ${id}`)
  })

  return errors
}

export function assertSectionCoverage(source, deck) {
  const errors = validateSectionCoverage(source, deck)
  if (errors.length > 0) throw new Error(errors.join('\n'))
}
