'use client'

import { Bookmark, ExternalLink, Tag, Copy } from 'lucide-react'
import { BookmarkCard as BookmarkCardType } from '@/lib/api'

interface BookmarkCardProps {
  card: BookmarkCardType
}

export function BookmarkCard({ card }: BookmarkCardProps) {
  const handleVisitLink = () => {
    if (card.origin_url) {
      window.open(card.origin_url, '_blank', 'noopener,noreferrer')
    }
  }

  const copyBookmarkInfo = async () => {
    const bookmarkInfo = [
      `Title: ${card.title}`,
      card.origin_url ? `URL: ${card.origin_url}` : null,
      card.summary ? `Summary: ${card.summary}` : null,
      card.tags && card.tags.length > 0 ? `Tags: ${card.tags.join(', ')}` : null,
    ].filter(Boolean).join('\n')
    
    try {
      await navigator.clipboard.writeText(bookmarkInfo)
      console.log('书签信息已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <div className="bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Bookmark className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {card.title}
            </h4>
            <button
              onClick={copyBookmarkInfo}
              className="p-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-md transition-colors duration-200"
              title="复制书签信息"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          
          {card.summary && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-2 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700">
              {card.summary}
            </p>
          )}

          {card.tags && card.tags.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center mb-2">
                <Tag className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                <h5 className="text-sm font-medium text-gray-900 dark:text-white">标签</h5>
              </div>
              <div className="flex flex-wrap gap-1">
                {card.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {card.origin_url && (
              <button
                onClick={handleVisitLink}
                className="inline-flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                访问链接
              </button>
            )}
            
            <button
              onClick={copyBookmarkInfo}
              className="inline-flex items-center px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
            >
              <Copy className="w-4 h-4 mr-2" />
              复制信息
            </button>
          </div>

          {card.origin_url && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 break-all">
              <span className="font-mono">{card.origin_url}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}