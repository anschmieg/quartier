import { describe, expect, it } from 'vitest'
import {
  CALLOUT_TYPES,
  parseCalloutDirective,
  serializeCalloutDirective,
  updateCalloutOption,
} from '@/components/editor/plugins/callout/metadata'

describe('callout metadata helpers', () => {
  it('parses every Quarto callout type from canonical fenced div syntax', () => {
    for (const type of CALLOUT_TYPES) {
      expect(parseCalloutDirective(`::: {.callout-${type}}`)).toMatchObject({ type })
    }
  })

  it('parses id, title, collapse, appearance, icon, extra classes, and unknown attributes', () => {
    expect(
      parseCalloutDirective('::: {#note-id .callout-warning .custom title="Watch out" collapse="true" appearance="simple" icon="false" data-owner="ada"}'),
    ).toEqual({
      type: 'warning',
      id: 'note-id',
      title: 'Watch out',
      collapse: 'true',
      appearance: 'simple',
      icon: 'false',
      extraClasses: ['custom'],
      attributes: { 'data-owner': 'ada' },
    })
  })

  it('parses Milkdown remark-directive attributes without losing canonical Quarto metadata', () => {
    expect(
      parseCalloutDirective(':::callout-tip{id="tip-id" class="custom secondary" title="Use this" collapse="false" icon="false" data-owner="ada"}'),
    ).toEqual({
      type: 'tip',
      id: 'tip-id',
      title: 'Use this',
      collapse: 'false',
      appearance: undefined,
      icon: 'false',
      extraClasses: ['custom', 'secondary'],
      attributes: { 'data-owner': 'ada' },
    })
  })

  it('serializes callout metadata back to canonical Quarto syntax', () => {
    expect(
      serializeCalloutDirective({
        type: 'tip',
        id: 'tip-fast',
        title: 'Fast path',
        collapse: 'false',
        appearance: 'minimal',
        icon: 'false',
        extraClasses: ['custom'],
        attributes: { 'data-owner': 'ada' },
      }),
    ).toBe('::: {#tip-fast .callout-tip .custom title="Fast path" collapse="false" appearance="minimal" icon="false" data-owner="ada"}')
  })

  it('updates stable callout options without mutating the original metadata', () => {
    const original = parseCalloutDirective('::: {.callout-note title="Old"}')
    expect(original).not.toBeNull()

    const updated = updateCalloutOption(original!, 'title', 'New')

    expect(original?.title).toBe('Old')
    expect(updated.title).toBe('New')
    expect(serializeCalloutDirective(updated)).toBe('::: {.callout-note title="New"}')
  })

  it('updates type and removes empty stable options predictably', () => {
    const original = parseCalloutDirective('::: {.callout-note title="Old" collapse="true" icon="false"}')
    expect(original).not.toBeNull()

    const changedType = updateCalloutOption(original!, 'type', 'important')
    const removedTitle = updateCalloutOption(changedType, 'title', '')
    const expanded = updateCalloutOption(removedTitle, 'collapse', 'false')
    const showIcon = updateCalloutOption(expanded, 'icon', '')

    expect(serializeCalloutDirective(showIcon)).toBe('::: {.callout-important collapse="false"}')
    expect(original?.type).toBe('note')
    expect(original?.title).toBe('Old')
  })

  it('returns null for generic fenced divs and unsupported callout types', () => {
    expect(parseCalloutDirective('::: {.panel-tabset}')).toBeNull()
    expect(parseCalloutDirective('::: {.callout-danger}')).toBeNull()
    expect(parseCalloutDirective(':::callout-danger')).toBeNull()
  })
})
