export const CALLOUT_TYPES = ['note', 'tip', 'warning', 'caution', 'important'] as const
export type CalloutType = typeof CALLOUT_TYPES[number]

export interface CalloutMetadata {
  type: CalloutType
  id?: string
  title?: string
  collapse?: string
  appearance?: string
  icon?: string
  extraClasses: string[]
  attributes: Record<string, string>
}

export type CalloutOptionKey = 'type' | 'id' | 'title' | 'collapse' | 'appearance' | 'icon'

const stableKeys = new Set(['id', 'title', 'collapse', 'appearance', 'icon'])

function unquote(value: string): string {
  return value.replace(/^"|"$/g, '')
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`
}

function tokenizeAttributes(input: string): string[] {
  return input.match(/(?:[^\s"]+|"[^"]*")+/g) || []
}

export function parseCalloutDirective(input: string): CalloutMetadata | null {
  const directive = input.trim().match(/^:::\s*(?:\{([\s\S]*)\}|callout-([a-z]+)(?:\{([\s\S]*)\})?)$/)
  if (!directive) return null

  const attributeContent = directive[1] ?? directive[3] ?? ''
  const shorthandType = directive[2]
  const tokens = tokenizeAttributes(attributeContent)
  const extraClasses: string[] = []
  const attributes: Record<string, string> = {}
  const metadata: CalloutMetadata = {
    type: 'note',
    extraClasses,
    attributes,
  }
  let foundType = false

  if (shorthandType && CALLOUT_TYPES.includes(shorthandType as CalloutType)) {
    metadata.type = shorthandType as CalloutType
    foundType = true
  }

  for (const token of tokens) {
    if (token.startsWith('#')) {
      metadata.id = token.slice(1)
      continue
    }

    if (token.startsWith('.callout-')) {
      const type = token.slice('.callout-'.length)
      if (!CALLOUT_TYPES.includes(type as CalloutType)) return null
      metadata.type = type as CalloutType
      foundType = true
      continue
    }

    if (token.startsWith('.')) {
      extraClasses.push(token.slice(1))
      continue
    }

    const equalsIndex = token.indexOf('=')
    if (equalsIndex === -1) continue

    const key = token.slice(0, equalsIndex)
    const value = unquote(token.slice(equalsIndex + 1))

    if (key === 'class') {
      value.split(/\s+/).filter(Boolean).forEach((className) => {
        if (className.startsWith('callout-')) {
          const type = className.slice('callout-'.length)
          if (CALLOUT_TYPES.includes(type as CalloutType)) {
            metadata.type = type as CalloutType
            foundType = true
          }
        } else {
          extraClasses.push(className)
        }
      })
      continue
    }

    if (key === 'id') metadata.id = value
    else if (key === 'title') metadata.title = value
    else if (key === 'collapse') metadata.collapse = value
    else if (key === 'appearance') metadata.appearance = value
    else if (key === 'icon') metadata.icon = value
    else attributes[key] = value
  }

  return foundType ? metadata : null
}

export function serializeCalloutDirective(metadata: CalloutMetadata): string {
  const tokens: string[] = []
  if (metadata.id) tokens.push(`#${metadata.id}`)
  tokens.push(`.callout-${metadata.type}`)
  metadata.extraClasses.forEach((className) => tokens.push(`.${className}`))
  if (metadata.title) tokens.push(`title=${quote(metadata.title)}`)
  if (metadata.collapse) tokens.push(`collapse=${quote(metadata.collapse)}`)
  if (metadata.appearance) tokens.push(`appearance=${quote(metadata.appearance)}`)
  if (metadata.icon) tokens.push(`icon=${quote(metadata.icon)}`)
  Object.entries(metadata.attributes).forEach(([key, value]) => {
    if (!stableKeys.has(key)) tokens.push(`${key}=${quote(value)}`)
  })
  return `::: {${tokens.join(' ')}}`
}

export function updateCalloutOption(metadata: CalloutMetadata, key: CalloutOptionKey, value: string): CalloutMetadata {
  const next: CalloutMetadata = {
    ...metadata,
    extraClasses: [...metadata.extraClasses],
    attributes: { ...metadata.attributes },
  }

  if (key === 'type') {
    if (CALLOUT_TYPES.includes(value as CalloutType)) next.type = value as CalloutType
    return next
  }

  if (value) next[key] = value
  else delete next[key]

  return next
}
