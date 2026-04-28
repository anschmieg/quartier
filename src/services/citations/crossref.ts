import type { CitationItem, CitationSearchResult } from './types'

interface CrossrefResponse {
    message: {
        items: any[]
        'total-results': number
    }
}

export class CrossrefService {
    private baseUrl = 'https://api.crossref.org/works'

    async search(query: string, limit = 10): Promise<CitationSearchResult> {
        if (!query.trim()) return { items: [], total: 0 }

        const url = `${this.baseUrl}?query.bibliographic=${encodeURIComponent(query)}&rows=${limit}&sort=relevance`
        
        try {
            const response = await fetch(url)
            if (!response.ok) throw new Error(`Crossref API error: ${response.status}`)
            
            const data = await response.json() as CrossrefResponse
            const items = data.message.items.map((item: any) => this.convertToItem(item))
            
            return {
                items,
                total: data.message['total-results']
            }
        } catch (e) {
            console.error('Crossref search failed:', e)
            throw e
        }
    }

    private convertToItem(entry: any): CitationItem {
        return {
            id: entry.DOI || entry.title?.[0], // Crossref doesn't give "keys", we use DOI as temp ID
            type: entry.type,
            title: entry.title?.[0] || 'Untitled',
            author: entry.author || [],
            issued: entry.issued,
            containerTitle: entry['container-title']?.[0],
            doi: entry.DOI,
            url: entry.URL,
            source: 'crossref',
            originalData: entry 
            // Note: entry is already in CSL-JSON-ish format which citation-js likes
        }
    }
}

export const crossrefService = new CrossrefService()
