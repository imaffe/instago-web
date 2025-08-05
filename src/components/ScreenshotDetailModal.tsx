'use client'

import { useEffect, useState, useRef } from 'react'
import { X, Calendar, Eye, Tag, Copy, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { Screenshot, formatDateSafe } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ScreenshotDetailModalProps {
  screenshot: Screenshot | null
  isOpen: boolean
  onClose: () => void
  cardPosition?: { x: number; y: number; width: number; height: number }
  screenshots?: Screenshot[]
  currentIndex?: number
  onNavigate?: (index: number) => void
}

export function ScreenshotDetailModal({ 
  screenshot, 
  isOpen, 
  onClose, 
  cardPosition,
  screenshots = [],
  currentIndex = 0,
  onNavigate
}: ScreenshotDetailModalProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && screenshot) {
      setIsAnimating(true)
      // 延迟显示内容，让展开动画先完成
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
      setIsAnimating(false)
    }
  }, [isOpen, screenshot])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (!isOpen || !onNavigate || screenshots.length <= 1) return
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : screenshots.length - 1
        onNavigate(prevIndex)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIndex = currentIndex < screenshots.length - 1 ? currentIndex + 1 : 0
        onNavigate(nextIndex)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('keydown', handleArrowKeys)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleArrowKeys)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, onNavigate, currentIndex, screenshots.length])

  const handleClose = () => {
    setShowContent(false)
    setIsAnimating(false)
    setTimeout(onClose, 200) // 等待动画完成
  }

  const handlePrevious = () => {
    if (!onNavigate || screenshots.length <= 1) return
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : screenshots.length - 1
    onNavigate(prevIndex)
  }

  const handleNext = () => {
    if (!onNavigate || screenshots.length <= 1) return
    const nextIndex = currentIndex < screenshots.length - 1 ? currentIndex + 1 : 0
    onNavigate(nextIndex)
  }

  if (!isOpen || !screenshot) return null

  // 检查是否有多张截图以显示导航按钮
  const hasMultipleScreenshots = screenshots.length > 1 && onNavigate

  // 获取处理状态
  const processStatus = screenshot.process_status || 'processed'

  // 解析AI标签
  const aiTags: string[] = (() => {
    try {
      // 如果ai_tags已经是数组，直接返回
      if (Array.isArray(screenshot.ai_tags)) {
        return screenshot.ai_tags
      }
      // 如果是字符串，尝试解析JSON
      if (typeof screenshot.ai_tags === 'string') {
        const parsed = JSON.parse(screenshot.ai_tags)
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
      // 这里可以添加一个成功提示
      console.log('已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'opacity-60' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* 主模态框 */}
      <div
        ref={modalRef}
        className={`absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl transition-all duration-300 ease-out ${
          isAnimating 
            ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-100 scale-100' 
            : cardPosition 
              ? `opacity-0 scale-95`
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 scale-95'
        }`}
        style={
          isAnimating || !cardPosition
            ? {
                width: '90vw',
                maxWidth: '1000px',
                height: '85vh',
                maxHeight: '700px',
                minWidth: '320px',
                minHeight: '400px',
              }
            : {
                left: cardPosition.x,
                top: cardPosition.y,
                width: cardPosition.width,
                height: cardPosition.height,
                transform: 'scale(0.95)',
              }
        }
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all duration-200 ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>

        {/* 左箭头按钮 */}
        {hasMultipleScreenshots && (
          <button
            onClick={handlePrevious}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white dark:bg-gray-700 bg-opacity-90 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${
              showContent ? 'opacity-100' : 'opacity-0'
            }`}
            title={`上一张 (${currentIndex + 1}/${screenshots.length})`}
          >
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        )}

        {/* 右箭头按钮 */}
        {hasMultipleScreenshots && (
          <button
            onClick={handleNext}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white dark:bg-gray-700 bg-opacity-90 dark:bg-opacity-90 hover:bg-opacity-100 dark:hover:bg-opacity-100 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${
              showContent ? 'opacity-100' : 'opacity-0'
            }`}
            title={`下一张 (${currentIndex + 1}/${screenshots.length})`}
          >
            <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        )}

        {/* 内容区域 */}
        <div className="h-full overflow-auto lg:overflow-hidden rounded-xl">
          {showContent ? (
            <div className="h-full flex flex-col lg:flex-row min-h-0">
              {/* 图片区域 */}
              <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 lg:p-8 min-h-0 rounded-t-xl lg:rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none">
                <div className="max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={screenshot.image_url}
                    alt={screenshot.ai_title || '截图'}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-500"
                  />
                </div>
              </div>

              {/* 信息面板 */}
              <div className="w-full lg:w-96 bg-white dark:bg-gray-800 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 flex flex-col animate-in slide-in-from-bottom lg:slide-in-from-right duration-500 min-h-0 lg:max-h-full rounded-b-xl lg:rounded-b-xl lg:rounded-r-xl lg:rounded-bl-none">
                {/* 头部信息 */}
                <div className="flex-shrink-0 p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {screenshot.ai_title || screenshot.user_note || '未命名截图'}
                  </h1>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDateSafe(screenshot.created_at, 'yyyy年MM月dd日')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{screenshot.width} × {screenshot.height}</span>
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
                        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            • 识别图片内容<br/>
                            • 生成智能标签<br/>
                            • 提取关键信息<br/>
                            • 创建详细分析
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {processStatus === 'error' && (
                    <div className="mb-6">
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.676-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI 分析失败</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">很抱歉，AI 分析过程中出现了错误</p>
                        <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
                          <p className="text-sm text-red-700 dark:text-red-300">
                            可能的原因：<br/>
                            • 图片格式不支持<br/>
                            • 图片内容无法识别<br/>
                            • 服务暂时不可用<br/>
                            您仍可以查看原始截图和技术信息
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 只有在 processed 状态下才显示 AI 分析内容 */}
                  {processStatus === 'processed' && (
                    <>
                      {/* 原文直达按钮 - 放在顶部居中 */}
                      {screenshot.quick_link && screenshot.quick_link.type === 'direct' && (
                        <div className="mb-6 text-center">
                          <button
                            onClick={() => window.open(screenshot.quick_link?.content, '_blank')}
                            className="inline-flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 font-medium"
                          >
                            <ExternalLink className="w-5 h-5 mr-2" />
                            原文直达
                          </button>
                        </div>
                      )}

                      {/* AI描述 */}
                      {screenshot.ai_description && (
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                            AI 描述
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                            {screenshot.ai_description}
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
                      {screenshot.quick_link && screenshot.quick_link.type === 'search_str' && (
                        <div className="mb-6">
                          <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                            <div className="space-y-3">
                              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">搜索关键词：</div>
                              <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-600">
                                <span className="text-gray-900 dark:text-white font-mono text-sm flex-1 mr-3">
                                  {screenshot.quick_link.content}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(screenshot.quick_link?.content || '')}
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
                      {screenshot.markdown_content && (
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
                              {screenshot.markdown_content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* 用户备注 - 所有状态都显示 */}
                  {screenshot.user_note && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                        用户备注
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
                        {screenshot.user_note}
                      </p>
                    </div>
                  )}

                  {/* 技术信息 - 所有状态都显示 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
                      技术信息
                    </h3>
                    <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">处理状态：</span>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          processStatus === 'processed' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                          processStatus === 'pending' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300' :
                          'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                        }`}>
                          {processStatus === 'processed' ? '已处理' :
                           processStatus === 'pending' ? '处理中' : '处理失败'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">尺寸：</span>
                        <span className="text-gray-900 dark:text-white">{screenshot.width} × {screenshot.height}</span>
                      </div>
                      {screenshot.file_size && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">文件大小：</span>
                          <span className="text-gray-900 dark:text-white">
                            {(screenshot.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">创建时间：</span>
                        <span className="text-gray-900 dark:text-white">
                          {formatDateSafe(screenshot.created_at, 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // 加载状态
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 