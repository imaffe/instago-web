import { cacheManager } from './cache'

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'jpeg' | 'webp'
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
  width: 300,
  height: 200,
  quality: 0.8,
  format: 'jpeg'
}

class ThumbnailGenerator {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private loadingImages = new Map<string, Promise<string>>()

  constructor() {
    // Only create canvas in browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas')
      const ctx = this.canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas 2D context')
      }
      this.ctx = ctx
    }
  }

  private ensureCanvas(): boolean {
    if (!this.canvas || !this.ctx) {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        this.canvas = document.createElement('canvas')
        const ctx = this.canvas.getContext('2d')
        if (!ctx) {
          return false
        }
        this.ctx = ctx
        return true
      }
      return false
    }
    return true
  }

  /**
   * Generate thumbnail from image URL
   */
  async generateThumbnail(
    imageUrl: string, 
    screenshotId: string,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    // Return original URL if not in browser environment
    if (!this.ensureCanvas()) {
      return imageUrl
    }

    // Check if thumbnail already exists in cache
    const cached = cacheManager.getThumbnail(screenshotId)
    if (cached) {
      return cached
    }

    // Check if already generating this thumbnail
    if (this.loadingImages.has(screenshotId)) {
      return this.loadingImages.get(screenshotId)!
    }

    // Start generating thumbnail
    const promise = this.createThumbnail(imageUrl, screenshotId, options)
    this.loadingImages.set(screenshotId, promise)

    try {
      const thumbnail = await promise
      this.loadingImages.delete(screenshotId)
      return thumbnail
    } catch (error) {
      this.loadingImages.delete(screenshotId)
      throw error
    }
  }

  private async createThumbnail(
    imageUrl: string,
    screenshotId: string,
    options: ThumbnailOptions
  ): Promise<string> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available')
    }
    
    const opts = { ...DEFAULT_OPTIONS, ...options }

    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          if (!this.canvas || !this.ctx) {
            reject(new Error('Canvas not available'))
            return
          }

          // Calculate dimensions maintaining aspect ratio
          const { width: targetWidth, height: targetHeight } = this.calculateDimensions(
            img.width,
            img.height,
            opts.width,
            opts.height
          )

          // Set canvas size
          this.canvas.width = targetWidth
          this.canvas.height = targetHeight

          // Clear canvas
          this.ctx.clearRect(0, 0, targetWidth, targetHeight)

          // Set background color for transparency
          this.ctx.fillStyle = '#ffffff'
          this.ctx.fillRect(0, 0, targetWidth, targetHeight)

          // Draw image
          this.ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

          // Convert to data URL
          const mimeType = opts.format === 'webp' ? 'image/webp' : 'image/jpeg'
          const dataUrl = this.canvas.toDataURL(mimeType, opts.quality)

          // Cache the thumbnail
          cacheManager.setThumbnail(screenshotId, dataUrl)

          resolve(dataUrl)
        } catch (error) {
          reject(new Error(`Failed to generate thumbnail: ${error}`))
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image for thumbnail generation'))
      }

      // Handle CORS
      img.crossOrigin = 'anonymous'
      img.src = imageUrl
    })
  }

  /**
   * Calculate thumbnail dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight

    let width = maxWidth
    let height = maxHeight

    if (originalWidth > originalHeight) {
      // Landscape
      height = width / aspectRatio
      if (height > maxHeight) {
        height = maxHeight
        width = height * aspectRatio
      }
    } else {
      // Portrait or square
      width = height * aspectRatio
      if (width > maxWidth) {
        width = maxWidth
        height = width / aspectRatio
      }
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  /**
   * Batch generate thumbnails
   */
  async generateBatchThumbnails(
    items: Array<{ imageUrl: string; screenshotId: string }>,
    options: ThumbnailOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    const total = items.length
    let completed = 0

    // Process in batches to avoid overwhelming the browser
    const batchSize = 5
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      
      const promises = batch.map(async (item) => {
        try {
          const thumbnail = await this.generateThumbnail(
            item.imageUrl,
            item.screenshotId,
            options
          )
          results.set(item.screenshotId, thumbnail)
          completed++
          onProgress?.(completed, total)
        } catch (error) {
          console.warn(`Failed to generate thumbnail for ${item.screenshotId}:`, error)
          completed++
          onProgress?.(completed, total)
        }
      })

      await Promise.all(promises)
    }

    return results
  }

  /**
   * Get cached thumbnail or generate if not exists
   */
  getThumbnailSync(screenshotId: string): string | null {
    return cacheManager.getThumbnail(screenshotId)
  }

  /**
   * Preload thumbnails for better performance
   */
  async preloadThumbnails(
    items: Array<{ imageUrl: string; screenshotId: string }>,
    options: ThumbnailOptions = {}
  ): Promise<void> {
    // Only generate thumbnails that don't exist in cache
    const toGenerate = items.filter(item => 
      !cacheManager.getThumbnail(item.screenshotId)
    )

    if (toGenerate.length === 0) return

    console.log(`Preloading ${toGenerate.length} thumbnails...`)
    
    await this.generateBatchThumbnails(toGenerate, options, (completed, total) => {
      console.log(`Thumbnail progress: ${completed}/${total}`)
    })

    console.log('Thumbnail preloading completed')
  }

  /**
   * Clear all cached thumbnails
   */
  clearThumbnailCache(): void {
    // This would require adding a method to cacheManager
    console.log('Clearing thumbnail cache...')
  }
}

// Export singleton instance
export const thumbnailGenerator = new ThumbnailGenerator()

// Utility functions
export const generateThumbnail = (
  imageUrl: string,
  screenshotId: string,
  options?: ThumbnailOptions
) => thumbnailGenerator.generateThumbnail(imageUrl, screenshotId, options)

export const getThumbnail = (screenshotId: string) => 
  thumbnailGenerator.getThumbnailSync(screenshotId)

export const preloadThumbnails = (
  items: Array<{ imageUrl: string; screenshotId: string }>,
  options?: ThumbnailOptions
) => thumbnailGenerator.preloadThumbnails(items, options)