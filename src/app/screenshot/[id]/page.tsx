'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from '@/components/Navbar'
import { api, Screenshot, formatDateSafe } from '@/lib/api'
import { format } from 'date-fns'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'
import Link from 'next/link'

export default function ScreenshotDetailPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [screenshot, setScreenshot] = useState<Screenshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ user_note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    const fetchScreenshot = async () => {
      try {
        const screenshots = await api.screenshots.list()
        const found = screenshots.find(s => s.id === id)
        if (found) {
          setScreenshot(found)
          setEditData({ user_note: found.user_note || '' })
        } else {
          setError('Screenshot not found')
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch screenshot'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchScreenshot()
  }, [id, user, router])

  const handleSave = async () => {
    if (!screenshot) return

    setSaving(true)
    try {
      await api.screenshots.update(screenshot.id, editData)
      setScreenshot({ ...screenshot, ...editData })
      setIsEditing(false)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update screenshot'
      alert(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData({ 
      user_note: screenshot?.user_note || ''
    })
    setIsEditing(false)
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (error || !screenshot) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="text-center text-red-500">{error || 'Screenshot not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Screenshots
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl mx-auto">
          {screenshot.image_url && (
            <img
              src={screenshot.image_url}
              alt={screenshot.ai_title || 'Screenshot'}
              className="w-full"
            />
          )}

          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {screenshot.ai_title || 'Untitled'}
                </h1>
                {screenshot.ai_tags && screenshot.ai_tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {screenshot.ai_tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-2 ml-4">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="p-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save size={20} />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Edit2 size={20} />
                  </button>
                )}
              </div>
            </div>

            <p className="text-gray-500 mb-4">
              Created: {formatDateSafe(screenshot.created_at, 'PPp')}
            </p>

            {screenshot.ai_description && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">AI Description</h3>
                <p className="text-gray-700">{screenshot.ai_description}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">User Notes</h3>
              {isEditing ? (
                <textarea
                  value={editData.user_note}
                  onChange={(e) => setEditData({ user_note: e.target.value })}
                  placeholder="Add your notes..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {screenshot.user_note || 'No notes added yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}