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
  incrementalUpdate: () => Promise<{ newCount: number, updatedCount: number }>
  lastUpdateInfo: {
    lastSync: number | null
    newItemsCount: number
  }
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
  const [newItemsCount, setNewItemsCount] = useState(0)
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

  // Fetch screenshots from API and cache them (full refresh)
  const fetchAndCacheScreenshots = useCallback(async () => {
    try {
      setError(null)
      console.log('🔄 Fetching screenshots from API (full refresh)...')
      
      const fetchedScreenshots = await api.screenshots.list()
      
      // Update cache
      cacheManager.setScreenshots(fetchedScreenshots)
      setScreenshots(fetchedScreenshots)
      setNewItemsCount(0) // Reset new items count on full refresh
      
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

  // Incremental update - smart merging
  const incrementalUpdate = useCallback(async (): Promise<{ newCount: number, updatedCount: number }> => {
    try {
      setError(null)
      const lastSync = cacheManager.getLastSync()
      
      console.log('🔄 Performing incremental update...', lastSync ? `since ${new Date(lastSync).toISOString()}` : 'no previous sync')
      
      // Fetch only new/updated screenshots since last sync
      const newScreenshots = await api.screenshots.list({ 
        since: lastSync || undefined,
        limit: 50 // Limit for incremental updates
      })
      
      if (newScreenshots.length === 0) {
        console.log('📭 No new screenshots found')
        cacheManager.setLastSync() // Update sync time even if no new data
        return { newCount: 0, updatedCount: 0 }
      }
      
      // Use intelligent merging
      const { merged, newCount, updatedCount } = cacheManager.mergeScreenshots(newScreenshots)
      
      // Update state
      setScreenshots(merged)
      setNewItemsCount(prev => prev + newCount)
      
      // Preload thumbnails for new screenshots
      if (enableThumbnails && newScreenshots.length > 0) {
        setTimeout(() => {
          preloadThumbnailsHelper(newScreenshots)
        }, 500)
      }
      
      console.log(`✅ Incremental update completed: ${newCount} new, ${updatedCount} updated`)
      return { newCount, updatedCount }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform incremental update'
      console.error('❌ Incremental update failed:', errorMessage)
      
      // Don't set error state for incremental updates - just log it
      // The user can still see their cached data
      console.warn('Incremental update failed, will retry on next check')
      return { newCount: 0, updatedCount: 0 }
    }
  }, [enableThumbnails, preloadThumbnailsHelper])

  // Initialize cache and load screenshots with smart loading
  const initializeCache = useCallback(async () => {
    if (isInitializedRef.current) return
    isInitializedRef.current = true

    try {
      setError(null)

      // Always try to load from cache first for immediate display
      const cachedScreenshots = cacheManager.getScreenshots()
      
      if (cachedScreenshots && cachedScreenshots.length > 0) {
        console.log(`📦 Loaded ${cachedScreenshots.length} screenshots from cache (immediate display)`)
        setScreenshots(cachedScreenshots)
        setLoading(false)
        
        // Preload thumbnails in background
        if (enableThumbnails) {
          setTimeout(() => {
            preloadThumbnailsHelper(cachedScreenshots)
          }, 500)
        }
        
        // Check if we need incremental update
        if (cacheManager.shouldIncrementalUpdate()) {
          console.log('⚡ Performing background incremental update...')
          setTimeout(async () => {
            try {
              await incrementalUpdate()
            } catch (error) {
              console.warn('Background incremental update failed:', error)
            }
          }, 1000) // Delay to not block initial rendering
        }
        
        return
      }

      // No cache available, perform full fetch
      console.log('🔄 No cache available, performing initial fetch...')
      setLoading(true)
      await fetchAndCacheScreenshots()
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize cache'
      console.error('❌ Cache initialization failed:', errorMessage)
      setError(errorMessage)
      setLoading(false)
    }
  }, [enableThumbnails, fetchAndCacheScreenshots, preloadThumbnailsHelper, incrementalUpdate])

  // Smart refresh - uses incremental update if cache exists
  const refreshScreenshots = useCallback(async () => {
    if (loading) return
    
    // If we have cached data, try incremental update first
    if (cacheManager.hasCachedData()) {
      console.log('🔄 Smart refresh: trying incremental update first...')
      try {
        const result = await incrementalUpdate()
        if (result.newCount > 0 || result.updatedCount > 0) {
          console.log(`✅ Smart refresh successful: ${result.newCount} new, ${result.updatedCount} updated`)
          return
        }
      } catch (error) {
        console.warn('Incremental update failed, falling back to full refresh:', error)
      }
    }
    
    // Fallback to full refresh
    console.log('🔄 Performing full refresh...')
    setLoading(true)
    await fetchAndCacheScreenshots()
  }, [loading, fetchAndCacheScreenshots, incrementalUpdate])

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

  // Set up smart auto refresh with incremental updates
  useEffect(() => {
    if (!autoRefresh) return

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      // Use shorter interval for incremental checks
      const smartInterval = Math.min(refreshInterval / 4, 5 * 60 * 1000) // Max 5 minutes

      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          if (cacheManager.shouldIncrementalUpdate()) {
            console.log('⏰ Auto incremental update...')
            await incrementalUpdate()
          } else if (cacheManager.shouldRefreshCache()) {
            console.log('⏰ Auto full refresh...')
            await refreshScreenshots()
          }
        } catch (error) {
          console.warn('Auto refresh failed:', error)
        }
        scheduleRefresh() // Schedule next refresh
      }, smartInterval)
    }

    scheduleRefresh()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, refreshScreenshots, incrementalUpdate])

  // Initialize cache on mount
  useEffect(() => {
    initializeCache()
  }, [initializeCache])

  // Handle visibility change with smart refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (cacheManager.shouldIncrementalUpdate()) {
          console.log('👁️ Tab became active, checking for incremental updates...')
          incrementalUpdate().catch(error => {
            console.warn('Visibility-triggered incremental update failed:', error)
          })
        } else if (cacheManager.shouldRefreshCache()) {
          console.log('👁️ Tab became active, performing full refresh...')
          refreshScreenshots()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshScreenshots, incrementalUpdate])

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
    forceRefresh,
    incrementalUpdate,
    lastUpdateInfo: {
      lastSync: cacheManager.getLastSync(),
      newItemsCount
    }
  }
}