export type FencedDivKind = 'generic' | 'tabset' | 'columns'
export type FencedDivOptionKey = 'id' | 'classes' | 'style'

export interface FencedDivMetadata {
  id?: string
  classes: string[]
  style?: string
  attributes: Record<string, string>
}

const stableKeys = new Set(['id', 'class', 'style'])

function unquote(value: string): string {
  return value.replace(/^"|"$/g, '')
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`
}

function tokenizeAttributes(input: string): string[] {
  return input.match(/(?:[^\s"]+|"[^"]*")+/g) || []
}

export function parseFencedDivDirective(input: string): FencedDivMetadata | null {
  const match = input.trim().match(/^:::\s*\{([\s\S]*)\}$/)
  if (!match?.[1]) return null

  const metadata: FencedDivMetadata = {
    classes: [],
    attributes: {},
  }

  for (const token of tokenizeAttributes(match[1])) {
    if (token.startsWith('#')) {
      metadata.id = token.slice(1)
      continue
    }

    if (token.startsWith('.')) {
      const className = token.slice(1)
      if (className.startsWith('callout-')) return null
      metadata.classes.push(className)
      continue
    }

    const equalsIndex = token.indexOf('=')
    if (equalsIndex === -1) continue

    const key = token.slice(0, equalsIndex)
    const value = unquote(token.slice(equalsIndex + 1))
    if (key === 'id') metadata.id = value
    else if (key === 'class') {
      const classes = value.split(/\s+/).filter(Boolean)
      if (classes.some((className) => className.startsWith('callout-'))) return null
      metadata.classes.push(...classes)
    } else if (key === 'style') metadata.style = value
    else metadata.attributes[key] = value
  }

  return metadata.classes.length || metadata.id || metadata.style || Object.keys(metadata.attributes).length
    ? metadata
    : null
}

export function classifyFencedDiv(metadata: FencedDivMetadata): FencedDivKind {
  if (metadata.classes.includes('panel-tabset')) return 'tabset'
  if (metadata.classes.includes('columns')) return 'columns'
  return 'generic'
}

export function serializeFencedDivDirective(metadata: FencedDivMetadata): string {
  const tokens: string[] = []
  if (metadata.id) tokens.push(`#${metadata.id}`)
  metadata.classes.forEach((className) => tokens.push(`.${className}`))
  if (metadata.style) tokens.push(`style=${quote(metadata.style)}`)
  Object.entries(metadata.attributes).forEach(([key, value]) => {
    if (!stableKeys.has(key)) tokens.push(`${key}=${quote(value)}`)
  })
  return `::: {${tokens.join(' ')}}`
}

export function updateFencedDivOption(
  metadata: FencedDivMetadata,
  key: FencedDivOptionKey,
  value: string | string[],
): FencedDivMetadata {
  const next: FencedDivMetadata = {
    ...metadata,
    classes: [...metadata.classes],
    attributes: { ...metadata.attributes },
  }

  if (key === 'classes') {
    next.classes = Array.isArray(value) ? value : value.split(/\s+/).filter(Boolean)
    return next
  }

  if (typeof value === 'string' && value) next[key] = value
  else delete next[key]
  return next
}
