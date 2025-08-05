'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, LogIn, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

const imgInstagoIconTrans1 = "https://instago-server-fbtibvhmga-uc.a.run.app/assets/e2870fa454d290f95c1dce6dc86162b6edc36e28.png";

// 常量定义
const AUTH_STATE_KEY = 'instago_auth_state'
const AUTH_EXPIRY_KEY = 'instago_auth_expiry'
const CALLBACK_COOLDOWN_KEY = 'instago_callback_cooldown'
const AUTH_VALIDITY_DURATION = 24 * 60 * 60 * 1000 // 24小时
const CALLBACK_COOLDOWN_DURATION = 5000 // 5秒冷却时间

// 定义认证状态类型
interface AuthStateData {
  token: string
  user_id: string
  user_name: string
  user_email: string
}

// 状态管理工具函数
function setAuthState(authData: AuthStateData) {
  const expiryTime = Date.now() + AUTH_VALIDITY_DURATION
  localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authData))
  localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString())
  console.log('🔐 前端登录状态已保存，过期时间:', new Date(expiryTime))
}

function getAuthState(): AuthStateData | null {
  const expiryTime = localStorage.getItem(AUTH_EXPIRY_KEY)
  const currentTime = Date.now()
  
  if (!expiryTime || currentTime > parseInt(expiryTime)) {
    console.log('⏰ 前端登录状态已过期，清除状态')
    clearAuthState()
    return null
  }
  
  const authData = localStorage.getItem(AUTH_STATE_KEY)
  return authData ? JSON.parse(authData) as AuthStateData : null
}

function clearAuthState() {
  localStorage.removeItem(AUTH_STATE_KEY)
  localStorage.removeItem(AUTH_EXPIRY_KEY)
  sessionStorage.clear()
  console.log('🧹 前端登录状态已清除')
}

// 验证登录状态的有效性
async function validateAuthState(): Promise<boolean> {
  const authState = getAuthState()
  if (!authState) return false
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session || !session.access_token) {
      console.log('❌ Session验证失败，清除状态')
      clearAuthState()
      return false
    }
    
    console.log('✅ Session验证成功')
    return true
  } catch (error) {
    console.log('❌ Session验证请求失败，清除状态', error)
    clearAuthState()
    return false
  }
}

// 回调去重机制
function canSendCallback(callbackURL: string): boolean {
  const lastCallbackData = localStorage.getItem(CALLBACK_COOLDOWN_KEY)
  
  if (lastCallbackData) {
    const { url, timestamp } = JSON.parse(lastCallbackData)
    const currentTime = Date.now()
    
    if (url === callbackURL && (currentTime - timestamp) < CALLBACK_COOLDOWN_DURATION) {
      console.log('⏰ 回调冷却中，忽略重复请求')
      return false
    }
  }
  
  // 记录此次回调
  localStorage.setItem(CALLBACK_COOLDOWN_KEY, JSON.stringify({
    url: callbackURL,
    timestamp: Date.now()
  }))
  
  return true
}

// 回调URL验证
function validateCallbackURL(callbackURL: string): boolean {
  const allowedSchemes = ['instago://']
  const allowedHosts = ['auth']
  
  try {
    if (!allowedSchemes.some(scheme => callbackURL.startsWith(scheme))) {
      console.log('❌ 不允许的回调scheme:', callbackURL)
      return false
    }
    
    const url = new URL(callbackURL)
    if (url.protocol === 'instago:' && !allowedHosts.includes(url.hostname)) {
      console.log('❌ 不允许的回调host:', url.hostname)
      return false
    }
    
    return true
  } catch (error) {
    console.log('❌ 无效的回调URL:', error)
    return false
  }
}

interface UIState {
  showReauthDialog: boolean
  showCooldownMessage: boolean
  showRedirectMessage: boolean
  showCancelMessage: boolean
  showLoginForm: boolean
  error: string | null
  debugURL?: string  // 用于调试显示的URL
}

function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // UI状态管理
  const [uiState, setUIState] = useState<UIState>({
    showReauthDialog: false,
    showCooldownMessage: false,
    showRedirectMessage: false,
    showCancelMessage: false,
    showLoginForm: true,
    error: null
  })
  
  const { signIn, signUp, user } = useAuth()
  const searchParams = useSearchParams()

  const callbackURL = searchParams?.get('callback')
  
  // 页面初始化处理
  useEffect(() => {
    console.log('LoginPage mounted')
    console.log('callbackURL:', callbackURL)
    console.log('user:', user)
    
    if (!callbackURL) {
      console.log('❌ 缺少回调URL参数')
      setUIState(prev => ({ ...prev, error: '无效的登录链接', showLoginForm: false }))
      return
    }
    
    if (!validateCallbackURL(callbackURL)) {
      setUIState(prev => ({ ...prev, error: '无效的回调URL', showLoginForm: false }))
      return
    }
    
    const handlePageLoad = async () => {
      if (!callbackURL) return
      
      console.log('🔗 回调URL:', callbackURL)
      
      // 检查现有登录状态
      const isValidAuth = await validateAuthState()
      
      if (isValidAuth && user) {
        console.log('✅ 用户已登录，显示确认对话框')
        setUIState(prev => ({ 
          ...prev, 
          showReauthDialog: true, 
          showLoginForm: false 
        }))
      } else {
        console.log('🔑 用户未登录，显示登录界面')
        setUIState(prev => ({ 
          ...prev, 
          showLoginForm: true,
          showReauthDialog: false 
        }))
      }
    }
    
    handlePageLoad()
  }, [callbackURL, user])

  const proceedWithCallback = async () => {
    if (!callbackURL || !user) {
      console.log('❌ 缺少必要参数')
      setUIState(prev => ({ ...prev, error: '授权信息丢失，请重新登录' }))
      return
    }
    
    if (!canSendCallback(callbackURL)) {
      setUIState(prev => ({ 
        ...prev, 
        showCooldownMessage: true,
        showReauthDialog: false 
      }))
      return
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        console.error('❌ 无法获取访问令牌')
        setUIState(prev => ({ ...prev, error: '无法获取访问令牌，请重新登录' }))
        return
      }

      // 构建回调URL参数 - 添加明确的回调标识
      const callbackParams = new URLSearchParams({
        action: 'login_callback',  // 明确标识这是登录回调
        type: 'reauth',           // 标识这是重新授权
        token: token,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        user_email: user.email || '',
        timestamp: Date.now().toString(),  // 添加时间戳
        source: 'web_login'       // 标识来源
      })

      // 处理callback URL
      let decodedCallback = callbackURL
      try {
        if (callbackURL.includes('%')) {
          decodedCallback = decodeURIComponent(callbackURL)
        }
      } catch (error) {
        console.warn('Failed to decode callback URL, using original:', error)
        decodedCallback = callbackURL
      }
      
      const redirectURL = `${decodedCallback}?${callbackParams.toString()}`

      console.log('📤 发送授权回调:')
      console.log('  原始callback URL:', callbackURL)
      console.log('  解码后URL:', decodedCallback) 
      console.log('  完整redirect URL:', redirectURL)
      console.log('  回调参数:', Object.fromEntries(callbackParams))
      
      // 保存授权状态
      setAuthState({
        token,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        user_email: user.email || ''
      })
      
      // 显示跳转提示
      setUIState(prev => ({ 
        ...prev, 
        showRedirectMessage: true,
        showReauthDialog: false,
        debugURL: redirectURL  // 保存URL用于调试显示
      }))
      
      // 延迟跳转，给用户看到反馈
      setTimeout(() => {
        console.log('🚀 正在跳转到Mac app:', redirectURL)
        
        // 记录跳转开始时间，用于检测是否成功
        const jumpStartTime = Date.now()
        console.log('⏱️ 跳转开始时间:', jumpStartTime)
        
        // 监听页面可见性变化，检测是否成功跳转到Mac app
        const handleVisibilityChange = () => {
          if (document.hidden) {
            console.log('✅ 页面已隐藏，可能成功跳转到Mac app')
          }
        }
        
        document.addEventListener('visibilitychange', handleVisibilityChange)
        
        // 设置超时检测，如果5秒后还在当前页面，可能跳转失败
        setTimeout(() => {
          if (!document.hidden) {
            console.log('⚠️ 5秒后仍在当前页面，可能跳转失败')
            setUIState(prev => ({ 
              ...prev,
              error: '似乎没有成功跳转到Mac应用。请确保已安装InstaGo应用，或尝试手动重试。'
            }))
          }
          document.removeEventListener('visibilitychange', handleVisibilityChange)
        }, 5000)
        
        // 尝试多种方式触发URL scheme
        try {
          // 方法1: 直接设置location
          window.location.href = redirectURL
          
          // 方法2: 如果直接设置失败，尝试创建隐藏链接点击
          setTimeout(() => {
            const link = document.createElement('a')
            link.href = redirectURL
            link.style.display = 'none'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            console.log('🔗 备用方法：隐藏链接点击完成')
          }, 100)
          
          // 方法3: 尝试iframe方式（某些浏览器可能需要）
          setTimeout(() => {
            const iframe = document.createElement('iframe')
            iframe.style.display = 'none'
            iframe.src = redirectURL
            document.body.appendChild(iframe)
            setTimeout(() => {
              document.body.removeChild(iframe)
              console.log('📱 备用方法：iframe跳转完成')
            }, 200)
          }, 200)
          
        } catch (error) {
          console.error('❌ URL跳转失败:', error)
          setUIState(prev => ({ 
            ...prev, 
            error: 'Mac应用启动失败，请检查是否已安装InstaGo应用'
          }))
        }
      }, 1500)
      
    } catch (error) {
      console.error('❌ 处理回调时出错:', error)
      setUIState(prev => ({ ...prev, error: '处理授权时出错，请重试' }))
    }
  }

  const cancelCallback = () => {
    console.log('🚫 用户取消授权')
    setUIState(prev => ({ 
      ...prev, 
      showCancelMessage: true,
      showReauthDialog: false 
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUIState(prev => ({ ...prev, error: null }))
    setLoading(true)

    try {
      console.log(`Attempting to ${isSignUp ? 'sign up' : 'sign in'} with email:`, email)
      
      const result = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password)
      
      if (result.error) {
        console.error('Auth error:', result.error)
        const errorMessage = result.error instanceof Error ? result.error.message : 'An error occurred'
        throw new Error(errorMessage)
      }
      
      // 如果是注册成功且需要邮箱验证
      if (isSignUp && 'success' in result && result.success) {
        setUIState(prev => ({ 
          ...prev, 
          error: 'Please check your email to verify your account before signing in.' 
        }))
        setIsSignUp(false)
        return
      }
      
      console.log('✅ 登录成功!')
      
      // 登录成功后，等待用户状态更新，然后显示确认对话框
      setTimeout(() => {
        setUIState(prev => ({ 
          ...prev, 
          showReauthDialog: true,
          showLoginForm: false 
        }))
      }, 1000)
      
    } catch (err: unknown) {
      console.error('Caught error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setUIState(prev => ({ ...prev, error: errorMessage }))
    } finally {
      setLoading(false)
    }
  }

  // 重新授权确认对话框
  if (uiState.showReauthDialog) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <div className="transform hover:scale-105 transition-transform duration-200">
              <div
                className="bg-center bg-cover bg-no-repeat w-24 h-24"
                style={{ backgroundImage: `url('${imgInstagoIconTrans1}')` }}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">重新授权确认</h3>
              <p className="text-gray-600 mb-2">
                您已经登录为 <span className="font-medium">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || '用户'}</span>
              </p>
              <p className="text-gray-600 mb-6">
                是否要重新授权 InstaGo 应用？
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={proceedWithCallback}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  确认授权
                </button>
                <button
                  onClick={cancelCallback}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 冷却提示
  if (uiState.showCooldownMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <div className="transform hover:scale-105 transition-transform duration-200">
              <div
                className="bg-center bg-cover bg-no-repeat w-24 h-24"
                style={{ backgroundImage: `url('${imgInstagoIconTrans1}')` }}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">请稍候</h3>
              <p className="text-gray-600 mb-6">
                刚刚已经发送过授权请求，请等待几秒后再试。
              </p>
              <button
                onClick={() => window.close()}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
              >
                关闭窗口
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 跳转提示
  if (uiState.showRedirectMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <div className="transform hover:scale-105 transition-transform duration-200">
              <div
                className="bg-center bg-cover bg-no-repeat w-24 h-24"
                style={{ backgroundImage: `url('${imgInstagoIconTrans1}')` }}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">授权成功</h3>
              <p className="text-gray-600 mb-4">
                正在返回 InstaGo 应用...
              </p>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
              
              {/* 调试信息 */}
              {uiState.debugURL && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    🔍 调试信息（点击查看回调URL）
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-600 mb-2">发送给Mac app的URL:</p>
                    <code className="text-xs text-blue-600 break-all bg-white p-2 rounded border block">
                      {uiState.debugURL}
                    </code>
                                         <div className="mt-2 flex gap-2">
                       <button 
                         onClick={() => navigator.clipboard.writeText(uiState.debugURL || '')}
                         className="text-xs text-blue-600 hover:text-blue-800"
                       >
                         📋 复制URL
                       </button>
                       <button 
                         onClick={() => {
                           if (uiState.debugURL) {
                             console.log('🔄 手动重试跳转:', uiState.debugURL)
                             window.location.href = uiState.debugURL
                           }
                         }}
                         className="text-xs text-green-600 hover:text-green-800"
                       >
                         🔄 手动重试
                       </button>
                     </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 取消提示
  if (uiState.showCancelMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <div className="transform hover:scale-105 transition-transform duration-200">
              <div
                className="bg-center bg-cover bg-no-repeat w-24 h-24"
                style={{ backgroundImage: `url('${imgInstagoIconTrans1}')` }}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
                <AlertCircle className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">授权已取消</h3>
              <p className="text-gray-600 mb-6">
                您已取消对 InstaGo 应用的授权。
              </p>
              <button
                onClick={() => window.close()}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
              >
                关闭页面
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (uiState.error && !uiState.showLoginForm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <div className="transform hover:scale-105 transition-transform duration-200">
              <div
                className="bg-center bg-cover bg-no-repeat w-24 h-24"
                style={{ backgroundImage: `url('${imgInstagoIconTrans1}')` }}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">出现错误</h3>
              <p className="text-gray-600 mb-6">{uiState.error}</p>
              <button
                onClick={() => location.reload()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 登录表单
  if (uiState.showLoginForm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        {/* Logo 独立显示在卡片上方 */}
        <div className="flex justify-center mb-8">
          <div className="transform hover:scale-105 transition-transform duration-200">
            <div
              className="bg-center bg-cover bg-no-repeat w-32 h-32"
              style={{ backgroundImage: `url('${imgInstagoIconTrans1}')` }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              <span>登录保存你的 </span>
              <span className="font-['Patika',_sans-serif] font-medium text-blue-600">Instas</span>
            </h1>
            <p className="text-gray-600">
              登录后将返回到Mac应用
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email 输入框 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="请输入您的邮箱"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                />
              </div>
            </div>
            
            {/* Password 输入框 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="请输入您的密码"
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            {/* 错误提示 */}
            {uiState.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{uiState.error}</p>
              </div>
            )}
            
            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : isSignUp ? (
                <UserPlus className="w-5 h-5 mr-2" />
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              {loading ? '处理中...' : isSignUp ? '创建账户' : '登录'}
            </button>
          </form>
          
          {/* 切换登录/注册 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isSignUp ? '已有账户？' : '没有账户？'}{' '}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setUIState(prev => ({ ...prev, error: null }))
                }}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                {isSignUp ? '立即登录' : '创建账户'}
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}