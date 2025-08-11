'use client'

import { useEffect, useState, useCallback } from 'react'
import { api, Screenshot, formatDateSafe } from '@/lib/api'
import { ChevronLeft, ChevronRight, BookOpen, Tag, Calendar, Eye, Copy, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function AnkiCardViewer() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScreenshots = async () => {
    try {
      console.log('Fetching screenshots for Anki cards...')
      // 获取更多截图用于卡片展示
      const data = await api.screenshots.list()
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

  // 获取处理状态
  const processStatus = currentScreenshot?.process_status || 'processed'

  // 解析AI标签
  const aiTags: string[] = (() => {
    if (!currentScreenshot?.ai_tags) return []
    try {
      // 如果ai_tags已经是数组，直接返回
      if (Array.isArray(currentScreenshot.ai_tags)) {
        return currentScreenshot.ai_tags
      }
      // 如果是字符串，尝试解析JSON
      if (typeof currentScreenshot.ai_tags === 'string') {
        const parsed = JSON.parse(currentScreenshot.ai_tags)
        return Array.isArray(parsed) ? parsed : []
      }
      return []
    } catch {
      return []
    }
  })()

  // 复制到剪贴板的函数
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      console.log('已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto">
      {/* Card Counter */}
      <div className="text-center mb-4 flex-shrink-0">
        <p className="text-gray-600">
          Card {currentIndex + 1} of {screenshots.length}
        </p>
      </div>

      {/* Main Card - 使用剩余空间 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex-1 min-h-0">
        <div className="h-full flex flex-col lg:flex-row min-h-0">
          {/* Image Section */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 lg:p-8 min-h-0 rounded-t-xl lg:rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none">
            <div className="max-w-full max-h-full flex items-center justify-center">
              {currentScreenshot.image_url ? (
                <img
                  src={currentScreenshot.image_url}
                  alt={currentScreenshot.ai_title || 'Screenshot'}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-full h-full min-h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="w-full lg:w-96 bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 flex flex-col min-h-0 lg:max-h-full rounded-b-xl lg:rounded-b-xl lg:rounded-r-xl lg:rounded-bl-none">
            {/* 头部信息 */}
            <div className="flex-shrink-0 p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {currentScreenshot.ai_title || currentScreenshot.user_note || '未命名截图'}
              </h1>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateSafe(currentScreenshot.created_at, 'yyyy年MM月dd日')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{currentScreenshot.width} × {currentScreenshot.height}</span>
                </div>
              </div>
            </div>

            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 min-h-0" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e0 #f7fafc'
            }}>
              {/* 根据处理状态显示不同内容 */}
              {processStatus === 'pending' && (
                <div className="mb-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI 分析处理中</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">正在对您的截图进行智能分析，请稍候...</p>
                  </div>
                </div>
              )}

              {processStatus === 'error' && (
                <div className="mb-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.676-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI 分析失败</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">很抱歉，AI 分析过程中出现了错误</p>
                  </div>
                </div>
              )}

              {/* 只有在 processed 状态下才显示 AI 分析内容 */}
              {processStatus === 'processed' && (
                <>
                  {/* 原文直达按钮 */}
                  {currentScreenshot.quick_link && currentScreenshot.quick_link.type === 'direct' && (
                    <div className="mb-6 text-center">
                      <button
                        onClick={() => window.open(currentScreenshot.quick_link?.content, '_blank')}
                        className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 font-medium"
                      >
                        <ExternalLink className="w-5 h-5 mr-2" />
                        原文直达
                      </button>
                    </div>
                  )}

                  {/* AI描述 */}
                  {currentScreenshot.ai_description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        AI 描述
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                        {currentScreenshot.ai_description}
                      </p>
                    </div>
                  )}

                  {/* AI标签 */}
                  {aiTags.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Tag className="w-5 h-5 mr-2 text-purple-500" />
                        智能标签
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {aiTags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 搜索关键词 */}
                  {currentScreenshot.quick_link && currentScreenshot.quick_link.type === 'search_str' && (
                    <div className="mb-6">
                      <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">搜索关键词：</div>
                          <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-600">
                            <span className="text-gray-900 dark:text-white font-mono text-sm flex-1 mr-3">
                              {currentScreenshot.quick_link.content}
                            </span>
                            <button
                              onClick={() => copyToClipboard(currentScreenshot.quick_link?.content || '')}
                              className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                              title="复制到剪贴板"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Markdown内容 */}
                  {currentScreenshot.markdown_content && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                        详细分析
                      </h3>
                      <div className="prose prose-sm max-w-none bg-green-50 dark:bg-green-900 p-4 rounded-lg overflow-hidden">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // 自定义组件样式
                            h1: ({children}) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">{children}</h1>,
                            h2: ({children}) => <h2 className="text-lg font-semibold mt-3 mb-2 text-gray-900 dark:text-white">{children}</h2>,
                            h3: ({children}) => <h3 className="text-base font-medium mt-2 mb-1 text-gray-900 dark:text-white">{children}</h3>,
                            p: ({children}) => <p className="mb-2 leading-relaxed text-gray-700 dark:text-gray-300">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="text-gray-700 dark:text-gray-300">{children}</li>,
                            code: ({children}) => <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-900 dark:text-gray-100">{children}</code>,
                            pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-sm text-gray-900 dark:text-gray-100">{children}</pre>,
                            blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 mb-2">{children}</blockquote>,
                            strong: ({children}) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                            em: ({children}) => <em className="italic text-gray-700 dark:text-gray-300">{children}</em>,
                          }}
                        >
                          {currentScreenshot.markdown_content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* 用户备注 - 所有状态都显示 */}
              {currentScreenshot.user_note && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                    用户备注
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                    {currentScreenshot.user_note}
                  </p>
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