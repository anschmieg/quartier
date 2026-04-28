export interface CodeCellMetadata {
  language: string
  label: string
  figCap: string
  echo: string
  source: string
}

const OPTION_PREFIX = '#|'

export function normalizeCodeCellLanguage(language: string | null | undefined): string {
  const cleaned = (language || '').replace(/[{}]/g, '').trim().toLowerCase()
  return cleaned || 'text'
}

export function parseCodeCellMetadata(language: string | null | undefined, textContent: string): CodeCellMetadata {
  const options = new Map<string, string>()
  const sourceLines: string[] = []

  for (const line of textContent.split('\n')) {
    const trimmed = line.trimStart()
    if (trimmed.startsWith(OPTION_PREFIX)) {
      const optionText = trimmed.slice(OPTION_PREFIX.length).trim()
      const separator = optionText.indexOf(':')
      if (separator > -1) {
        options.set(optionText.slice(0, separator).trim(), optionText.slice(separator + 1).trim().replace(/^["']|["']$/g, ''))
      }
    } else {
      sourceLines.push(line)
    }
  }

  return {
    language: normalizeCodeCellLanguage(language),
    label: options.get('label') || '',
    figCap: options.get('fig-cap') || '',
    echo: options.get('echo') || '',
    source: sourceLines.join('\n').replace(/^\n+/, ''),
  }
}

function formatOption(name: string, value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const needsQuotes = name === 'fig-cap'
  return `${OPTION_PREFIX} ${name}: ${needsQuotes ? JSON.stringify(trimmed) : trimmed}`
}

export function updateCodeCellOption(textContent: string, name: 'label' | 'fig-cap' | 'echo', value: string): string {
  const lines = textContent.split('\n')
  const nextOption = formatOption(name, value)
  let replaced = false

  const nextLines = lines.flatMap((line) => {
    const trimmed = line.trimStart()
    if (!trimmed.startsWith(`${OPTION_PREFIX} ${name}:`)) return [line]
    replaced = true
    return nextOption ? [nextOption] : []
  })

  if (!replaced && nextOption) {
    const insertAt = nextLines.findIndex((line) => !line.trimStart().startsWith(OPTION_PREFIX))
    if (insertAt === -1) return [...nextLines, nextOption].join('\n')
    nextLines.splice(insertAt, 0, nextOption)
  }

  return nextLines.join('\n')
}

