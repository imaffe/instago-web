'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from '@/components/Navbar'
import { api, Screenshot, formatDateSafe } from '@/lib/api'
import { Search, Eye } from 'lucide-react'
import Link from 'next/link'

export default function SearchPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Screenshot[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    router.push('/')
    return null
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setError(null)

    try {
      const data = await api.search(query)
      // 从QueryResult中提取Screenshot对象
      const screenshots = data.map(result => result.screenshot)
      setResults(screenshots)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to search screenshots')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        <h1 className="text-3xl font-bold mb-8">Search Screenshots</h1>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your screenshots using natural language..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              <Search size={24} />
            </button>
          </div>
          
        </form>

        {error && (
          <p className="text-center text-red-500 mb-4">{error}</p>
        )}

        {searching && (
          <p className="text-center text-gray-500">Searching...</p>
        )}

        {results.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Found {results.length} result{results.length !== 1 ? 's' : ''}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((screenshot) => (
                <div key={screenshot.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {screenshot.image_url && (
                    <img
                      src={screenshot.image_url}
                      alt={screenshot.ai_title || 'Screenshot'}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">
                      {screenshot.ai_title || screenshot.user_note || 'Untitled'}
                    </h3>
                    
                    {screenshot.ai_description && (
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {screenshot.ai_description}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 mb-4">
                      {formatDateSafe(screenshot.created_at, 'PPp')}
                    </p>
                    
                    <Link
                      href={`/screenshot/${screenshot.id}`}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={16} />
                      <span className="text-sm">View Details</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}