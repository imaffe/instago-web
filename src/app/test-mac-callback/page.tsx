'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TestMacCallback() {
  const [testUrl, setTestUrl] = useState('instago://auth?action=test&timestamp=' + Date.now())
  const [results, setResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const addResult = (message: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const testUrlScheme = async () => {
    setIsLoading(true)
    setResults([])
    
    addResult('🚀 开始测试URL scheme...')
    addResult(`📋 测试URL: ${testUrl}`)

    try {
      // 检测页面可见性变化
      const handleVisibilityChange = () => {
        if (document.hidden) {
          addResult('✅ 页面已隐藏，可能成功跳转到Mac应用')
        } else {
          addResult('⚠️ 页面重新可见，可能跳转失败或用户返回')
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      // 测试URL跳转
      addResult('🔄 尝试跳转方法1: location.href')
      window.location.href = testUrl

      // 备用方法：创建临时链接
      setTimeout(() => {
        if (!document.hidden) {
          addResult('🔄 尝试跳转方法2: 创建临时链接')
          const link = document.createElement('a')
          link.href = testUrl
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }, 1000)

      // 备用方法：iframe
      setTimeout(() => {
        if (!document.hidden) {
          addResult('🔄 尝试跳转方法3: iframe方式')
          const iframe = document.createElement('iframe')
          iframe.style.display = 'none'
          iframe.src = testUrl
          document.body.appendChild(iframe)
          
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 2000)
        }
      }, 2000)

      // 超时检测
      setTimeout(() => {
        if (!document.hidden) {
          addResult('❌ 5秒后仍在当前页面，URL scheme可能未正确注册或Mac应用未运行')
          addResult('💡 建议检查:')
          addResult('   1. InstaGo Mac应用是否正在运行')
          addResult('   2. 应用是否在菜单栏显示')
          addResult('   3. URL scheme (instago://) 是否正确注册')
          addResult('   4. macOS系统是否允许URL scheme跳转')
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        setIsLoading(false)
      }, 5000)

    } catch (error) {
      addResult(`❌ 测试过程出错: ${error instanceof Error ? error.message : '未知错误'}`)
      setIsLoading(false)
    }
  }

  const generateTestUrl = () => {
    const params = new URLSearchParams({
      action: 'test_callback',
      test_id: Date.now().toString(),
      source: 'web_test',
      debug: 'true'
    })
    const newUrl = `instago://auth?${params.toString()}`
    setTestUrl(newUrl)
    addResult(`🔄 生成新的测试URL: ${newUrl}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Mac 回调测试工具
            </h1>
            <p className="text-gray-600">
              测试 instago:// URL scheme 是否正常工作
            </p>
          </div>

          <div className="space-y-6">
            {/* URL输入区域 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                测试 URL:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={generateTestUrl}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  生成新URL
                </button>
              </div>
            </div>

            {/* 测试按钮 */}
            <div className="flex gap-4">
              <button
                onClick={testUrlScheme}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '测试中...' : '🚀 开始测试'}
              </button>
              <button
                onClick={() => setResults([])}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                清空结果
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                返回
              </button>
            </div>

            {/* 测试结果 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">测试结果:</h3>
              <div className="bg-gray-900 rounded-md p-4 h-64 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-gray-400 text-sm">点击&quot;开始测试&quot;查看结果...</p>
                ) : (
                  <div className="space-y-1">
                    {results.map((result, index) => (
                      <div key={index} className="text-green-400 text-sm font-mono">
                        {result}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 系统信息 */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">系统信息:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">用户代理:</span>
                  <p className="text-gray-900 break-all">{navigator.userAgent}</p>
                </div>
                <div>
                  <span className="text-gray-600">平台:</span>
                  <p className="text-gray-900">{navigator.platform}</p>
                </div>
                <div>
                  <span className="text-gray-600">语言:</span>
                  <p className="text-gray-900">{navigator.language}</p>
                </div>
                <div>
                  <span className="text-gray-600">当前时间:</span>
                  <p className="text-gray-900">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* 使用说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">使用说明:</h3>
              <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
                <li>确保 InstaGo Mac 应用正在运行</li>
                <li>点击&quot;开始测试&quot;按钮测试URL scheme跳转</li>
                <li>如果测试成功，页面会自动跳转到Mac应用</li>
                <li>如果测试失败，会在5秒后显示详细的错误信息</li>
                <li>可以修改测试URL来测试不同的参数组合</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}