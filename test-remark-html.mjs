import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)

const testCases = [
  '<!-- TODO: update license -->',
  'Some text <!-- inline comment --> more text',
  `
<!-- Block comment -->

Some paragraph text.
`,
  `
Paragraph with embedded <!-- comment --> text.
`
]

console.log('Testing how remark parses HTML comments:\n')

testCases.forEach((input, i) => {
  console.log(`\n=== Test Case ${i + 1} ===`)
  console.log('Input:', JSON.stringify(input))
  const tree = processor.parse(input)
  console.log('\nAST:')
  console.log(JSON.stringify(tree, null, 2))
  console.log('\n---')
})
