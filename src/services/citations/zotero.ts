import type { CitationItem, CitationSearchResult } from './types'
import { useStorage } from '@vueuse/core'

// Persist auth
export const zoteroConfig = useStorage('quartier:zotero-config', {
    apiKey: '',
    userId: ''
})

export class ZoteroService {
    private baseUrl = 'https://api.zotero.org'

    isAuthenticated(): boolean {
        return !!(zoteroConfig.value.apiKey && zoteroConfig.value.userId)
    }

    async search(query: string, limit = 10): Promise<CitationSearchResult> {
        if (!this.isAuthenticated()) throw new Error('Not authenticated')
        
        const { apiKey, userId } = zoteroConfig.value
        // Search user library
        // Use format=json with include=csljson for robust structure
        // Exclude attachments via API
        const url = `${this.baseUrl}/users/${userId}/items?q=${encodeURIComponent(query)}&qmode=everything&format=json&include=data,csljson&limit=${limit}&itemType=-attachment`

        try {
            const response = await fetch(url, {
                headers: {
                    'Zotero-API-Key': apiKey
                }
            })

            if (!response.ok) {
                 if (response.status === 403) throw new Error('Invalid API Key')
                 if (response.status === 404) throw new Error('User ID not found')
                 throw new Error(`Zotero API error: ${response.status}`)
            }
            
            const total = parseInt(response.headers.get('Total-Results') || '0', 10)
            const data = await response.json()
            
            if (!Array.isArray(data)) {
                console.warn('Zotero API returned non-array:', data)
                return { items: [], total: 0 }
            }

            // Data is array of Wrapper objects { key, data, csljson, ... }
            const items = data
                .filter((item: any) => item.data.itemType !== 'note' && item.data.itemType !== 'attachment') // redundant attachment check but safe
                .map((item: any) => this.convertToItem(item.csljson))
            
            return { items, total }

        } catch (e) {
            console.error('Zotero search failed:', e)
            throw e
        }
    }

    private convertToItem(entry: any): CitationItem {
        return {
            id: entry.id, // This is usually the Zotero item key (e.g. A2B3C4D5), not the citation key
            type: entry.type,
            title: entry.title,
            author: entry.author || [],
            issued: entry.issued,
            containerTitle: entry['container-title'],
            doi: entry.DOI,
            url: entry.URL,
            abstract: entry.abstract,
            source: 'zotero',
            zoteroKey: entry.id,
            originalData: entry
        }
    }

    async validateKey(apiKey: string): Promise<{ userId: string; username?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/keys/${apiKey}`, {
                headers: { 'Zotero-API-Key': apiKey }
            })
            
            if (!response.ok) {
                throw new Error('Invalid API Key')
            }
            
            const data = await response.json()
            if (!data.userID) {
                throw new Error('No User ID associated with this key')
            }
            
            return { userId: String(data.userID), username: data.username } // Username might not be in the key response, but ID is.
        } catch (e) {
            console.error('Key validation failed:', e)
            throw e
        }
    }
}

export const zoteroService = new ZoteroService()
