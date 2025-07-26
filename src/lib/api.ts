import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    console.error('No access token found in session')
    throw new Error('Not authenticated')
  }
  
  console.log('Using access token:', session.access_token.substring(0, 20) + '...')
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export interface Screenshot {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  image_url: string
  process_status: 'pending' | 'processed' | 'failed'
  thumbnail_url?: string
  user_note?: string
  ai_title?: string
  ai_description?: string
  ai_tags?: string[]
  markdown_content?: string
  quick_link?: {
    type: 'direct' | 'search_str'
    content: string
  }
  width?: number
  height?: number
  file_size?: number
}

export interface Query {
  id: string
  user_id: string
  query: string
  created_at: string
}

export interface QueryResult {
  screenshot: Screenshot
  score: number
}

export interface RAGQueryResponse {
  answer: string
  confidence: number
  sources_used: number
  model_used?: string
  results: QueryResult[]
  total_results: number
}

export const api = {
  screenshots: {
    upload: async (file: File, tags: string = '') => {
      // Convert file to base64
      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result as string
          // Remove data:image/xxx;base64, prefix
          const base64Data = base64String.split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(file)
      
      const base64Data = await base64Promise
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }
      
      const payload = {
        screenshotTimestamp: Math.floor(Date.now() / 1000), // Current Unix timestamp
        screenshotAppName: "Web Upload", // Default app name for web uploads
        screenshotTags: tags.substring(0, 16), // Max 16 chars as per API requirement
        screenshotFileBlob: base64Data
      }
      
      console.log('Uploading screenshot with payload:', { ...payload, screenshotFileBlob: 'base64...' })
      
      const response = await fetch(`${API_URL}/screenshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        console.error('Upload failed:', response.status, errorData)
        throw new Error(`Failed to upload screenshot: ${response.status}`)
      }
      
      const result = await response.json()
      // The new API returns just a status, not the full screenshot
      return result
    },

    list: async (): Promise<Screenshot[]> => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_URL}/screenshot-note`, {
        method: 'GET',
        headers,
      })
      
      if (!response.ok) throw new Error('Failed to fetch screenshots')
      return response.json()
    },

    update: async (id: string, data: { user_note?: string }) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_URL}/screenshot-note/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      })
      
      if (!response.ok) throw new Error('Failed to update screenshot')
      return response.json()
    },

    delete: async (id: string) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_URL}/screenshot/${id}`, {
        method: 'DELETE',
        headers,
      })
      
      if (!response.ok) throw new Error('Failed to delete screenshot')
      return response.json()
    },
  },

  search: {
    query: async (query: string, limit: number = 3): Promise<QueryResult[]> => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, limit }),
      })
      
      if (!response.ok) throw new Error('Failed to search screenshots')
      return response.json()
    },

    history: async (): Promise<Query[]> => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_URL}/query-history`, {
        headers,
      })
      
      if (!response.ok) throw new Error('Failed to fetch query history')
      return response.json()
    },
  },
}