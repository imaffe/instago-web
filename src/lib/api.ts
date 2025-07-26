import { supabase } from './supabase'
import { format } from 'date-fns'

// 动态获取API URL的函数
function getApiUrl(): string {
  // 在客户端，尝试从localStorage获取开发模式状态
  if (typeof window !== 'undefined') {
    try {
      const isDevMode = localStorage.getItem('instago_dev_mode') === 'true'
      if (isDevMode) {
        // 这是你的ngrok开发服务器地址
        return 'https://82540c0ac675.ngrok-free.app/api/v1'
      }
    } catch {
      // 如果localStorage访问失败，使用默认值
    }
  }
  
  // 默认使用环境变量或生产URL
  return process.env.NEXT_PUBLIC_API_URL || 'https://instago-server-fbtibvhmga-uc.a.run.app/api/v1'
}

// 安全的日期格式化函数
export const formatDateSafe = (dateString: string, formatString: string = 'yyyy年MM月dd日 HH:mm') => {
  try {
    if (!dateString || dateString.trim() === '') {
      return '日期未知'
    }
    
    // 尝试不同的日期格式
    let date = new Date(dateString)
    
    // 如果第一次解析失败，尝试其他格式
    if (isNaN(date.getTime())) {
      // 尝试 ISO 格式 (YYYY-MM-DDTHH:mm:ss.sssZ)
      if (typeof dateString === 'string' && dateString.includes('T')) {
        date = new Date(dateString.replace(/\.\d{3}Z$/, 'Z'))
      }
      
      // 如果还是失败，尝试解析为时间戳
      if (isNaN(date.getTime())) {
        const timestamp = parseInt(dateString)
        if (!isNaN(timestamp)) {
          // 检查是否是秒级时间戳（10位）还是毫秒级时间戳（13位）
          date = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp)
        }
      }
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format:', dateString)
      return '日期格式错误'
    }
    
    return format(date, formatString)
  } catch (error) {
    console.warn('Date formatting error:', error, 'for date:', dateString)
    return '日期解析失败'
  }
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // 跳过ngrok浏览器警告
    'User-Agent': 'InstagramApp/1.0', // 模拟非浏览器请求
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API request to ${path} failed:`, response.status, errorText);
    throw new Error(`API Error: ${response.status} ${errorText}`);
  }

  // 对于 204 No Content，我们可能不应该尝试解析 JSON
  if (response.status === 204) {
    return undefined as T; // 或者 return null as T, 取决于你的API消费者如何处理
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  // 对于非JSON响应（例如，DELETE可能返回文本），我们将其作为文本处理
  return response.text() as unknown as T;
}

export interface QuickLinkDict {
  type: 'direct' | 'search_str'
  content: string
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
  quick_link?: QuickLinkDict
}

export interface QueryResult {
  screenshot: Screenshot
  score: number
}

// 安全的日期格式化函数
export const api = {
  screenshots: {
    list: async (): Promise<Screenshot[]> => {
      return request<Screenshot[]>('/screenshot-note?skip=0&limit=100');
    },

    get: async (id: string): Promise<Screenshot> => {
      return request<Screenshot>(`/screenshot-note/${id}`);
    },

    update: async (id: string, data: { user_note?: string }) => {
      return request<Screenshot>(`/screenshot-note/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      await request<void>(`/screenshot/${id}`, {
        method: 'DELETE',
      });
      return { success: true };
    },
  },

  search: async (query: string): Promise<QueryResult[]> => {
    return request<QueryResult[]>(`/query`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
};