'use client'

import { User, Building, Briefcase, MessageCircle, CheckSquare, Copy } from 'lucide-react'
import { ContactCard as ContactCardType } from '@/lib/api'

interface ContactCardProps {
  card: ContactCardType
}

export function ContactCard({ card }: ContactCardProps) {
  const copyContactInfo = async () => {
    const contactInfo = [
      `Name: ${card.name}`,
      card.title ? `Title: ${card.title}` : null,
      card.company ? `Company: ${card.company}` : null,
      card.industry ? `Industry: ${card.industry}` : null,
      card.context ? `Context: ${card.context}` : null,
      card.todo ? `Todo: ${card.todo}` : null,
    ].filter(Boolean).join('\n')
    
    try {
      await navigator.clipboard.writeText(contactInfo)
      // Could add a toast notification here
      console.log('联系人信息已复制到剪贴板')
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <User className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {card.name}
            </h4>
            <button
              onClick={copyContactInfo}
              className="p-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-800 rounded-md transition-colors duration-200"
              title="复制联系人信息"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2 mb-3">
            {card.title && (
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <Briefcase className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                <span>{card.title}</span>
              </div>
            )}
            
            {card.company && (
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <Building className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                <span>{card.company}</span>
                {card.industry && (
                  <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full">
                    {card.industry}
                  </span>
                )}
              </div>
            )}
            
            {!card.company && card.industry && (
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <Building className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                <span className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded-full">
                  {card.industry}
                </span>
              </div>
            )}
          </div>

          {card.context && (
            <div className="mb-3">
              <div className="flex items-start space-x-2">
                <MessageCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">联系背景</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
                    {card.context}
                  </p>
                </div>
              </div>
            </div>
          )}

          {card.todo && (
            <div className="mb-3">
              <div className="flex items-start space-x-2">
                <CheckSquare className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">后续行动</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded">
                    {card.todo}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={copyContactInfo}
              className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
            >
              <Copy className="w-4 h-4 mr-2" />
              复制联系信息
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}