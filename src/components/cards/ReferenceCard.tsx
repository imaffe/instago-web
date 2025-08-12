'use client'

import { ExternalLink, BookOpen, Link } from 'lucide-react'
import { ReferenceCard as ReferenceCardType } from '@/lib/api'

interface ReferenceCardProps {
  card: ReferenceCardType
}

export function ReferenceCard({ card }: ReferenceCardProps) {
  const handleLinkClick = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <BookOpen className="w-6 h-6 text-orange-600 dark:text-orange-400 mt-1" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {card.reference_entry_name}
            </h4>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200">
              {card.reference_type}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {card.quick_note}
          </p>

          {/* Most Valuable Info Link */}
          {card.most_valuable_info_link && (
            <div className="mb-3">
              <button
                onClick={() => handleLinkClick(card.most_valuable_info_link)}
                className="inline-flex items-center px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {card.most_valuable_info_link_title || '查看主要资源'}
              </button>
            </div>
          )}

          {/* Actionable Links */}
          {card.actionable_links && card.actionable_links.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                <Link className="w-4 h-4 mr-1" />
                相关链接
              </h5>
              <div className="space-y-2">
                {card.actionable_links.map((link, index) => (
                  <button
                    key={index}
                    onClick={() => handleLinkClick(link.url)}
                    className="flex items-center w-full p-2 text-sm text-left bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded hover:bg-orange-100 dark:hover:bg-orange-800 transition-colors duration-200"
                  >
                    <ExternalLink className="w-3 h-3 mr-2 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white truncate">
                      {link.title || link.url}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}