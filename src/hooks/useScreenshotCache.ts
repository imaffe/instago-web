import { useState, useEffect, useCallback, useRef } from 'react'
import { Screenshot, api } from '@/lib/api'
import { cacheManager } from '@/lib/cache'
import { preloadThumbnails, getThumbnail } from '@/lib/thumbnail'

interface UseScreenshotCacheOptions {
  enableThumbnails?: boolean
  thumbnailOptions?: {
    width?: number
    height?: number
    quality?: number
  }
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseScreenshotCacheReturn {
  screenshots: Screenshot[]
  loading: boolean
  error: string | null
  refreshScreenshots: () => Promise<void>
  addScreenshot: (screenshot: Screenshot) => void
  updateScreenshot: (id: string, updates: Partial<Screenshot>) => void
  removeScreenshot: (id: string) => void
  getThumbnailUrl: (screenshotId: string) => string | null
  cacheStats: {
    screenshots: number
    thumbnails: number
    searchResults: number
    totalSize: string
  }
  clearCache: () => void
  forceRefresh: () => Promise<void>
}

export const useScreenshotCache = (
  options: UseScreenshotCacheOptions = {}
): UseScreenshotCacheReturn => {
  const {
    enableThumbnails = true,
    thumbnailOptions = { width: 300, height: 200, quality: 0.8 },
    autoRefresh = true,
    refreshInterval = 15 * 60 * 1000 // 15 minutes
  } = options

  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isInitializedRef = useRef(false)

  // Preload thumbnails helper
  const preloadThumbnailsHelper = useCallback(async (screenshotList: Screenshot[]) => {
    if (!enableThumbnails) return

    const items = screenshotList
      .filter(s => s.image_url)
      .map(s => ({
        imageUrl: s.image_url!,
        screenshotId: s.id
      }))

    if (items.length > 0) {
      try {
        await preloadThumbnails(items, thumbnailOptions)
      } catch (error) {
        console.warn('Failed to preload some thumbnails:', error)
      }
    }
  }, [enableThumbnails, thumbnailOptions])

  // Fetch screenshots from API and cache them
  const fetchAndCacheScreenshots = useCallback(async () => {
    try {
      setError(null)
      console.log('🔄 Fetching screenshots from API...')
      
      const fetchedScreenshots = await api.screenshots.list()
      
      // Update cache
      cacheManager.setScreenshots(fetchedScreenshots)
      setScreenshots(fetchedScreenshots)
      
      console.log(`✅ Fetched and cached ${fetchedScreenshots.length} screenshots`)
      
      // Preload thumbnails if enabled (with delay to not block UI)
      if (enableThumbnails && fetchedScreenshots.length > 0) {
        setTimeout(() => {
          preloadThumbnailsHelper(fetchedScreenshots)
        }, 1000)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch screenshots'
      console.error('❌ Error fetching screenshots:', errorMessage)
      
      // Try to use cached data even if expired
      const cachedScreenshots = cacheManager.getScreenshots()
      if (cachedScreenshots) {
        console.log('📦 Using expired cache as fallback')
        setScreenshots(cachedScreenshots)
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [enableThumbnails, preloadThumbnailsHelper])

  // Initialize cache and load screenshots
  const initializeCache = useCallback(async () => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    try {
      setLoading(true)
      setError(null)

      // Try to load from cache first
      const cachedScreenshots = cacheManager.getScreenshots()
      
      if (cachedScreenshots && !cacheManager.shouldRefreshCache()) {
        console.log(`📦 Loaded ${cachedScreenshots.length} screenshots from cache`)
        setScreenshots(cachedScreenshots)
        setLoading(false)
        
        // Preload thumbnails in background if enabled
        if (enableThumbnails && cachedScreenshots.length > 0) {
          setTimeout(() => {
            preloadThumbnailsHelper(cachedScreenshots)
          }, 1000)
        }
        
        return
      }

      // Cache is invalid or expired, fetch from API
      console.log('🔄 Cache invalid/expired, fetching from API...')
      await fetchAndCacheScreenshots()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize cache'
      console.error('❌ Cache initialization failed:', errorMessage)
      setError(errorMessage)
      setLoading(false)
    }
  }, [enableThumbnails, fetchAndCacheScreenshots, preloadThumbnailsHelper])

  // Refresh screenshots
  const refreshScreenshots = useCallback(async () => {
    if (loading) return
    
    setLoading(true)
    await fetchAndCacheScreenshots()
  }, [loading, fetchAndCacheScreenshots])

  // Force refresh (ignores cache)
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refreshing screenshots...')
    cacheManager.clearAllCache()
    setLoading(true)
    await fetchAndCacheScreenshots()
  }, [fetchAndCacheScreenshots])

  // Add screenshot to cache
  const addScreenshot = useCallback((screenshot: Screenshot) => {
    const updatedScreenshots = cacheManager.addScreenshot(screenshot)
    setScreenshots(updatedScreenshots)
    
    // Generate thumbnail for new screenshot
    if (enableThumbnails && screenshot.image_url) {
      setTimeout(() => {
        preloadThumbnailsHelper([screenshot])
      }, 100)
    }
  }, [enableThumbnails, preloadThumbnailsHelper])

  // Update screenshot in cache
  const updateScreenshot = useCallback((id: string, updates: Partial<Screenshot>) => {
    const updatedScreenshots = cacheManager.updateScreenshot(id, updates)
    if (updatedScreenshots) {
      setScreenshots(updatedScreenshots)
    }
  }, [])

  // Remove screenshot from cache
  const removeScreenshot = useCallback((id: string) => {
    const updatedScreenshots = cacheManager.removeScreenshot(id)
    if (updatedScreenshots) {
      setScreenshots(updatedScreenshots)
    }
  }, [])

  // Get thumbnail URL for a screenshot
  const getThumbnailUrl = useCallback((screenshotId: string): string | null => {
    if (!enableThumbnails) return null
    return getThumbnail(screenshotId)
  }, [enableThumbnails])

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return cacheManager.getCacheStats()
  }, [])

  // Clear all cache
  const clearCache = useCallback(() => {
    cacheManager.clearAllCache()
    setScreenshots([])
    setLoading(true)
    // Reinitialize after clearing
    setTimeout(() => {
      isInitializedRef.current = false
      initializeCache()
    }, 100)
  }, [initializeCache])

  // Set up auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      refreshTimeoutRef.current = setTimeout(async () => {
        if (cacheManager.shouldRefreshCache()) {
          console.log('⏰ Auto-refreshing screenshots...')
          await refreshScreenshots()
        }
        scheduleRefresh() // Schedule next refresh
      }, refreshInterval)
    }

    scheduleRefresh()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, refreshScreenshots])

  // Initialize cache on mount
  useEffect(() => {
    initializeCache()
  }, [initializeCache])

  // Handle visibility change to refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && cacheManager.shouldRefreshCache()) {
        console.log('👁️ Tab became active, checking for refresh...')
        refreshScreenshots()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshScreenshots])

  return {
    screenshots,
    loading,
    error,
    refreshScreenshots,
    addScreenshot,
    updateScreenshot,
    removeScreenshot,
    getThumbnailUrl,
    cacheStats: getCacheStats(),
    clearCache,
    forceRefresh
  }
}