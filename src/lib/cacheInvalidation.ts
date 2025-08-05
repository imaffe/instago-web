import { cacheManager } from './cache'

interface CacheInvalidationOptions {
  invalidateScreenshots?: boolean
  invalidateThumbnails?: boolean
  invalidateSearchResults?: boolean
  invalidateExpired?: boolean
}

class CacheInvalidationManager {
  /**
   * Invalidate cache based on specific criteria
   */
  static invalidateCache(options: CacheInvalidationOptions = {}): void {
    const {
      invalidateScreenshots = false,
      invalidateThumbnails = false,
      invalidateSearchResults = false,
      invalidateExpired = true
    } = options

    console.log('🧹 Starting cache invalidation...', options)

    if (invalidateExpired) {
      cacheManager.clearExpiredEntries()
      console.log('✅ Cleared expired cache entries')
    }

    if (invalidateScreenshots) {
      const stats = cacheManager.getCacheStats()
      cacheManager['removeCache']('instago_screenshots')
      cacheManager['removeCache']('instago_last_fetch')
      console.log(`✅ Invalidated ${stats.screenshots} cached screenshots`)
    }

    if (invalidateThumbnails) {
      const stats = cacheManager.getCacheStats()
      cacheManager['removeCache']('instago_thumbnails')
      console.log(`✅ Invalidated ${stats.thumbnails} cached thumbnails`)
    }

    if (invalidateSearchResults) {
      const stats = cacheManager.getCacheStats()
      cacheManager.clearSearchResults()
      console.log(`✅ Invalidated ${stats.searchResults} cached search results`)
    }

    console.log('🧹 Cache invalidation completed')
  }

  /**
   * Invalidate cache when data changes
   */
  static invalidateOnDataChange(changeType: 'screenshot_added' | 'screenshot_updated' | 'screenshot_deleted'): void {
    console.log(`🔄 Invalidating cache due to: ${changeType}`)

    switch (changeType) {
      case 'screenshot_added':
        // Don't invalidate main cache, just add the new item
        cacheManager.clearSearchResults()
        break
        
      case 'screenshot_updated':
        // Invalidate search results as they might contain stale data
        cacheManager.clearSearchResults()
        break
        
      case 'screenshot_deleted':
        // Search results will be invalidated automatically when screenshot is removed
        break
    }
  }

  /**
   * Smart invalidation based on time since last fetch
   */
  static smartInvalidation(): void {
    const lastFetch = cacheManager.getLastFetch()
    const now = Date.now()
    
    if (!lastFetch) {
      console.log('🤖 No last fetch time found, skipping smart invalidation')
      return
    }

    const timeSinceLastFetch = now - lastFetch
    const hoursSinceLastFetch = timeSinceLastFetch / (1000 * 60 * 60)

    console.log(`🤖 Smart invalidation: ${hoursSinceLastFetch.toFixed(1)} hours since last fetch`)

    if (hoursSinceLastFetch > 24) {
      // More than 24 hours - invalidate everything
      this.invalidateCache({
        invalidateScreenshots: true,
        invalidateThumbnails: true,
        invalidateSearchResults: true,
        invalidateExpired: true
      })
      console.log('🤖 Full invalidation (> 24 hours)')
    } else if (hoursSinceLastFetch > 6) {
      // More than 6 hours - invalidate search results and screenshots
      this.invalidateCache({
        invalidateScreenshots: true,
        invalidateSearchResults: true,
        invalidateExpired: true
      })
      console.log('🤖 Partial invalidation (> 6 hours)')
    } else if (hoursSinceLastFetch > 1) {
      // More than 1 hour - just clear expired and search results
      this.invalidateCache({
        invalidateSearchResults: true,
        invalidateExpired: true
      })
      console.log('🤖 Light invalidation (> 1 hour)')
    } else {
      // Less than 1 hour - just clear expired
      this.invalidateCache({
        invalidateExpired: true
      })
      console.log('🤖 Minimal invalidation (< 1 hour)')
    }
  }

  /**
   * Get invalidation recommendations
   */
  static getInvalidationRecommendations(): {
    recommendations: string[]
    actions: Array<{ label: string; action: () => void }>
  } {
    const stats = cacheManager.getCacheStats()
    const lastFetch = cacheManager.getLastFetch()
    const recommendations: string[] = []
    const actions: Array<{ label: string; action: () => void }> = []

    if (!lastFetch) {
      recommendations.push('No cache history found')
      return { recommendations, actions }
    }

    const timeSinceLastFetch = Date.now() - lastFetch
    const hoursSinceLastFetch = timeSinceLastFetch / (1000 * 60 * 60)

    if (hoursSinceLastFetch > 24) {
      recommendations.push('Cache is very old (>24h), consider full refresh')
      actions.push({
        label: 'Full Refresh',
        action: () => this.invalidateCache({
          invalidateScreenshots: true,
          invalidateThumbnails: true,
          invalidateSearchResults: true,
          invalidateExpired: true
        })
      })
    } else if (hoursSinceLastFetch > 6) {
      recommendations.push('Cache is old (>6h), consider partial refresh')
      actions.push({
        label: 'Partial Refresh',
        action: () => this.invalidateCache({
          invalidateScreenshots: true,
          invalidateSearchResults: true,
          invalidateExpired: true
        })
      })
    }

    if (stats.searchResults > 10) {
      recommendations.push('Many search results cached, consider clearing')
      actions.push({
        label: 'Clear Search Cache',
        action: () => this.invalidateCache({ invalidateSearchResults: true })
      })
    }

    if (parseFloat(stats.totalSize.replace(/[^\d.]/g, '')) > 50) {
      recommendations.push('Large cache size, consider clearing thumbnails')
      actions.push({
        label: 'Clear Thumbnails',
        action: () => this.invalidateCache({ invalidateThumbnails: true })
      })
    }

    return { recommendations, actions }
  }
}

// Export for use in other modules
export const cacheInvalidation = CacheInvalidationManager

// Add to window for dev mode console access
if (typeof window !== 'undefined') {
  ;(window as typeof window & { cacheInvalidation: typeof CacheInvalidationManager }).cacheInvalidation = CacheInvalidationManager
}