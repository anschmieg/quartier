import { describe, expect, it } from 'vitest'
import {
  parseFencedDivDirective,
  serializeFencedDivDirective,
  classifyFencedDiv,
  updateFencedDivOption,
} from '@/components/editor/plugins/fenced-div/metadata'

describe('fenced div metadata helpers', () => {
  it('parses generic fenced div classes, ids, style, and unknown attributes', () => {
    expect(parseFencedDivDirective('::: {#box .custom .secondary style="border: 1px" data-kind="example"}')).toEqual({
      id: 'box',
      classes: ['custom', 'secondary'],
      style: 'border: 1px',
      attributes: { 'data-kind': 'example' },
    })
  })

  it('classifies tabsets, columns, and generic divs', () => {
    expect(classifyFencedDiv(parseFencedDivDirective('::: {.panel-tabset}')!)).toBe('tabset')
    expect(classifyFencedDiv(parseFencedDivDirective('::: {.columns}')!)).toBe('columns')
    expect(classifyFencedDiv(parseFencedDivDirective('::: {.custom}')!)).toBe('generic')
  })

  it('serializes fenced div metadata to canonical Pandoc attribute syntax', () => {
    expect(serializeFencedDivDirective({
      id: 'tabs',
      classes: ['panel-tabset', 'custom'],
      style: 'gap: 1rem',
      attributes: { 'data-owner': 'ada' },
    })).toBe('::: {#tabs .panel-tabset .custom style="gap: 1rem" data-owner="ada"}')
  })

  it('updates options immutably without dropping unknown attributes', () => {
    const original = parseFencedDivDirective('::: {#old .columns data-owner="ada"}')
    expect(original).not.toBeNull()

    const withClass = updateFencedDivOption(original!, 'classes', ['columns', 'gap'])
    const withId = updateFencedDivOption(withClass, 'id', 'layout')

    expect(original?.id).toBe('old')
    expect(serializeFencedDivDirective(withId)).toBe('::: {#layout .columns .gap data-owner="ada"}')
  })

  it('returns null for callouts and non-fenced-div directives', () => {
    expect(parseFencedDivDirective('::: {.callout-note}')).toBeNull()
    expect(parseFencedDivDirective('```{python}')).toBeNull()
  })
})
