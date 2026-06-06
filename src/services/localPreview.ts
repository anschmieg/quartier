import type { Root } from 'mdast'
import { remark } from 'remark'
import remarkFrontmatter from 'remark-frontmatter'
import { parseDocument } from 'yaml'

export interface SourceDiagnostic {
  severity: 'warning' | 'error'
  message: string
}

interface MdastNode {
  type: string
  value?: string
  depth?: number
  lang?: string | null
  url?: string
  title?: string | null
  ordered?: boolean
  start?: number | null
  children?: MdastNode[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeLinkTarget(url: string): string {
  const normalized = url.trim()

  if (
    normalized.startsWith('#')
    || normalized.startsWith('/')
    || normalized.startsWith('./')
    || normalized.startsWith('../')
    || /^(https?:|mailto:)/i.test(normalized)
  ) {
    return normalized
  }

  return '#'
}

function renderChildren(node: MdastNode): string {
  return (node.children ?? []).map(renderNode).join('')
}

function renderListItem(node: MdastNode): string {
  return `<li>${renderChildren(node)}</li>`
}

function renderNode(node: MdastNode): string {
  switch (node.type) {
    case 'root':
      return renderChildren(node)
    case 'yaml':
      return renderMetadata(node.value ?? '')
    case 'heading': {
      const depth = Math.min(Math.max(node.depth ?? 1, 1), 6)
      return `<h${depth}>${renderChildren(node)}</h${depth}>`
    }
    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`
    case 'text':
    case 'html':
      return escapeHtml(node.value ?? '')
    case 'emphasis':
      return `<em>${renderChildren(node)}</em>`
    case 'strong':
      return `<strong>${renderChildren(node)}</strong>`
    case 'delete':
      return `<del>${renderChildren(node)}</del>`
    case 'inlineCode':
      return `<code>${escapeHtml(node.value ?? '')}</code>`
    case 'code': {
      const language = node.lang ? ` class="language-${escapeHtml(node.lang)}"` : ''
      return `<pre><code${language}>${escapeHtml(node.value ?? '')}</code></pre>`
    }
    case 'blockquote':
      return `<blockquote>${renderChildren(node)}</blockquote>`
    case 'thematicBreak':
      return '<hr>'
    case 'break':
      return '<br>'
    case 'link': {
      const href = escapeHtml(safeLinkTarget(node.url ?? ''))
      const title = node.title ? ` title="${escapeHtml(node.title)}"` : ''
      return `<a href="${href}"${title} rel="noreferrer noopener">${renderChildren(node)}</a>`
    }
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul'
      const start = node.ordered && node.start && node.start !== 1
        ? ` start="${node.start}"`
        : ''
      return `<${tag}${start}>${(node.children ?? []).map(renderListItem).join('')}</${tag}>`
    }
    case 'listItem':
      return renderListItem(node)
    default:
      return node.children ? renderChildren(node) : escapeHtml(node.value ?? '')
  }
}

function formatMetadataValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value) ?? String(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function renderMetadata(source: string): string {
  const document = parseDocument(source)
  const parsed: unknown = document.errors.length === 0 ? document.toJS() : null
  const entries = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? Object.entries(parsed)
    : []

  const content = entries.length > 0
    ? `<dl>${entries.map(([key, value]) => (
      `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(formatMetadataValue(value))}</dd></div>`
    )).join('')}</dl>`
    : `<pre>${escapeHtml(source)}</pre>`

  return `<section class="preview-metadata" aria-label="Document metadata"><h2>Metadata</h2>${content}</section>`
}

export function renderLocalPreview(source: string): string {
  const tree = remark()
    .use(remarkFrontmatter, ['yaml'])
    .parse(source) as Root

  return renderNode(tree as unknown as MdastNode)
}

export function getSourceDiagnostics(source: string): SourceDiagnostic[] {
  const diagnostics: SourceDiagnostic[] = []
  const normalized = source.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '')
  const lines = normalized.split('\n')

  if (source.trim().length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: 'This document is empty. Add source text to generate a preview.',
    })
    return diagnostics
  }

  if (/^\s*\.\.\.\s*$/.test(lines[0] ?? '')) {
    diagnostics.push({
      severity: 'error',
      message: 'Frontmatter has a closing fence without an opening --- fence.',
    })
  }

  if (/^\s*---\s*$/.test(lines[0] ?? '')) {
    const closingFence = lines.slice(1).findIndex(line => /^\s*(---|\.\.\.)\s*$/.test(line))

    if (closingFence === -1) {
      diagnostics.push({
        severity: 'error',
        message: 'Frontmatter starts with --- but has no closing --- or ... fence.',
      })
    }
  }

  return diagnostics
}
