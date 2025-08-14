'use client'

import { useEffect, useState } from 'react'
import { api, Screenshot, formatDateSafe } from '@/lib/api'
import { 
  FolderOpen, 
  Search, 
  ArrowLeft, 
  Clock, 
  Tag,
  Grid3X3,
  List
} from 'lucide-react'
import { ScreenshotDetailModal } from './ScreenshotDetailModal'

interface TagCollection {
  name: string
  count: number
  screenshots: Screenshot[]
  previewImages: string[]
}

type ViewState = 'collections' | 'detail'

export function CollectionsViewer() {
  const [collections, setCollections] = useState<TagCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewState, setViewState] = useState<ViewState>('collections')
  const [selectedCollection, setSelectedCollection] = useState<TagCollection | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // 截图详情模态框状态
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean
    screenshot: Screenshot | null
    currentIndex: number
  }>({
    isOpen: false,
    screenshot: null,
    currentIndex: 0
  })

  const fetchCollections = async () => {
    try {
      setLoading(true)
      console.log('Fetching screenshots for collections...')
      const data = await api.screenshots.list()
      
      // 根据 ai_tags 创建合集
      const collectionsMap = new Map<string, Screenshot[]>()
      
      data.forEach(screenshot => {
        if (screenshot.ai_tags && Array.isArray(screenshot.ai_tags) && screenshot.ai_tags.length > 0) {
          screenshot.ai_tags.forEach(tag => {
            if (!collectionsMap.has(tag)) {
              collectionsMap.set(tag, [])
            }
            collectionsMap.get(tag)!.push(screenshot)
          })
        }
      })
      
      // 转换为合集数组并排序
      const collectionsArray: TagCollection[] = Array.from(collectionsMap.entries()).map(([tag, screenshots]) => ({
        name: tag,
        count: screenshots.length,
        screenshots: screenshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
        previewImages: screenshots.slice(0, 3).map(s => s.thumbnail_url || s.image_url).filter(Boolean) as string[]
      }))
      
      // 按数量排序
      collectionsArray.sort((a, b) => b.count - a.count)
      
      console.log('Collections found:', collectionsArray)
      setCollections(collectionsArray)
    } catch (err: unknown) {
      console.error('Error fetching collections:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collections'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  // 过滤合集
  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 处理点击合集
  const handleCollectionClick = (collection: TagCollection) => {
    setSelectedCollection(collection)
    setViewState('detail')
  }

  // 返回合集列表
  const handleBackToCollections = () => {
    setViewState('collections')
    setSelectedCollection(null)
    setSearchTerm('')
  }

  // 处理截图点击
  const handleScreenshotClick = (screenshot: Screenshot, index: number) => {
    setDetailModal({
      isOpen: true,
      screenshot,
      currentIndex: index
    })
  }

  // 关闭详情模态框
  const closeDetailModal = () => {
    setDetailModal({
      isOpen: false,
      screenshot: null,
      currentIndex: 0
    })
  }

  // 处理模态框中的截图切换
  const handleModalNavigate = (index: number) => {
    if (!selectedCollection || index < 0 || index >= selectedCollection.screenshots.length) return

    const newScreenshot = selectedCollection.screenshots[index]
    setDetailModal(prev => ({
      ...prev,
      screenshot: newScreenshot,
      currentIndex: index
    }))
  }

  if (loading) {
    return (
      <div className="h-full flex justify-center items-center">
        <div className="text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">正在加载合集...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchCollections}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // 合集详情视图
  if (viewState === 'detail' && selectedCollection) {
    return (
      <div className="h-full flex flex-col">
        {/* 详情页头部 */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackToCollections}
              className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              返回合集
            </button>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid3X3 size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Tag className="w-6 h-6 text-purple-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCollection.name}</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            已收藏 {selectedCollection.count} 条记忆碎片
          </p>
        </div>

        {/* 截图网格 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
            : 'space-y-4'
          }>
            {selectedCollection.screenshots.map((screenshot, index) => (
              <div
                key={screenshot.id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                onClick={() => handleScreenshotClick(screenshot, index)}
              >
                <div className={`${viewMode === 'list' ? 'w-32 h-24' : 'w-full h-48'} relative overflow-hidden`}>
                  {screenshot.image_url ? (
                    <img
                      src={screenshot.thumbnail_url || screenshot.image_url}
                      alt={screenshot.ai_title || '截图'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm line-clamp-2">
                    {screenshot.ai_title || '未命名截图'}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateSafe(screenshot.created_at, 'MM月dd日 HH:mm')}</span>
                  </div>
                  {screenshot.ai_description && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                      {screenshot.ai_description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 截图详情模态框 */}
        <ScreenshotDetailModal
          isOpen={detailModal.isOpen}
          screenshot={detailModal.screenshot}
          onClose={closeDetailModal}
          screenshots={selectedCollection.screenshots}
          currentIndex={detailModal.currentIndex}
          onNavigate={handleModalNavigate}
        />
      </div>
    )
  }

  // 合集列表视图
  return (
    <div className="h-full flex flex-col">
      {/* 头部统计和搜索 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">已收藏</p>
            <p className="text-2xl font-bold text-red-600">
              {collections.reduce((sum, c) => sum + c.count, 0)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">条记忆碎片</p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索合集..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* 合集网格 */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredCollections.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无合集</h3>
            <p className="text-gray-500 dark:text-gray-400">上传一些截图后，系统会自动根据 AI 标签创建合集</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCollections.map((collection) => (
              <div
                key={collection.name}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                onClick={() => handleCollectionClick(collection)}
              >
                {/* 预览图片区域 */}
                <div className="h-48 relative overflow-hidden bg-gray-50 dark:bg-gray-900">
                  {collection.previewImages.length > 0 ? (
                    <div className="flex h-full">
                      {collection.previewImages.slice(0, 3).map((image, index) => (
                        <div
                          key={index}
                          className={`relative ${
                            collection.previewImages.length === 1 
                              ? 'w-full' 
                              : collection.previewImages.length === 2 
                                ? 'w-1/2' 
                                : index === 0 
                                  ? 'w-1/2' 
                                  : 'w-1/4'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`预览 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index < collection.previewImages.length - 1 && (
                            <div className="absolute right-0 top-0 bottom-0 w-px bg-white"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full px-2 py-1">
                    <span className="text-xs font-medium text-gray-700">{collection.count}</span>
                  </div>
                </div>

                {/* 合集信息 */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg line-clamp-1">
                    {collection.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {collection.count} 个截图
                  </p>
                  
                  {/* 最新截图时间 */}
                  {collection.screenshots.length > 0 && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>最新: {formatDateSafe(collection.screenshots[0].created_at, 'MM月dd日')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}