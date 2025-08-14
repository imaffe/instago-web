'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/AuthForm'
import { useDevMode } from '@/lib/devMode'
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal'
import { ErrorToast } from '@/components/ErrorToast'
import { ScreenshotDetailModal } from '@/components/ScreenshotDetailModal'
import { AnkiCardViewer } from '@/components/AnkiCardViewer'
import { CollectionsViewer } from '@/components/CollectionsViewer'
import { api, Screenshot, formatDateSafe } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useScreenshotCache } from '@/hooks/useScreenshotCache'
import { useSearchCache } from '@/hooks/useSearchCache'
import { 
  Images, 
  Clock, 
  Trash2, 
  Plus, 
  Users, 
  Search, 
  MoreVertical,
  Grid3X3,
  List,
  Filter,
  Eye,
  Download,
  BookOpen,
  FolderOpen
} from 'lucide-react'

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const { isDevMode, apiUrl } = useDevMode()
  const [authError, setAuthError] = useState<string | null>(null)

  // 初始化开发模式工具
  useEffect(() => {
    // 动态导入开发模式管理器以确保控制台函数已注册
    import('@/lib/devMode').then(() => {
      // 开发工具已在导入时自动初始化
      console.log('🚀 开发工具已初始化，可以在控制台使用 dev(), prod(), devStatus(), cache(), clearCache(), cacheStats()')
    })
    
    // 导入缓存失效工具
    import('@/lib/cacheInvalidation').then(() => {
      console.log('🧹 缓存失效工具已加载，可以在控制台使用 cacheInvalidation')
    })
  }, [])
  // Use caching hooks
  const {
    screenshots,
    loading: screenshotLoading,
    error: screenshotError,
    refreshScreenshots,
    removeScreenshot: removeScreenshotFromCache,
    getThumbnailUrl,
    forceRefresh
  } = useScreenshotCache({
    enableThumbnails: true,
    thumbnailOptions: { width: 300, height: 200, quality: 0.8 },
    autoRefresh: true,
    refreshInterval: 15 * 60 * 1000 // 15 minutes
  })

  const {
    searchResults,
    isSearching,
    searchError,
    search,
    clearSearch,
    lastQuery
  } = useSearchCache()
  
  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  
  // 删除确认模态框状态
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    screenshotId: string | null
    screenshotTitle: string
  }>({
    isOpen: false,
    screenshotId: null,
    screenshotTitle: ''
  })
  
  // 错误提示状态
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // 截图详情模态框状态
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean
    screenshot: Screenshot | null
    cardPosition?: { x: number; y: number; width: number; height: number }
    currentIndex: number
  }>({
    isOpen: false,
    screenshot: null,
    currentIndex: 0
  })

  const categories = [
    { id: 'all', name: 'All Instas', icon: Images, count: screenshots.length },
    { id: 'anki', name: 'Anki Cards', icon: BookOpen, count: screenshots.filter(s => s.ai_title || s.ai_description || s.markdown_content).length },
    { id: 'collections', name: 'Collections', icon: FolderOpen, count: screenshots.filter(s => s.ai_tags && s.ai_tags.length > 0).length },
    { id: 'recent', name: 'Recents', icon: Clock, count: 0 },
    { id: 'trash', name: 'Deleted', icon: Trash2, count: 0 },
  ]

  const tags = [
    { id: 'work', name: 'Coding at Adventure X', count: 24, color: 'blue' },
    { id: 'design', name: 'Writing PRD', count: 18, color: 'purple' },
    { id: 'code', name: 'Designing UI', count: 32, color: 'green' },
    { id: 'other', name: 'Presenting at Adventure X', count: 56, color: 'gray' }
  ]

  // Handle search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      clearSearch()
    } else {
      search(searchTerm)
    }
  }, [searchTerm, search, clearSearch])

  useEffect(() => {
    if (user && !user.email_confirmed_at) {
      setAuthError('Please verify your email address before continuing.')
    } else {
      setAuthError(null)
    }
  }, [user])

  // 打开删除确认模态框
  const handleDelete = (id: string) => {
    const screenshotToDelete = screenshots.find(s => s.id === id)
    const screenshotTitle = screenshotToDelete?.ai_title || screenshotToDelete?.user_note || '未命名截图'
    
    setDeleteModal({
      isOpen: true,
      screenshotId: id,
      screenshotTitle
    })
  }

  // 确认删除 - 实现乐观删除
  const confirmDelete = async () => {
    const { screenshotId, screenshotTitle } = deleteModal
    if (!screenshotId) return

    console.log(`🗑️ 开始删除截图: ${screenshotId}`)
    
    // 立即从缓存中移除截图（乐观删除）
    removeScreenshotFromCache(screenshotId)
    
    // 关闭模态框
    setDeleteModal({ isOpen: false, screenshotId: null, screenshotTitle: '' })

    try {
      // 调用删除 API
      await api.screenshots.delete(screenshotId)
      console.log(`✅ 截图删除成功: ${screenshotId}`)
      
    } catch (err: unknown) {
      console.error(`❌ 删除截图失败: ${screenshotId}`, err)
      
      // 删除失败 - 刷新缓存以恢复数据
      await refreshScreenshots()
      
      // 显示错误提示
      const errorMessage = err instanceof Error ? err.message : '删除截图时发生未知错误'
      setErrorMessage(`删除截图"${screenshotTitle}"失败: ${errorMessage}`)
    }
  }

  // 取消删除
  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, screenshotId: null, screenshotTitle: '' })
  }

  // 打开截图详情
  const handleViewScreenshot = (screenshot: Screenshot, cardElement?: HTMLElement) => {
    let cardPosition
    
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect()
      cardPosition = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      }
    }
    
    // 当前显示的列表
    const currentList = searchTerm ? searchResults : screenshots
    // 计算当前截图在过滤后列表中的索引
    const currentIndex = currentList.findIndex(s => s.id === screenshot.id)
    
    setDetailModal({
      isOpen: true,
      screenshot,
      cardPosition,
      currentIndex: currentIndex >= 0 ? currentIndex : 0
    })
  }

  // 关闭截图详情
  const closeDetailModal = () => {
    setDetailModal({
      isOpen: false,
      screenshot: null,
      currentIndex: 0
    })
  }

  // 导航到指定索引的截图
  const handleNavigateScreenshot = (newIndex: number) => {
    const currentList = lastQuery ? searchResults : screenshots
    if (newIndex >= 0 && newIndex < currentList.length) {
      const newScreenshot = currentList[newIndex]
      setDetailModal(prev => ({
        ...prev,
        screenshot: newScreenshot,
        currentIndex: newIndex
      }))
    }
  }

  const runDiagnosis = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://instago-server-fbtibvhmga-uc.a.run.app/api/v1'
    console.log('🔧 Running API diagnosis...')
    console.log('API URL:', API_URL)
    console.log('User:', user?.email)
    
    // 测试原始请求
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        console.log('🧪 Testing raw API call...')
        const testResponse = await fetch(`${API_URL}/screenshot-note?skip=0&limit=1`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'InstagramApp/1.0',
          }
        })
        
        console.log('🔍 Raw response status:', testResponse.status)
        console.log('🔍 Raw response headers:', Object.fromEntries(testResponse.headers.entries()))
        
        const rawText = await testResponse.text()
        console.log('🔍 Raw response preview:', rawText.substring(0, 200))
        
        if (rawText.startsWith('<!DOCTYPE')) {
          console.error('❌ Still getting HTML response')
        } else {
          console.log('✅ Getting non-HTML response')
        }
      }
    } catch (error) {
      console.error('🚨 Raw test failed:', error)
    }
    
    console.log('🔄 Now trying through API wrapper...')
    await refreshScreenshots()
  }

  const truncateText = (text: string, maxLength: number = 16) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const displayedScreenshots = lastQuery ? searchResults : screenshots

  // 根据选择的分类获取标题
  const getCategoryTitle = () => {
    const category = categories.find(cat => cat.id === selectedCategory)
    return category?.name || 'All Instas'
  }

  // 根据选择的分类渲染内容
  const renderMainContent = () => {
    if (selectedCategory === 'anki') {
      return <AnkiCardViewer />
    }

    if (selectedCategory === 'collections') {
      return <CollectionsViewer />
    }

    // 搜索时的加载状态
    if (isSearching) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="text-lg text-gray-600">Searching...</div>
        </div>
      )
    }

    // 搜索错误
    if (searchError) {
      return (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Search Error</h3>
          <p className="text-gray-600 mb-4">{searchError}</p>
        </div>
      )
    }

    // 原有的截图列表逻辑
    if (screenshotLoading) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="text-lg text-gray-600">Loading screenshots...</div>
        </div>
      )
    }

    if (screenshotError) {
      return (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.676-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h3>
          <p className="text-gray-600 mb-4">Unable to load screenshots from server</p>
          <p className="text-sm text-gray-500 mb-6">Error: {screenshotError}</p>
          <div className="space-x-4">
            <button
              onClick={refreshScreenshots}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Retry</span>
            </button>
            <button
              onClick={runDiagnosis}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-200 transition-colors"
            >
              <Filter className="w-5 h-5" />
              <span>Diagnose</span>
            </button>
          </div>
        </div>
      )
    }

    if (displayedScreenshots.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <Images className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No results found' : 'No screenshots yet'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? `Your search for "${searchTerm}" did not return any results.`
              : 'Your screenshots will appear here once available'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={refreshScreenshots}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          )}
        </div>
      )
    }

    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
        {displayedScreenshots.map((screenshot) => {
          const processStatus = screenshot.process_status || 'processed'
          
          // 安全获取标题，优先级：ai_title > user_note > 默认
          const getTitle = () => {
            if (screenshot.ai_title && screenshot.ai_title.trim()) {
              return screenshot.ai_title
            }
            if (screenshot.user_note && screenshot.user_note.trim()) {
              return screenshot.user_note
            }
            return '未命名截图'
          }
          
          // 安全获取描述
          const getDescription = () => {
            if (processStatus === 'processed' && screenshot.ai_description && screenshot.ai_description.trim()) {
              return screenshot.ai_description
            }
            if (processStatus === 'pending') {
              return 'AI 正在分析中，请稍候...'
            }
            if (processStatus === 'error') {
              return 'AI 分析失败，仅显示原始截图'
            }
            return null
          }
          
          return (
            <div 
              key={screenshot.id} 
              data-screenshot-card
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer relative ${viewMode === 'list' ? 'flex' : ''}`}
              onClick={(e) => handleViewScreenshot(screenshot, e.currentTarget)}
            >
              {/* 处理状态指示器 */}
              {processStatus !== 'processed' && (
                <div className="absolute top-2 right-2 z-10">
                  {processStatus === 'pending' && (
                    <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>处理中</span>
                    </div>
                  )}
                  {processStatus === 'error' && (
                    <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span>失败</span>
                    </div>
                  )}
                </div>
              )}

              {/* 图片区域 */}
              {screenshot.image_url && (
                <div className={`relative ${viewMode === 'list' ? 'w-32 h-24 flex-shrink-0' : 'w-full h-48'}`}>
                  <img
                    src={getThumbnailUrl(screenshot.id) || screenshot.image_url}
                    alt={screenshot.ai_title || '截图'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to original image if thumbnail fails
                      const target = e.target as HTMLImageElement
                      if (target.src !== screenshot.image_url) {
                        target.src = screenshot.image_url!
                      }
                    }}
                  />
                </div>
              )}
              
              <div className={`p-4 ${viewMode === 'list' ? 'flex-1 flex items-center justify-between' : ''}`}>
                <div className={viewMode === 'list' ? 'flex-1' : ''}>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                    {getTitle()}
                  </h3>
                  
                  {/* 根据状态显示不同的描述 */}
                  {getDescription() && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                      {getDescription()}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDateSafe(screenshot.created_at)}
                  </p>
                </div>
                
                <div 
                  className={`flex items-center space-x-2 ${viewMode === 'list' ? 'flex-shrink-0 ml-4' : 'mt-4'}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 查看详情按钮 - 所有状态都可用 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const cardElement = e.currentTarget.closest('[data-screenshot-card]') as HTMLElement
                      handleViewScreenshot(screenshot, cardElement)
                    }}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                    title="查看详情"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {/* 下载按钮 - 所有状态都可用 */}
                  <button
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg transition-colors"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  

                  
                  {/* 删除按钮 - 所有状态都可用 */}
                  <button
                    onClick={() => handleDelete(screenshot.id)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AuthForm />
      </div>
    )
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-yellow-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">邮箱验证必需</h2>
          <p className="text-gray-600 mb-6">{authError}</p>
          <p className="text-sm text-gray-500">请检查您的邮箱并点击验证链接以继续。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
      {/* 侧边栏 */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 flex flex-col fixed left-0 top-0 bottom-0 z-40">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <img 
              src="/instago-icon-trans-1.png" 
              alt="InstaGo Logo" 
              className="w-20 h-20 object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">InstaGo</span>
          </div>
        </div>

        {/* 导航分类 */}
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={category.name} // 显示完整文本的工具提示
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{truncateText(category.name)}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{category.count}</span>
                </button>
              )
            })}
          </nav>

          {/* 标签分类 */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Tags</h3>
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
                         <div className="space-y-2">
               {tags.map((tag) => (
                 <div
                   key={tag.id}
                   className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                   title={tag.name} // 显示完整文本的工具提示
                 >
                   <div className="flex items-center space-x-3 flex-1 min-w-0">
                     <div className={`w-3 h-3 rounded-full bg-${tag.color}-500 flex-shrink-0`}></div>
                     <span className="truncate text-gray-700 dark:text-gray-300">{truncateText(tag.name)}</span>
                   </div>
                   <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{tag.count}</span>
                 </div>
               ))}
             </div>
          </div>

          {/* 添加新标签 */}
          <button className="w-full mt-4 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add tag</span>
          </button>
        </div>

        {/* 好友管理 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
            <Users className="w-5 h-5" />
            <span>我的好友</span>
          </div>
        </div>

                 {/* 用户信息 */}
         <div className="p-4 border-t border-gray-200 dark:border-gray-700">
           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
               <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                 {user.email?.charAt(0).toUpperCase()}
               </span>
             </div>
             <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={user.email}>
                 {user.email}
               </p>
             </div>
             <button
               onClick={signOut}
               className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 dark:text-gray-500 flex-shrink-0"
             >
               <MoreVertical className="w-4 h-4" />
             </button>
           </div>
         </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col ml-64 h-screen overflow-hidden">
        {/* 顶部工具栏 */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{getCategoryTitle()}</h1>
              {/* 开发模式指示器 */}
              {isDevMode && (
                <div className="flex items-center space-x-2 bg-orange-100 border border-orange-200 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span>开发模式</span>
                  <span className="text-xs opacity-75">({apiUrl.split('/')[2]})</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 只在默认页面显示搜索和视图切换 */}
              {selectedCategory !== 'anki' && selectedCategory !== 'collections' && (
                <>
                  {/* 搜索框 */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Instas"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* 视图切换 */}
                   <div className="flex bg-gray-100 rounded-lg p-1">
                     <button
                       onClick={() => setViewMode('grid')}
                       className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                     >
                       <Grid3X3 className="w-4 h-4" />
                     </button>
                     <button
                       onClick={() => setViewMode('list')}
                       className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
                     >
                       <List className="w-4 h-4" />
                     </button>
                   </div>
                </>
              )}

              {/* Cache management buttons - show in dev mode */}
              {isDevMode && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshScreenshots}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="刷新缓存"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={forceRefresh}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="强制刷新(清除缓存)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
              
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {renderMainContent()}
        </div>
      </div>
      
      {/* 删除确认模态框 */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.screenshotTitle}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      
      {/* 错误提示 Toast */}
      <ErrorToast
        message={errorMessage}
        onClose={() => setErrorMessage(null)}
      />
      
      {/* 截图详情模态框 */}
      <ScreenshotDetailModal
        screenshot={detailModal.screenshot}
        isOpen={detailModal.isOpen}
        onClose={closeDetailModal}
        cardPosition={detailModal.cardPosition}
        screenshots={displayedScreenshots}
        currentIndex={detailModal.currentIndex}
        onNavigate={handleNavigateScreenshot}
      />
    </div>
  )
}