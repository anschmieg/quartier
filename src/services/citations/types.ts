export interface CitationItem {
    id: string; // The citation key (e.g. 'smith2023')
    type: 'article-journal' | 'book' | 'chapter' | 'paper-conference' | 'webpage' | 'other';
    title: string;
    author: { given?: string; family?: string; literal?: string }[];
    issued?: { 'date-parts'?: [number[]] }; // CSL style date
    containerTitle?: string; // Journal/Book name
    doi?: string;
    url?: string;
    abstract?: string;
    
    // Internal usage
    source: 'local' | 'crossref' | 'zotero';
    zoteroKey?: string; // For Zotero API
    originalData?: any; // The raw CSL-JSON or BibTeX
}

export interface CitationSearchResult {
    items: CitationItem[];
    total: number;
}
