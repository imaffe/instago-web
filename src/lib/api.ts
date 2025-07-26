import { supabase } from './supabase'

// 动态获取API URL的函数
function getApiUrl(): string {
  // 在客户端，尝试从localStorage获取开发模式状态
  if (typeof window !== 'undefined') {
    try {
      const isDevMode = localStorage.getItem('instago_dev_mode') === 'true'
      if (isDevMode) {
        return 'https://82540c0ac675.ngrok-free.app/api/v1'
      }
    } catch {
      // 如果localStorage访问失败，使用默认值
    }
  }
  
  // 默认使用环境变量或生产URL
  return process.env.NEXT_PUBLIC_API_URL || 'https://instago-server-fbtibvhmga-uc.a.run.app/api/v1'
}

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
    'ngrok-skip-browser-warning': 'true', // 跳过ngrok浏览器警告
    'User-Agent': 'InstagramApp/1.0', // 模拟非浏览器请求
  }
}

export interface Screenshot {
  id: string
  user_id: string
  created_at: string
  updated_at: string
  image_url: string
  thumbnail_url?: string
  user_note?: string
  ai_title?: string
  ai_description?: string
  ai_tags?: string[]
  markdown_content?: string
  width?: number
  height?: number
  file_size?: number
  process_status?: 'pending' | 'processed' | 'error'
}

export interface Query {
  id: string
  user_id: string
  query: string
  created_at: string
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
      
      const response = await fetch(`${getApiUrl()}/screenshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'InstagramApp/1.0',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const errorData = await response.text()
        console.error('Upload failed:', response.status, errorData)
        throw new Error(`Failed to upload screenshot: ${response.status}`)
      }
      
      return response.json()
    },

    list: async (skip: number = 0, limit: number = 20): Promise<Screenshot[]> => {
      try {
        const headers = await getAuthHeaders()
        const url = `${getApiUrl()}/screenshot-note?skip=${skip}&limit=${limit}`
        console.log('Fetching screenshots from:', url)
        
        const response = await fetch(url, {
          headers,
        })
        
        console.log('Screenshot API response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Screenshot API error:', response.status, errorText)
          console.error('Response headers:', Object.fromEntries(response.headers.entries()))
          
          // 如果是500错误，返回空数组而不是抛出错误
          if (response.status === 500) {
            console.warn('Backend returned 500 error, returning empty screenshots array')
            return []
          }
          
          throw new Error(`Failed to fetch screenshots: ${response.status} ${errorText}`)
        }
        
        // 检查响应内容类型
        const contentType = response.headers.get('content-type')
        console.log('Response content-type:', contentType)
        
        // 如果不是JSON，记录完整响应并返回空数组
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text()
          console.error('❌ Response is not JSON:', {
            status: response.status,
            contentType,
            url: response.url,
            responsePreview: responseText.substring(0, 200) + '...'
          })
          console.warn('Returning empty array due to non-JSON response')
          return []
        }
        
        const data = await response.json()
        console.log('Screenshots fetched successfully:', data)
        return data
      } catch (error) {
        console.error('Error in screenshot list API call:', error)
        // 返回空数组而不是抛出错误，让界面能正常显示
        return []
      }
    },

    update: async (id: string, data: { user_note?: string }) => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/screenshot-note/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      })
      
      if (!response.ok) throw new Error('Failed to update screenshot')
      return response.json()
    },

    delete: async (id: string) => {
      const headers = await getAuthHeaders()
      console.log(`正在删除截图: ${id}`)
      
      const response = await fetch(`${getApiUrl()}/screenshot/${id}`, {
        method: 'DELETE',
        headers,
      })
      
      console.log(`删除请求响应状态: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('删除截图失败:', response.status, errorText)
        throw new Error(`删除截图失败: ${response.status} - ${errorText}`)
      }
      
      // 204 No Content 状态码表示删除成功，但没有响应内容
      if (response.status === 204) {
        console.log('截图删除成功 (204 No Content)')
        return { success: true }
      }
      
      // 如果有其他成功状态码且有内容，尝试解析 JSON
      try {
        return await response.json()
      } catch (e) {
        // 如果解析失败但状态码表示成功，返回成功标识
        console.log('删除成功，但响应为空或无效 JSON')
        return { success: true }
      }
    },
  },

  search: {
    query: async (query: string): Promise<Screenshot[]> => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      })
      
      if (!response.ok) throw new Error('Failed to search screenshots')
      return response.json()
    },

    history: async (): Promise<Query[]> => {
      const headers = await getAuthHeaders()
      const response = await fetch(`${getApiUrl()}/query-history`, {
        headers,
      })
      
      if (!response.ok) throw new Error('Failed to fetch query history')
      return response.json()
    },
  },
}