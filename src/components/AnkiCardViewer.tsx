'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, Screenshot } from '@/lib/api'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import Link from 'next/link'

export function AnkiCardViewer() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScreenshots = async () => {
    try {
      console.log('Fetching screenshots for Anki cards...')
      // 获取更多截图用于卡片展示
      const data = await api.screenshots.list(0, 100)
      // 只显示有 AI 输出内容的截图
      const screenshotsWithAI = data.filter(s => 
        s.ai_title || s.ai_description || s.markdown_content
      )
      console.log('Screenshots with AI content:', screenshotsWithAI)
      setScreenshots(screenshotsWithAI)
    } catch (err: unknown) {
      console.error('Error fetching screenshots:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch screenshots'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScreenshots()
  }, [])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => 
      prev === 0 ? screenshots.length - 1 : prev - 1
    )
  }, [screenshots.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => 
      prev === screenshots.length - 1 ? 0 : prev + 1
    )
  }, [screenshots.length])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      goToPrevious()
    } else if (event.key === 'ArrowRight') {
      goToNext()
    }
  }, [goToPrevious, goToNext])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  if (loading) {
    return (
      <div className="h-full flex justify-center items-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Loading Anki cards...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchScreenshots}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (screenshots.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4 text-lg">No Anki cards available</p>
          <p className="text-gray-400 mb-6">
            Upload some screenshots with AI analysis to create your first Anki cards
          </p>
          <Link
            href="/upload"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Upload Screenshots
          </Link>
        </div>
      </div>
    )
  }

  const currentScreenshot = screenshots[currentIndex]

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto">
      {/* Card Counter */}
      <div className="text-center mb-4 flex-shrink-0">
        <p className="text-gray-600">
          Card {currentIndex + 1} of {screenshots.length}
        </p>
      </div>

      {/* Main Card - 使用剩余空间 */}
      <div className="relative bg-white rounded-xl shadow-lg overflow-hidden flex-1 min-h-0">
        <div className="grid md:grid-cols-2 h-full">
          {/* Image Section */}
          <div className="relative bg-gray-100 flex items-center justify-center p-4 min-h-0">
            {currentScreenshot.image_url ? (
              <img
                src={currentScreenshot.image_url}
                alt={currentScreenshot.ai_title || 'Screenshot'}
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
              />
            ) : (
              <div className="w-full h-full min-h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No image available</p>
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-6 flex flex-col min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1">
              {currentScreenshot.ai_title && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Title
                  </h3>
                  <p className="text-gray-700">
                    {currentScreenshot.ai_title}
                  </p>
                </div>
              )}

              {currentScreenshot.ai_description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {currentScreenshot.ai_description}
                  </p>
                </div>
              )}

              {currentScreenshot.markdown_content && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    AI Analysis
                  </h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                    {currentScreenshot.markdown_content}
                  </div>
                </div>
              )}

              {currentScreenshot.ai_tags && currentScreenshot.ai_tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {currentScreenshot.ai_tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {screenshots.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
              title="Previous card (←)"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
              title="Next card (→)"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* 底部控制区域 */}
      <div className="flex-shrink-0 mt-4 space-y-3">
        {/* Navigation Hints */}
        {screenshots.length > 1 && (
          <div className="text-center text-gray-500 text-sm">
            Use arrow keys ← → or click the buttons to navigate
          </div>
        )}

        {/* Card Indicator Dots */}
        {screenshots.length > 1 && screenshots.length <= 10 && (
          <div className="flex justify-center space-x-2">
            {screenshots.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentIndex
                    ? 'bg-blue-600'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                title={`Go to card ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex justify-center space-x-4">
          <Link
            href={`/screenshot/${currentScreenshot.id}`}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            View Details
          </Link>
          <button
            onClick={fetchScreenshots}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Cards
          </button>
        </div>
      </div>
    </div>
  )
} 