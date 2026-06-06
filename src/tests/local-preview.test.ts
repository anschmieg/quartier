import { describe, expect, it } from 'vitest'
import { getSourceDiagnostics, renderLocalPreview } from '@/services/localPreview'

describe('local Markdown preview', () => {
  it('renders common Markdown elements deterministically', () => {
    const html = renderLocalPreview(`# Heading

A paragraph with *emphasis*, **strong text**, \`inline code\`, and [a link](https://example.com).

> Quoted

- One
- Two

1. First
2. Second

---

\`\`\`js
const value = '<safe>'
\`\`\`
`)

    expect(html).toContain('<h1>Heading</h1>')
    expect(html).toContain('<em>emphasis</em>')
    expect(html).toContain('<strong>strong text</strong>')
    expect(html).toContain('<code>inline code</code>')
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('<blockquote><p>Quoted</p></blockquote>')
    expect(html).toContain('<ul><li><p>One</p></li><li><p>Two</p></li></ul>')
    expect(html).toContain('<ol><li><p>First</p></li><li><p>Second</p></li></ol>')
    expect(html).toContain('<hr>')
    expect(html).toContain('<pre><code class="language-js">const value = &#39;&lt;safe&gt;&#39;</code></pre>')
  })

  it('escapes raw HTML and rejects unsafe link protocols', () => {
    const html = renderLocalPreview(`<script>alert('unsafe')</script>

[unsafe](javascript:alert('unsafe'))
`)

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(&#39;unsafe&#39;)&lt;/script&gt;')
    expect(html).toContain('<a href="#"')
    expect(html).not.toContain('href="javascript:')
  })

  it('renders YAML frontmatter as escaped metadata', () => {
    const html = renderLocalPreview(`---
title: Safe <Title>
format: html
categories:
  - testing
  - local
---

# Body
`)

    expect(html).toContain('aria-label="Document metadata"')
    expect(html).toContain('<dt>title</dt><dd>Safe &lt;Title&gt;</dd>')
    expect(html).toContain('<dt>format</dt><dd>html</dd>')
    expect(html).toContain('<dt>categories</dt><dd>[&quot;testing&quot;,&quot;local&quot;]</dd>')
    expect(html).toContain('<h1>Body</h1>')
    expect(html).not.toContain('<Title>')
  })
})

describe('local source diagnostics', () => {
  it('reports an empty document', () => {
    expect(getSourceDiagnostics(' \n')).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: expect.stringContaining('empty'),
      }),
    ])
  })

  it('reports an unclosed frontmatter fence', () => {
    expect(getSourceDiagnostics('---\ntitle: Missing close\n')).toEqual([
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('no closing'),
      }),
    ])
  })

  it('reports a closing frontmatter fence without an opener', () => {
    expect(getSourceDiagnostics('...\n# Body')).toEqual([
      expect.objectContaining({
        severity: 'error',
        message: expect.stringContaining('without an opening'),
      }),
    ])
  })

  it('accepts correctly fenced frontmatter', () => {
    expect(getSourceDiagnostics('---\ntitle: Valid\n---\n# Body')).toEqual([])
  })
})
