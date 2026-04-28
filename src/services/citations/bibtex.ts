import Cite from 'citation-js'
import { ref } from 'vue'
import type { CitationItem } from './types'

export class BibTexService {
    public references = ref<CitationItem[]>([])
    
    /**
     * Parse BibTeX content into CitationItems
     */
    async parse(content: string): Promise<CitationItem[]> {
        if (!content.trim()) return []
        
        try {
            // Lazy load if needed, but here we assume it's loaded
            const cite = new Cite(content)
            const data = cite.data
            
            return data.map((entry: any) => this.convertToItem(entry, 'local'))
        } catch (e) {
            console.warn('Failed to parse BibTeX:', e)
            return []
        }
    }

    /**
     * Update global references state from content
     */
    async update(content: string) {
        this.references.value = await this.parse(content)
    }

    /**
     * Get item by ID
     */
    getItem(id: string): CitationItem | undefined {
        return this.references.value.find(i => i.id === id)
    }

    // ... rest of methods

    /**
     * Convert CitationItem back to BibTeX string
     */
    async toBibTex(item: CitationItem): Promise<string> {
        try {
            // Use original data if available to preserve fidelity
            const data = item.originalData || this.convertToCSL(item)
            const cite = new Cite(data)
            return cite.format('bibtex', { format: 'text' })
        } catch (e) {
            console.error('Failed to convert to BibTeX:', e)
            return ''
        }
    }

    /**
     * Generate a unique citation key (e.g. smith2023overview)
     */
    generateKey(item: CitationItem): string {
        if (item.id && !item.id.includes('undefined')) return item.id
        
        const author = item.author?.[0]?.family?.toLowerCase().replace(/[^a-z]/g, '') || 'anonymous'
        const year = item.issued?.['date-parts']?.[0]?.[0] || 'n.d.'
        const title = item.title?.split(' ')[0]?.toLowerCase().replace(/[^a-z]/g, '') || 'untitled'
        
        return `${author}${year}${title}`
    }

    // --- Helpers ---

    private convertToItem(entry: any, source: 'local' | 'crossref' | 'zotero'): CitationItem {
        return {
            id: entry.id,
            type: entry.type,
            title: entry.title,
            author: entry.author || [],
            issued: entry.issued,
            containerTitle: entry['container-title'],
            doi: entry.DOI,
            url: entry.URL,
            abstract: entry.abstract,
            source,
            originalData: entry
        }
    }

    private convertToCSL(item: CitationItem): any {
        // Construct minimal CSL-JSON for citation-js
        return {
            id: item.id || this.generateKey(item),
            type: item.type || 'article-journal',
            title: item.title,
            author: item.author,
            issued: item.issued,
            'container-title': item.containerTitle,
            DOI: item.doi,
            URL: item.url,
            abstract: item.abstract
        }
    }
}

export const bibtexService = new BibTexService()
