export const LOCAL_DOCUMENT_KEY = 'quartier.local-document.v1'

export const DEFAULT_DOCUMENT = `---
title: "Untitled Quartier Document"
format: html
---

# Welcome to Quartier

Write Quarto Markdown here. This draft is saved in your browser automatically.
`

export interface DocumentExport {
  filename: string
  blob: Blob
}

export function loadDocument(): string {
  return localStorage.getItem(LOCAL_DOCUMENT_KEY) ?? DEFAULT_DOCUMENT
}

export function saveDocument(source: string): void {
  localStorage.setItem(LOCAL_DOCUMENT_KEY, source)
}

export function resetDocument(): string {
  saveDocument(DEFAULT_DOCUMENT)
  return DEFAULT_DOCUMENT
}

export function createDocumentExport(source: string): DocumentExport {
  return {
    filename: 'quartier-document.qmd',
    blob: new Blob([source], { type: 'text/markdown;charset=utf-8' }),
  }
}
