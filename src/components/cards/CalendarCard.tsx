'use client'

import { Calendar, Clock, MapPin, Video, Plus } from 'lucide-react'
import { CalendarCard as CalendarCardType } from '@/lib/api'

interface CalendarCardProps {
  card: CalendarCardType
}

export function CalendarCard({ card }: CalendarCardProps) {
  const handleAddToCalendar = () => {
    // Create Google Calendar URL
    const startDateTime = `${card.date.replace(/-/g, '')}T${card.start_time.replace(':', '')}00`
    const endDateTime = card.end_time 
      ? `${card.date.replace(/-/g, '')}T${card.end_time.replace(':', '')}00`
      : `${card.date.replace(/-/g, '')}T${(parseInt(card.start_time.split(':')[0]) + 1).toString().padStart(2, '0')}${card.start_time.split(':')[1]}00`
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: card.title,
      dates: `${startDateTime}/${endDateTime}`,
      details: card.description || '',
      location: card.location || '',
    })
    
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank')
  }

  const handleJoinMeeting = () => {
    if (card.meeting_link) {
      window.open(card.meeting_link, '_blank', 'noopener,noreferrer')
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour24 = parseInt(hours, 10)
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
    const period = hour24 >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes} ${period}`
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00')
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {card.title}
          </h4>
          
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Calendar className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              <span>{formatDate(card.date)}</span>
            </div>
            
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              <span>
                {formatTime(card.start_time)}
                {card.end_time && ` - ${formatTime(card.end_time)}`}
              </span>
            </div>
            
            {card.location && (
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <MapPin className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                <span>{card.location}</span>
              </div>
            )}
          </div>

          {card.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 p-2 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
              {card.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAddToCalendar}
              className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加到日历
            </button>
            
            {card.meeting_link && (
              <button
                onClick={handleJoinMeeting}
                className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
              >
                <Video className="w-4 h-4 mr-2" />
                加入会议
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}