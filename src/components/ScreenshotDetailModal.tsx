'use client'

import { useEffect, useState, useRef } from 'react'
import { X, Calendar, Eye, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { Screenshot } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ScreenshotDetailModalProps {
  screenshot: Screenshot | null
  isOpen: boolean
  onClose: () => void
  cardPosition?: { x: number; y: number; width: number; height: number }
}

export function ScreenshotDetailModal({ 
  screenshot, 
  isOpen, 
  onClose, 
  cardPosition 
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
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleClose = () => {
    setShowContent(false)
    setIsAnimating(false)
    setTimeout(onClose, 200) // 等待动画完成
  }

  if (!isOpen || !screenshot) return null

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
        className={`absolute bg-white rounded-xl shadow-2xl transition-all duration-300 ease-out ${
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
          className={`absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-all duration-200 ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* 内容区域 */}
        <div className="h-full overflow-auto lg:overflow-hidden">
          {showContent ? (
            <div className="h-full flex flex-col lg:flex-row min-h-0">
              {/* 图片区域 */}
              <div className="flex-1 bg-gray-50 flex items-center justify-center p-4 lg:p-8 min-h-0">
                <div className="max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={screenshot.image_url}
                    alt={screenshot.ai_title || '截图'}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-500"
                  />
                </div>
              </div>

              {/* 信息面板 */}
              <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col animate-in slide-in-from-bottom lg:slide-in-from-right duration-500 min-h-0 lg:max-h-full">
                {/* 头部信息 */}
                <div className="flex-shrink-0 p-4 lg:p-6 border-b border-gray-200">
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {screenshot.ai_title || screenshot.user_note || '未命名截图'}
                  </h1>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-500 mb-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(screenshot.created_at), 'yyyy年MM月dd日')}</span>
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
                  {/* AI描述 */}
                  {screenshot.ai_description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        AI 描述
                      </h3>
                      <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg">
                        {screenshot.ai_description}
                      </p>
                    </div>
                  )}

                  {/* AI标签 */}
                  {aiTags.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Tag className="w-5 h-5 mr-2 text-purple-500" />
                        智能标签
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {aiTags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Markdown内容 */}
                  {screenshot.markdown_content && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                        详细分析
                      </h3>
                      <div className="prose prose-sm max-w-none bg-green-50 p-4 rounded-lg overflow-hidden">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // 自定义组件样式
                            h1: ({children}) => <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>,
                            h2: ({children}) => <h2 className="text-lg font-semibold mt-3 mb-2 text-gray-900">{children}</h2>,
                            h3: ({children}) => <h3 className="text-base font-medium mt-2 mb-1 text-gray-900">{children}</h3>,
                            p: ({children}) => <p className="mb-2 leading-relaxed">{children}</p>,
                            ul: ({children}) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="text-gray-700">{children}</li>,
                            code: ({children}) => <code className="bg-gray-200 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                            pre: ({children}) => <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-sm">{children}</pre>,
                            blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">{children}</blockquote>,
                            strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            em: ({children}) => <em className="italic">{children}</em>,
                          }}
                        >
                          {screenshot.markdown_content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* 用户备注 */}
                  {screenshot.user_note && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
                        用户备注
                      </h3>
                      <p className="text-gray-700 bg-yellow-50 p-4 rounded-lg">
                        {screenshot.user_note}
                      </p>
                    </div>
                  )}

                  {/* 技术信息 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <span className="w-2 h-2 bg-gray-500 rounded-full mr-3"></span>
                      技术信息
                    </h3>
                    <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-gray-500">尺寸：</span>
                        <span className="text-gray-900">{screenshot.width} × {screenshot.height}</span>
                      </div>
                      {screenshot.file_size && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">文件大小：</span>
                          <span className="text-gray-900">
                            {(screenshot.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">创建时间：</span>
                        <span className="text-gray-900">
                          {format(new Date(screenshot.created_at), 'yyyy-MM-dd HH:mm:ss')}
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