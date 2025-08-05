import { useState, useCallback, useRef } from 'react'
import { Screenshot, api } from '@/lib/api'
import { cacheManager } from '@/lib/cache'
import { debounce } from 'lodash'

interface UseSearchCacheReturn {
  searchResults: Screenshot[]
  isSearching: boolean
  searchError: string | null
  search: (query: string) => Promise<void>
  clearSearch: () => void
  lastQuery: string
}

export const useSearchCache = (): UseSearchCacheReturn => {
  const [searchResults, setSearchResults] = useState<Screenshot[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  
  const activeSearchRef = useRef<AbortController | null>(null)

  // Debounced search function
  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (query.trim() === '') {
        setSearchResults([])
        setIsSearching(false)
        setLastQuery('')
        return
      }

      // Cancel previous search if still running
      if (activeSearchRef.current) {
        activeSearchRef.current.abort()
      }

      // Create new abort controller for this search
      activeSearchRef.current = new AbortController()
      const { signal } = activeSearchRef.current

      try {
        setIsSearching(true)
        setSearchError(null)
        setLastQuery(query)

        // Check cache first
        const cachedResults = cacheManager.getSearchResults(query)
        if (cachedResults) {
          console.log(`📦 Using cached search results for: ${query}`)
          setSearchResults(cachedResults)
          setIsSearching(false)
          return
        }

        console.log(`🔍 Searching for: ${query}`)

        // Perform search
        const results = await api.search(query)
        
        // Check if request was aborted
        if (signal.aborted) {
          return
        }

        console.log(`✅ Found ${results.length} search results`)
        
        // Extract screenshots from QueryResult objects
        const screenshots = results.map(result => result.screenshot)
        
        // Cache results
        cacheManager.setSearchResults(query, screenshots)
        
        setSearchResults(screenshots)
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        const errorMessage = err instanceof Error ? err.message : 'Unknown search error'
        console.error('❌ Search failed:', errorMessage)
        setSearchError(errorMessage)
        setSearchResults([])
      } finally {
        if (!signal.aborted) {
          setIsSearching(false)
        }
      }
    }, 300)
  ).current

  // Search function
  const search = useCallback(async (query: string) => {
    await debouncedSearch(query)
  }, [debouncedSearch])

  // Clear search results
  const clearSearch = useCallback(() => {
    // Cancel any active search
    if (activeSearchRef.current) {
      activeSearchRef.current.abort()
    }
    
    setSearchResults([])
    setIsSearching(false)
    setSearchError(null)
    setLastQuery('')
    debouncedSearch.cancel()
  }, [debouncedSearch])

  return {
    searchResults,
    isSearching,
    searchError,
    search,
    clearSearch,
    lastQuery
  }
}