import React from 'react'

// 扩展全局类型定义
declare global {
  interface Window {
    dev: () => void
    prod: () => void
    devStatus: () => { isDevMode: boolean; apiUrl: string }
    cache: () => void
    clearCache: () => void
    cacheStats: () => void
  }
}

// 动态获取开发环境 API URL，支持环境变量覆盖
const getDevApiUrl = (): string => {
  // 优先使用环境变量（在构建时注入）
  if (process.env.NEXT_PUBLIC_DEV_API_URL) {
    return process.env.NEXT_PUBLIC_DEV_API_URL
  }
  // fallback 到默认值（会被 update-dev-url.js 脚本自动更新）
  return 'https://82540c0ac675.ngrok-free.app/api/v1'
}

const DEV_API_URL = getDevApiUrl()
const PROD_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://instago-server-fbtibvhmga-uc.a.run.app/api/v1'
const DEV_MODE_KEY = 'instago_dev_mode'

class DevModeManager {
  private static instance: DevModeManager
  private isDevMode = false
  private listeners: Array<(isDevMode: boolean) => void> = []

  constructor() {
    if (typeof window !== 'undefined') {
      // 从 localStorage 恢复开发模式状态
      const saved = localStorage.getItem(DEV_MODE_KEY)
      this.isDevMode = saved === 'true'
      
      // 在控制台注册全局函数
      this.registerGlobalFunctions()
    }
  }

  static getInstance(): DevModeManager {
    if (!DevModeManager.instance) {
      DevModeManager.instance = new DevModeManager()
    }
    return DevModeManager.instance
  }

  private registerGlobalFunctions() {
    if (typeof window !== 'undefined') {
      // 注册 dev() 函数到全局
      window.dev = () => {
        this.enableDevMode()
      }

      // 注册 prod() 函数到全局
      window.prod = () => {
        this.disableDevMode()
      }

      // 注册 devStatus() 函数到全局
      window.devStatus = () => {
        console.log('📊 InstaGo 开发环境状态')
        console.log('========================')
        console.log(`当前模式: ${this.isDevMode ? '🔧 开发模式' : '🏭 生产模式'}`)
        console.log(`API URL: ${this.getApiUrl()}`)
        console.log(`开发 API: ${DEV_API_URL}`)
        console.log(`生产 API: ${PROD_API_URL}`)
        console.log(`环境变量: ${process.env.NEXT_PUBLIC_DEV_API_URL ? '✅ 已设置' : '❌ 未设置'}`)
        
        // 检查 ngrok 连接状态
        if (this.isDevMode) {
          console.log('🌐 ngrok 状态检查...')
          fetch(DEV_API_URL.replace('/api/v1', '/docs'))
            .then(() => console.log('✅ 开发服务器连接正常'))
            .catch(() => console.log('❌ 开发服务器连接失败'))
        }
        
        return {
          isDevMode: this.isDevMode,
          apiUrl: this.getApiUrl(),
          devApiUrl: DEV_API_URL,
          prodApiUrl: PROD_API_URL,
          hasEnvVar: !!process.env.NEXT_PUBLIC_DEV_API_URL
        }
      }

      // Register cache management functions
      window.cache = () => {
        this.showCacheInfo()
      }

      window.clearCache = () => {
        this.clearAllCache()
      }

      window.cacheStats = () => {
        this.showCacheStats()
      }

      console.log('🚀 InstaGo 开发工具已加载!')
      console.log('  dev()        - 切换到开发模式')
      console.log('  prod()       - 切换到生产模式') 
      console.log('  devStatus()  - 查看当前模式状态')
      console.log('  cache()      - 查看缓存管理选项')
      console.log('  clearCache() - 清除所有缓存')
      console.log('  cacheStats() - 查看缓存统计')
      console.log('')
      console.log('🔧 当前配置:')
      console.log(`  开发 API: ${DEV_API_URL}`)
      console.log(`  生产 API: ${PROD_API_URL}`)
      console.log(`  环境变量: ${process.env.NEXT_PUBLIC_DEV_API_URL ? '✅ 已设置' : '❌ 未设置'}`)
      console.log('')
      console.log('💡 提示: 运行 npm run update-dev-url 更新开发环境地址')
    }
  }

  enableDevMode() {
    this.isDevMode = true
    this.saveToStorage()
    this.notifyListeners()
    console.log('🔧 已切换到开发模式')
    console.log(`📡 API URL: ${DEV_API_URL}`)
    console.log('🔄 页面将在 1 秒后刷新...')
    
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  disableDevMode() {
    this.isDevMode = false
    this.saveToStorage()
    this.notifyListeners()
    console.log('🏭 已切换到生产模式')
    console.log(`📡 API URL: ${PROD_API_URL}`)
    console.log('🔄 页面将在 1 秒后刷新...')
    
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  getApiUrl(): string {
    return this.isDevMode ? DEV_API_URL : PROD_API_URL
  }

  getIsDevMode(): boolean {
    return this.isDevMode
  }

  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEV_MODE_KEY, this.isDevMode.toString())
    }
  }

  addListener(callback: (isDevMode: boolean) => void) {
    this.listeners.push(callback)
  }

  removeListener(callback: (isDevMode: boolean) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isDevMode))
  }

  private showCacheInfo() {
    import('./cache').then(({ cacheManager }) => {
      const stats = cacheManager.getCacheStats()
      console.log('📊 缓存统计:')
      console.log(`  截图数量: ${stats.screenshots}`)
      console.log(`  缩略图数量: ${stats.thumbnails}`)
      console.log(`  搜索结果数量: ${stats.searchResults}`)
      console.log(`  总大小: ${stats.totalSize}`)
      
      const lastFetch = cacheManager.getLastFetch()
      if (lastFetch) {
        const timeSinceLastFetch = Date.now() - lastFetch
        const minutes = Math.floor(timeSinceLastFetch / (1000 * 60))
        console.log(`  上次刷新: ${minutes} 分钟前`)
      }

      console.log('')
      console.log('🛠️ 缓存管理选项:')
      console.log('  cacheInvalidation.invalidateCache({ invalidateScreenshots: true }) - 清除截图缓存')
      console.log('  cacheInvalidation.invalidateCache({ invalidateThumbnails: true }) - 清除缩略图缓存')
      console.log('  cacheInvalidation.invalidateCache({ invalidateSearchResults: true }) - 清除搜索缓存')
      console.log('  cacheInvalidation.smartInvalidation() - 智能清理缓存')
    }).catch(error => {
      console.error('Failed to load cache manager:', error)
    })
  }

  private clearAllCache() {
    import('./cache').then(({ cacheManager }) => {
      cacheManager.clearAllCache()
      console.log('🧹 已清除所有缓存')
      console.log('🔄 页面将在 1 秒后刷新...')
      
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }).catch(error => {
      console.error('Failed to clear cache:', error)
    })
  }

  private showCacheStats() {
    import('./cache').then(({ cacheManager }) => {
      const stats = cacheManager.getCacheStats()
      console.table({
        '截图数量': stats.screenshots,
        '缩略图数量': stats.thumbnails,
        '搜索结果数量': stats.searchResults,
        '总大小': stats.totalSize
      })
    }).catch(error => {
      console.error('Failed to get cache stats:', error)
    })
  }
}

export const devModeManager = DevModeManager.getInstance()

// Hook for React components
export function useDevMode() {
  const [isDevMode, setIsDevMode] = React.useState(devModeManager.getIsDevMode())

  React.useEffect(() => {
    const handleChange = (newIsDevMode: boolean) => {
      setIsDevMode(newIsDevMode)
    }

    devModeManager.addListener(handleChange)
    return () => devModeManager.removeListener(handleChange)
  }, [])

  return {
    isDevMode,
    apiUrl: devModeManager.getApiUrl(),
    enableDevMode: () => devModeManager.enableDevMode(),
    disableDevMode: () => devModeManager.disableDevMode()
  }
} 