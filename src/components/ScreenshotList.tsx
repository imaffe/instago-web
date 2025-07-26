'use client'

import { useEffect, useState } from 'react'
import { api, Screenshot } from '@/lib/api'
import { format } from 'date-fns'
import { Trash2, Edit, Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'

export function ScreenshotList() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScreenshots = async () => {
    try {
      console.log('Fetching screenshots...')
      const data = await api.screenshots.list()
      console.log('Screenshots fetched:', data)
      setScreenshots(data)
    } catch (err: any) {
      console.error('Error fetching screenshots:', err)
      setError(err.message || 'Failed to fetch screenshots')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScreenshots()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this screenshot?')) return

    try {
      await api.screenshots.delete(id)
      setScreenshots(screenshots.filter(s => s.id !== id))
    } catch (err: any) {
      alert(err.message || 'Failed to delete screenshot')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading screenshots...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>
  }

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No screenshots yet</p>
        <Link
          href="/upload"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Upload your first screenshot
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {screenshots.map((screenshot) => (
        <div key={screenshot.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          {screenshot.image_url && (
            <img
              src={screenshot.image_url}
              alt={screenshot.ai_title || 'Screenshot'}
              className="w-full h-48 object-cover"
            />
          )}
          
          <div className="p-4">
            {screenshot.process_status === 'pending' ? (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 font-medium">Image being processed</p>
                <p className="text-xs text-gray-400 mt-1">Please check back later</p>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-lg mb-2">
                  {screenshot.ai_title || screenshot.user_note || 'Untitled'}
                </h3>
                
                {screenshot.quick_link && (
                  <p className="text-gray-600 text-sm mb-2">
                    {screenshot.quick_link.content}
                  </p>
                )}
                
                <p className="text-xs text-gray-500 mb-4">
                  {format(new Date(screenshot.created_at), 'PPp')}
                </p>
              </>
            )}
            
            <div className="flex justify-between items-center">
              <Link
                href={`/screenshot/${screenshot.id}`}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
              >
                <Eye size={16} />
                <span className="text-sm">View</span>
              </Link>
              
              <button
                onClick={() => handleDelete(screenshot.id)}
                className="flex items-center space-x-1 text-red-600 hover:text-red-800"
              >
                <Trash2 size={16} />
                <span className="text-sm">Delete</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}