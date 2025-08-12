import { Screenshot } from './api'

// Cache configuration
const CACHE_KEYS = {
  SCREENSHOTS: 'instago_screenshots',
  THUMBNAILS: 'instago_thumbnails',
  SEARCH_RESULTS: 'instago_search_results',
  LAST_FETCH: 'instago_last_fetch',
  LAST_SYNC: 'instago_last_sync'
} as const

const CACHE_EXPIRY = {
  SCREENSHOTS: 15 * 60 * 1000, // 15 minutes
  THUMBNAILS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SEARCH_RESULTS: 5 * 60 * 1000 // 5 minutes
} as const

interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
}

interface ThumbnailCache {
  [key: string]: {
    dataUrl: string
    timestamp: number
  }
}

interface SearchResultsCache {
  [query: string]: {
    results: Screenshot[]
    timestamp: number
  }
}

interface ScreenshotMetadata {
  _localCachedAt?: number
  _thumbnailGenerated?: boolean
  _viewCount?: number
}

class CacheManager {
  private static instance: CacheManager
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  // Check if we're in a browser environment
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  }

  // Generic cache methods
  private setCache<T>(key: string, data: T, expiry: number): void {
    if (!this.isBrowser()) return
    
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry
      }
      localStorage.setItem(key, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn('Failed to set cache:', error)
      // If localStorage is full, try to clear old entries
      this.clearExpiredEntries()
    }
  }

  private getCache<T>(key: string): T | null {
    if (!this.isBrowser()) return null
    
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const cacheItem: CacheItem<T> = JSON.parse(cached)
      const now = Date.now()

      if (now - cacheItem.timestamp > cacheItem.expiry) {
        localStorage.removeItem(key)
        return null
      }

      return cacheItem.data
    } catch (error) {
      console.warn('Failed to get cache:', error)
      return null
    }
  }

  private removeCache(key: string): void {
    if (!this.isBrowser()) return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove cache:', error)
    }
  }

  // Screenshot cache methods
  setScreenshots(screenshots: Screenshot[]): void {
    this.setCache(CACHE_KEYS.SCREENSHOTS, screenshots, CACHE_EXPIRY.SCREENSHOTS)
    this.setLastFetch()
  }

  getScreenshots(): Screenshot[] | null {
    return this.getCache<Screenshot[]>(CACHE_KEYS.SCREENSHOTS)
  }

  addScreenshot(screenshot: Screenshot): Screenshot[] {
    const cached = this.getScreenshots() || []
    const updated = [screenshot, ...cached.filter(s => s.id !== screenshot.id)]
    this.setScreenshots(updated)
    return updated
  }

  // Intelligent merge for incremental updates
  mergeScreenshots(newScreenshots: Screenshot[]): {
    merged: Screenshot[]
    newCount: number
    updatedCount: number
  } {
    const cached = this.getScreenshots() || []
    console.log(`🔄 Merging ${newScreenshots.length} new screenshots with ${cached.length} cached ones`)
    
    // Maps for efficient lookup (not used but prepared for future optimization)
    // const cachedMap = new Map(cached.map(s => [s.id, s]))
    // const newMap = new Map(newScreenshots.map(s => [s.id, s]))
    
    let newCount = 0
    let updatedCount = 0
    
    // Start with cached screenshots to preserve local metadata
    const merged = [...cached]
    
    // Process new screenshots
    newScreenshots.forEach(newScreenshot => {
      const existingIndex = merged.findIndex(s => s.id === newScreenshot.id)
      
      if (existingIndex >= 0) {
        // Update existing screenshot while preserving local metadata
        const existing = merged[existingIndex] as Screenshot & ScreenshotMetadata
        merged[existingIndex] = {
          ...newScreenshot,
          // Preserve local metadata
          _localCachedAt: existing._localCachedAt,
          _thumbnailGenerated: existing._thumbnailGenerated,
          _viewCount: existing._viewCount
        } as Screenshot & ScreenshotMetadata
        updatedCount++
        console.log(`📝 Updated screenshot: ${newScreenshot.id}`)
      } else {
        // Add new screenshot to the beginning (most recent first)
        merged.unshift({
          ...newScreenshot,
          _localCachedAt: Date.now()
        } as Screenshot & ScreenshotMetadata)
        newCount++
        console.log(`✨ Added new screenshot: ${newScreenshot.id}`)
      }
    })
    
    // Sort by creation date (newest first) while maintaining relative order
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    console.log(`✅ Merge completed: ${newCount} new, ${updatedCount} updated, ${merged.length} total`)
    
    // Update cache with merged data
    this.setScreenshots(merged)
    this.setLastSync()
    
    return {
      merged,
      newCount,
      updatedCount
    }
  }

  updateScreenshot(screenshotId: string, updates: Partial<Screenshot>): Screenshot[] | null {
    const cached = this.getScreenshots()
    if (!cached) return null

    const updated = cached.map(s => 
      s.id === screenshotId ? { ...s, ...updates } : s
    )
    this.setScreenshots(updated)
    return updated
  }

  removeScreenshot(screenshotId: string): Screenshot[] | null {
    const cached = this.getScreenshots()
    if (!cached) return null

    const updated = cached.filter(s => s.id !== screenshotId)
    this.setScreenshots(updated)
    this.removeThumbnail(screenshotId)
    return updated
  }

  // Thumbnail cache methods
  setThumbnail(screenshotId: string, dataUrl: string): void {
    if (!this.isBrowser()) return
    
    try {
      const thumbnails = this.getThumbnails()
      thumbnails[screenshotId] = {
        dataUrl,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEYS.THUMBNAILS, JSON.stringify(thumbnails))
    } catch (error) {
      console.warn('Failed to cache thumbnail:', error)
    }
  }

  getThumbnail(screenshotId: string): string | null {
    try {
      const thumbnails = this.getThumbnails()
      const thumbnail = thumbnails[screenshotId]
      
      if (!thumbnail) return null
      
      // Check if thumbnail is expired (7 days)
      if (Date.now() - thumbnail.timestamp > CACHE_EXPIRY.THUMBNAILS) {
        delete thumbnails[screenshotId]
        localStorage.setItem(CACHE_KEYS.THUMBNAILS, JSON.stringify(thumbnails))
        return null
      }
      
      return thumbnail.dataUrl
    } catch (error) {
      console.warn('Failed to get thumbnail:', error)
      return null
    }
  }

  private getThumbnails(): ThumbnailCache {
    if (!this.isBrowser()) return {}
    
    try {
      const cached = localStorage.getItem(CACHE_KEYS.THUMBNAILS)
      return cached ? JSON.parse(cached) : {}
    } catch (error) {
      console.warn('Failed to get thumbnails cache:', error)
      return {}
    }
  }

  removeThumbnail(screenshotId: string): void {
    if (!this.isBrowser()) return
    
    try {
      const thumbnails = this.getThumbnails()
      delete thumbnails[screenshotId]
      localStorage.setItem(CACHE_KEYS.THUMBNAILS, JSON.stringify(thumbnails))
    } catch (error) {
      console.warn('Failed to remove thumbnail:', error)
    }
  }

  // Search results cache
  setSearchResults(query: string, results: Screenshot[]): void {
    if (!this.isBrowser()) return
    
    try {
      const cache = this.getSearchResultsCache()
      cache[query] = {
        results,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEYS.SEARCH_RESULTS, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to cache search results:', error)
    }
  }

  getSearchResults(query: string): Screenshot[] | null {
    try {
      const cache = this.getSearchResultsCache()
      const cached = cache[query]
      
      if (!cached) return null
      
      // Check if search results are expired
      if (Date.now() - cached.timestamp > CACHE_EXPIRY.SEARCH_RESULTS) {
        delete cache[query]
        localStorage.setItem(CACHE_KEYS.SEARCH_RESULTS, JSON.stringify(cache))
        return null
      }
      
      return cached.results
    } catch (error) {
      console.warn('Failed to get search results:', error)
      return null
    }
  }

  private getSearchResultsCache(): SearchResultsCache {
    if (!this.isBrowser()) return {}
    
    try {
      const cached = localStorage.getItem(CACHE_KEYS.SEARCH_RESULTS)
      return cached ? JSON.parse(cached) : {}
    } catch (error) {
      console.warn('Failed to get search results cache:', error)
      return {}
    }
  }

  clearSearchResults(): void {
    this.removeCache(CACHE_KEYS.SEARCH_RESULTS)
  }

  // Last fetch tracking
  private setLastFetch(): void {
    if (!this.isBrowser()) return
    
    try {
      localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString())
    } catch (error) {
      console.warn('Failed to set last fetch time:', error)
    }
  }

  // Last sync tracking for incremental updates
  setLastSync(): void {
    if (!this.isBrowser()) return
    
    try {
      localStorage.setItem(CACHE_KEYS.LAST_SYNC, Date.now().toString())
    } catch (error) {
      console.warn('Failed to set last sync time:', error)
    }
  }

  getLastSync(): number | null {
    if (!this.isBrowser()) return null
    
    try {
      const lastSync = localStorage.getItem(CACHE_KEYS.LAST_SYNC)
      return lastSync ? parseInt(lastSync) : null
    } catch (error) {
      console.warn('Failed to get last sync time:', error)
      return null
    }
  }

  getLastFetch(): number | null {
    if (!this.isBrowser()) return null
    
    try {
      const lastFetch = localStorage.getItem(CACHE_KEYS.LAST_FETCH)
      return lastFetch ? parseInt(lastFetch) : null
    } catch (error) {
      console.warn('Failed to get last fetch time:', error)
      return null
    }
  }

  // Cache management
  isScreenshotsCacheValid(): boolean {
    const cached = this.getScreenshots()
    return cached !== null && cached.length > 0
  }

  shouldRefreshCache(): boolean {
    const lastFetch = this.getLastFetch()
    if (!lastFetch) return true
    
    return Date.now() - lastFetch > CACHE_EXPIRY.SCREENSHOTS
  }

  // Check if we should perform incremental update
  shouldIncrementalUpdate(): boolean {
    const lastSync = this.getLastSync()
    if (!lastSync) return true
    
    // Perform incremental update every 2 minutes instead of full refresh
    const INCREMENTAL_INTERVAL = 2 * 60 * 1000 // 2 minutes
    return Date.now() - lastSync > INCREMENTAL_INTERVAL
  }

  // Check if cache has any data
  hasCachedData(): boolean {
    const screenshots = this.getScreenshots()
    return screenshots !== null && screenshots.length > 0
  }

  clearExpiredEntries(): void {
    try {
      // Clear expired screenshots
      const screenshots = this.getCache<Screenshot[]>(CACHE_KEYS.SCREENSHOTS)
      if (screenshots === null) {
        this.removeCache(CACHE_KEYS.SCREENSHOTS)
      }

      // Clear expired thumbnails
      const thumbnails = this.getThumbnails()
      const now = Date.now()
      let thumbnailsChanged = false
      
      Object.keys(thumbnails).forEach(key => {
        if (now - thumbnails[key].timestamp > CACHE_EXPIRY.THUMBNAILS) {
          delete thumbnails[key]
          thumbnailsChanged = true
        }
      })
      
      if (thumbnailsChanged) {
        localStorage.setItem(CACHE_KEYS.THUMBNAILS, JSON.stringify(thumbnails))
      }

      // Clear expired search results
      const searchCache = this.getSearchResultsCache()
      let searchChanged = false
      
      Object.keys(searchCache).forEach(key => {
        if (now - searchCache[key].timestamp > CACHE_EXPIRY.SEARCH_RESULTS) {
          delete searchCache[key]
          searchChanged = true
        }
      })
      
      if (searchChanged) {
        localStorage.setItem(CACHE_KEYS.SEARCH_RESULTS, JSON.stringify(searchCache))
      }
    } catch (error) {
      console.warn('Failed to clear expired entries:', error)
    }
  }

  clearAllCache(): void {
    Object.values(CACHE_KEYS).forEach(key => {
      this.removeCache(key)
    })
  }

  // Mark screenshot as viewed (for local metadata)
  markScreenshotViewed(screenshotId: string): void {
    const screenshots = this.getScreenshots()
    if (!screenshots) return

    const updated = screenshots.map(s => {
      if (s.id === screenshotId) {
        return {
          ...s,
          _viewCount: ((s as Screenshot & ScreenshotMetadata)._viewCount || 0) + 1
        } as Screenshot & ScreenshotMetadata
      }
      return s
    })

    this.setScreenshots(updated)
  }

  getCacheStats(): {
    screenshots: number
    thumbnails: number
    searchResults: number
    totalSize: string
  } {
    if (!this.isBrowser()) {
      return {
        screenshots: 0,
        thumbnails: 0,
        searchResults: 0,
        totalSize: '0KB'
      }
    }
    
    try {
      const screenshots = this.getScreenshots()?.length || 0
      const thumbnails = Object.keys(this.getThumbnails()).length
      const searchResults = Object.keys(this.getSearchResultsCache()).length
      
      // Calculate approximate cache size
      let totalSize = 0
      Object.values(CACHE_KEYS).forEach(key => {
        const item = localStorage.getItem(key)
        if (item) {
          totalSize += new Blob([item]).size
        }
      })
      
      const sizeStr = totalSize > 1024 * 1024 
        ? `${(totalSize / (1024 * 1024)).toFixed(1)}MB`
        : `${(totalSize / 1024).toFixed(1)}KB`
      
      return {
        screenshots,
        thumbnails,
        searchResults,
        totalSize: sizeStr
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error)
      return {
        screenshots: 0,
        thumbnails: 0,
        searchResults: 0,
        totalSize: '0KB'
      }
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance()

// Clean up expired entries on initialization
cacheManager.clearExpiredEntries()

// Add debug utilities for development
if (typeof window !== 'undefined') {
  (window as typeof window & { debugCache: unknown }).debugCache = {
    getCacheStats: () => cacheManager.getCacheStats(),
    getLastSync: () => cacheManager.getLastSync(),
    getLastFetch: () => cacheManager.getLastFetch(),
    shouldIncrementalUpdate: () => cacheManager.shouldIncrementalUpdate(),
    shouldRefreshCache: () => cacheManager.shouldRefreshCache(),
    hasCachedData: () => cacheManager.hasCachedData(),
    clearAllCache: () => cacheManager.clearAllCache(),
    getScreenshots: () => cacheManager.getScreenshots(),
    setLastSync: () => cacheManager.setLastSync(),
    
    // Test incremental merge
    testMerge: (newScreenshots: Screenshot[]) => cacheManager.mergeScreenshots(newScreenshots)
  }
  
  console.log('🛠️ Cache debug utilities available at window.debugCache')
}