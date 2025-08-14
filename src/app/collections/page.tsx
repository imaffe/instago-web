'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/AuthForm'
import { ScreenshotDetailModal } from '@/components/ScreenshotDetailModal'
import { Screenshot, formatDateSafe } from '@/lib/api'
import { useScreenshotCache } from '@/hooks/useScreenshotCache'
import { 
  FolderOpen, 
  Clock, 
  Grid3X3,
  List,
  Search
} from 'lucide-react'

interface Collection {
  name: string
  count: number
  screenshots: Screenshot[]
  previewImage?: string
  description?: string
}

export default function CollectionsPage() {
  const { user } = useAuth()
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)

  // 截图详情模态框状态
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean
    screenshot: Screenshot | null
    cardPosition?: { x: number; y: number; width: number; height: number }
    currentIndex: number
  }>({
    isOpen: false,
    screenshot: null,
    cardPosition: undefined,
    currentIndex: 0
  })

  // 使用缓存钩子获取截图
  const {
    screenshots
  } = useScreenshotCache({
    enableThumbnails: true,
    thumbnailOptions: { width: 300, height: 200, quality: 0.8 },
    autoRefresh: true,
    refreshInterval: 15 * 60 * 1000 // 15 minutes
  })

  // 处理截图点击
  const handleScreenshotClick = (screenshot: Screenshot, index: number) => {
    setDetailModal({
      isOpen: true,
      screenshot,
      currentIndex: index,
      cardPosition: undefined
    })
  }

  // 关闭详情模态框
  const closeDetailModal = () => {
    setDetailModal({
      isOpen: false,
      screenshot: null,
      cardPosition: undefined,
      currentIndex: 0
    })
  }

  // 处理模态框中的截图切换
  const handleModalNavigate = (index: number) => {
    if (!selectedCollection) return

    const currentCollection = collections.find(c => c.name === selectedCollection)
    if (!currentCollection || index < 0 || index >= currentCollection.screenshots.length) return

    const newScreenshot = currentCollection.screenshots[index]
    setDetailModal(prev => ({
      ...prev,
      screenshot: newScreenshot,
      currentIndex: index
    }))
  }

  // 根据 ai_tags 创建合集
  useEffect(() => {
    if (!screenshots || screenshots.length === 0) return

    const collectionsMap = new Map<string, Screenshot[]>()

    screenshots.forEach(screenshot => {
      if (screenshot.ai_tags && screenshot.ai_tags.length > 0) {
        screenshot.ai_tags.forEach(tag => {
          if (!collectionsMap.has(tag)) {
            collectionsMap.set(tag, [])
          }
          collectionsMap.get(tag)!.push(screenshot)
        })
      }
    })

    // 转换为合集数组并排序
    const collectionsArray: Collection[] = Array.from(collectionsMap.entries()).map(([tag, screenshots]) => ({
      name: tag,
      count: screenshots.length,
      screenshots: screenshots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      previewImage: screenshots[0]?.thumbnail_url || screenshots[0]?.image_url,
      description: `${screenshots.length} 个截图`
    }))

    // 按数量排序
    collectionsArray.sort((a, b) => b.count - a.count)
    setCollections(collectionsArray)
    setCollectionsLoading(false)
  }, [screenshots])

  // 过滤合集
  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (collectionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题和统计 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FolderOpen className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">已收藏</p>
              <p className="text-2xl font-bold text-red-600">{screenshots?.length || 0}</p>
              <p className="text-sm text-gray-600">条记忆碎片</p>
            </div>
          </div>
          
          {/* 搜索和视图控制 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索合集..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
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
        </div>

        {/* 合集列表 */}
        {filteredCollections.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无合集</h3>
            <p className="text-gray-500">上传一些截图后，系统会自动根据 AI 标签创建合集</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredCollections.map((collection) => (
              <div
                key={collection.name}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                onClick={() => setSelectedCollection(collection.name)}
              >
                {/* 预览图片 */}
                <div className={`${viewMode === 'list' ? 'w-32 h-24' : 'w-full h-48'} relative overflow-hidden`}>
                  {collection.previewImage ? (
                    <img
                      src={collection.previewImage}
                      alt={collection.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full px-2 py-1">
                    <span className="text-xs font-medium text-gray-700">{collection.count}</span>
                  </div>
                </div>

                {/* 合集信息 */}
                <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">{collection.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{collection.description}</p>
                  
                  {/* 最新截图预览 */}
                  {collection.screenshots.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>最新: {formatDateSafe(collection.screenshots[0].created_at, 'MM月dd日')}</span>
                      </div>
                      
                      {/* 显示前几个截图的缩略图 */}
                      <div className="flex space-x-1">
                        {collection.screenshots.slice(0, 3).map((screenshot, index) => (
                          <div key={screenshot.id} className="relative">
                            <img
                              src={screenshot.thumbnail_url || screenshot.image_url}
                              alt={`预览 ${index + 1}`}
                              className="w-8 h-8 rounded object-cover border border-gray-200"
                            />
                            {index === 2 && collection.screenshots.length > 3 && (
                              <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                                <span className="text-white text-xs font-medium">+{collection.screenshots.length - 3}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 合集详情模态框 */}
        {selectedCollection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCollection}</h2>
                  <button
                    onClick={() => setSelectedCollection(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mt-2">
                  {collections.find(c => c.name === selectedCollection)?.count} 个截图
                </p>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections
                    .find(c => c.name === selectedCollection)
                    ?.screenshots.map((screenshot, index) => (
                      <div
                        key={screenshot.id}
                        className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleScreenshotClick(screenshot, index)}
                      >
                        <img
                          src={screenshot.thumbnail_url || screenshot.image_url}
                          alt={screenshot.ai_title || '截图'}
                          className="w-full h-32 object-cover rounded mb-3"
                        />
                        <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                          {screenshot.ai_title || '无标题'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatDateSafe(screenshot.created_at, 'MM月dd日 HH:mm')}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 截图详情模态框 */}
      <ScreenshotDetailModal
        isOpen={detailModal.isOpen}
        screenshot={detailModal.screenshot}
        onClose={closeDetailModal}
        screenshots={selectedCollection ? collections.find(c => c.name === selectedCollection)?.screenshots || [] : []}
        currentIndex={detailModal.currentIndex}
        onNavigate={handleModalNavigate}
      />
    </div>
  )
}
