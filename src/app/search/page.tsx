'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from '@/components/Navbar'
import { api, Screenshot, Query } from '@/lib/api'
import { format } from 'date-fns'
import { Search, Clock, Eye } from 'lucide-react'
import Link from 'next/link'

export default function SearchPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Screenshot[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<Query[]>([])

  if (!user) {
    router.push('/')
    return null
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setError(null)
    setShowHistory(false)

    try {
      const data = await api.search.query(query)
      setResults(data)
    } catch (err: any) {
      setError(err.message || 'Failed to search screenshots')
    } finally {
      setSearching(false)
    }
  }

  const loadHistory = async () => {
    try {
      const data = await api.search.history()
      setHistory(data)
      setShowHistory(true)
    } catch (err: any) {
      setError(err.message || 'Failed to load search history')
    }
  }

  const searchFromHistory = (historicalQuery: string) => {
    setQuery(historicalQuery)
    setShowHistory(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
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
          
          <button
            type="button"
            onClick={loadHistory}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <Clock size={16} />
            <span>View search history</span>
          </button>
        </form>

        {error && (
          <p className="text-center text-red-500 mb-4">{error}</p>
        )}

        {searching && (
          <p className="text-center text-gray-500">Searching...</p>
        )}

        {showHistory && history.length > 0 && (
          <div className="max-w-2xl mx-auto mb-8">
            <h2 className="text-xl font-semibold mb-4">Recent Searches</h2>
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => searchFromHistory(item.query)}
                  className="w-full text-left p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <p className="font-medium">{item.query}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(item.created_at), 'PPp')}
                  </p>
                </button>
              ))}
            </div>
          </div>
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
                      {format(new Date(screenshot.created_at), 'PPp')}
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