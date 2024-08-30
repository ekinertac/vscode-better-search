export interface SearchState {
  caseSensitive: boolean;
  isRegex: boolean;
  isExclude: boolean;
}

export interface SearchResult {
  label: string;
  description: string;
  detail: string;
}
