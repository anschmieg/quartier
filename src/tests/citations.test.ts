import { describe, expect, it } from 'vitest'
import { simpleCitePlugin } from '@/components/editor/plugins/citations/simple-cite'
import { bibtexService } from '@/services/citations/bibtex'

describe('citation integration', () => {
  it('converts Pandoc citation text into cite nodes while preserving surrounding text', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'See [@smith2024] for details.' }],
        },
      ],
    }

    simpleCitePlugin()(tree)

    const paragraph = tree.children[0]
    expect(paragraph).toBeDefined()
    expect(paragraph?.children).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'cite', data: { citeItems: [{ key: 'smith2024' }] } },
      { type: 'text', value: ' for details.' },
    ])
  })

  it('parses BibTeX entries into the shared citation item model', async () => {
    const items = await bibtexService.parse(`
@article{smith2024,
  title = {A Useful Paper},
  author = {Smith, Jane},
  year = {2024},
  journal = {Journal of Useful Things}
}
`)

    expect(items[0]).toMatchObject({
      id: 'smith2024',
      title: 'A Useful Paper',
      source: 'local',
    })
  })
})
