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
const CALLBACK_COOLDOWN_DURATION = 3000 // 3秒冷却时间，避免与Mac端冲突

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


function clearAuthState() {
  localStorage.removeItem(AUTH_STATE_KEY)
  localStorage.removeItem(AUTH_EXPIRY_KEY)
  sessionStorage.clear()
  console.log('🧹 前端登录状态已清除')
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

// 回调URL验证 - 加强验证和错误处理
function validateCallbackURL(callbackURL: string): { valid: boolean; error?: string } {
  const allowedSchemes = ['instago://']
  const allowedHosts = ['auth']
  
  if (!callbackURL) {
    return { valid: false, error: '回调URL不能为空' }
  }
  
  if (typeof callbackURL !== 'string') {
    return { valid: false, error: '回调URL必须是字符串' }
  }
  
  if (callbackURL.length > 1000) {
    return { valid: false, error: '回调URL过长' }
  }
  
  try {
    if (!allowedSchemes.some(scheme => callbackURL.startsWith(scheme))) {
      console.log('❌ 不允许的回调scheme:', callbackURL)
      return { valid: false, error: `不支持的URL scheme。支持的scheme: ${allowedSchemes.join(', ')}` }
    }
    
    const url = new URL(callbackURL)
    if (url.protocol === 'instago:' && !allowedHosts.includes(url.hostname)) {
      console.log('❌ 不允许的回调host:', url.hostname)
      return { valid: false, error: `不支持的主机名。支持的主机: ${allowedHosts.join(', ')}` }
    }
    
    return { valid: true }
  } catch (error) {
    console.log('❌ 无效的回调URL:', error)
    return { valid: false, error: `URL格式错误: ${error instanceof Error ? error.message : '未知错误'}` }
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
    console.log('📊 页面状态检测:')
    console.log('  - 是否有callback参数:', !!callbackURL)
    console.log('  - 用户登录状态:', !!user)
    
    // 如果没有callback参数，允许用户正常登录，但不进行Mac app回调
    if (!callbackURL) {
      console.log('ℹ️ 无callback参数，显示正常登录页面')
      setUIState(prev => ({ 
        ...prev, 
        showLoginForm: true,
        showReauthDialog: false,
        error: null
      }))
      return
    }
    
    // 有callback参数时验证URL有效性
    const urlValidation = validateCallbackURL(callbackURL)
    if (!urlValidation.valid) {
      console.error('❌ 无效的回调URL:', urlValidation.error)
      setUIState(prev => ({ 
        ...prev, 
        error: `无效的Mac app回调URL: ${urlValidation.error}\n\n您仍可以正常登录，但无法自动连接Mac应用。`, 
        showLoginForm: true  // 允许用户继续登录
      }))
      return
    }
    
    // 简化页面初始化逻辑
    const initializePage = () => {
      if (!callbackURL) {
        // 无callback参数，显示正常登录页面
        console.log('📝 初始化：显示正常登录页面')
        return
      }
      
      // 有callback参数，记录详细信息
      console.log('🔗 初始化：棄测到Mac app回调请求')
      console.log('  原始URL:', callbackURL)
      console.log('  URL长度:', callbackURL.length)
      console.log('  URL编码检测:', callbackURL.includes('%') ? '已编码' : '未编码')
      
      // URL解析测试
      try {
        const testUrl = new URL(callbackURL)
        console.log('  URL解析结果:')
        console.log('    协议:', testUrl.protocol)
        console.log('    主机:', testUrl.hostname)
        console.log('    路径:', testUrl.pathname)
        console.log('    查询参数:', testUrl.search)
      } catch (e) {
        console.log('  URL解析失败:', e)
      }
      
      // 检查用户是否已登录
      if (user) {
        console.log('✅ 用户已登录，直接显示Mac app连接确认对话框')
        setUIState(prev => ({ 
          ...prev, 
          showReauthDialog: true, 
          showLoginForm: false,
          error: null
        }))
      } else {
        console.log('🔑 用户未登录，显示登录界面（登录成功后将显示Mac app连接对话框）')
        setUIState(prev => ({ 
          ...prev, 
          showLoginForm: true,
          showReauthDialog: false,
          error: null
        }))
      }
    }
    
    initializePage()
  }, [callbackURL, user]) // 保持简单的依赖，但简化处理逻辑

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
      // 验证用户状态
      if (!user || !user.id || !user.email) {
        console.error('❌ 用户信息不完整:', { user })
        setUIState(prev => ({ 
          ...prev, 
          error: '用户信息不完整，请重新登录' 
        }))
        return
      }
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ 获取session失败:', sessionError)
        setUIState(prev => ({ 
          ...prev, 
          error: `获取会话信息失败: ${sessionError.message}` 
        }))
        return
      }
      
      const token = session?.access_token

      if (!token) {
        console.error('❌ 无法获取访问令牌')
        setUIState(prev => ({ 
          ...prev, 
          error: '无法获取访问令牌，请重新登录\n\n可能原因:\n1. 登录状态已过期\n2. 网络连接问题\n3. Supabase服务异常' 
        }))
        return
      }
      
      // 验证token有效性
      if (session && session.expires_at && session.expires_at < Date.now() / 1000) {
        console.error('❌ 令牌已过期')
        setUIState(prev => ({ 
          ...prev, 
          error: '登录令牌已过期，请重新登录' 
        }))
        return
      }

      // 构建回调URL参数 - 标准化参数名称以匹配Mac端期望
      const callbackParams = new URLSearchParams({
        // 核心参数 - Mac端必需
        token: token,
        user_id: user.id,
        user_email: user.email || '',
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        
        // 元数据参数
        action: 'login_callback',  // 明确标识这是登录回调
        type: 'reauth',           // 标识这是重新授权
        expires_in: (session?.expires_in || 3600).toString(),
        timestamp: Date.now().toString(),
        source: 'web_login',
        
        // 调试参数
        debug: 'true',            // 启用Mac端调试日志
        version: '2.0'            // 协议版本
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

      console.log('📤 发送授权回调详细信息:')
      console.log('  ===== URL处理过程 =====')
      console.log('  1. 原始callback URL:', callbackURL)
      console.log('  2. 解码后URL:', decodedCallback) 
      console.log('  3. URL是否发生变化:', callbackURL !== decodedCallback ? '是' : '否')
      console.log('  4. 完整redirect URL:', redirectURL)
      console.log('  5. redirect URL长度:', redirectURL.length)
      
      console.log('  ===== 回调参数详情 =====')
      const paramsObj = Object.fromEntries(callbackParams)
      Object.entries(paramsObj).forEach(([key, value]) => {
        console.log(`    ${key}:`, value)
      })
      
      console.log('  ===== 用户信息验证 =====')
      console.log('  用户ID:', user.id)
      console.log('  用户邮箱:', user.email)
      console.log('  用户名称:', user.user_metadata?.full_name || '未设置')
      console.log('  Token长度:', token.length)
      console.log('  Session过期时间:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : '未知')
      
      console.log('  ===== 系统环境检测 =====')
      console.log('  浏览器:', navigator.userAgent.includes('Safari') ? 'Safari' : '其他')
      console.log('  操作系统:', navigator.platform)
      console.log('  当前时间:', new Date().toISOString())
      console.log('  页面URL:', window.location.href)
      
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
        console.log('🎯 跳转目标检测:')
        console.log('  目标URL scheme:', redirectURL.split('?')[0])
        console.log('  参数数量:', redirectURL.split('?')[1]?.split('&').length || 0)
        console.log('  浏览器支持检测:', 'location' in window ? '✅' : '❌')
        console.log('  页面可见性:', document.visibilityState)
        console.log('  页面焦点状态:', document.hasFocus() ? '有焦点' : '无焦点')
        
        // 监听页面可见性变化，检测是否成功跳转到Mac app
        const handleVisibilityChange = () => {
          if (document.hidden) {
            console.log('✅ 页面已隐藏，可能成功跳转到Mac app')
          }
        }
        
        document.addEventListener('visibilitychange', handleVisibilityChange)
        
        // 设置超时检测，如果6秒后还在当前页面，可能跳转失败
        const timeoutId = setTimeout(() => {
          if (!document.hidden) {
            console.log('⚠️ 6秒后仍在当前页面，可能跳转失败')
            setUIState(prev => ({ 
              ...prev,
              error: '似乎没有成功跳转到Mac应用。请确保已安装InstaGo应用，或检查URL scheme注册。\n\n如果问题持续，请尝试:\n1. 重启InstaGo Mac应用\n2. 检查应用是否在后台运行\n3. 重新安装Mac应用以修复URL scheme注册',
              debugURL: redirectURL // 保持debugURL可用于重试
            }))
          }
          document.removeEventListener('visibilitychange', handleVisibilityChange)
        }, 6000)
        
        // 如果成功跳转，清除超时检测
        const handleVisibilityChangeWithCleanup = () => {
          if (document.hidden) {
            const jumpDuration = Date.now() - jumpStartTime
            console.log('✅ 页面已隐藏，成功跳转到Mac app')
            console.log('🕐 跳转耗时:', jumpDuration + 'ms')
            console.log('📊 跳转统计:')
            console.log('  开始时间:', new Date(jumpStartTime).toLocaleTimeString())
            console.log('  完成时间:', new Date().toLocaleTimeString())
            console.log('  是否快速跳转:', jumpDuration < 1000 ? '是' : '否')
            clearTimeout(timeoutId)
            document.removeEventListener('visibilitychange', handleVisibilityChangeWithCleanup)
          }
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        document.addEventListener('visibilitychange', handleVisibilityChangeWithCleanup)
        
        // 使用多种方式尝试触发URL scheme，提高成功率
        try {
          console.log('🚀 开始跳转到Mac应用')
          
          // 方法1: 直接设置location.href (主要方法)
          window.location.href = redirectURL
          
          // 方法2: 如果主要方法失败，创建隐藏的iframe作为备用
          setTimeout(() => {
            if (!document.hidden) {
              console.log('🔄 尝试备用跳转方法')
              const iframe = document.createElement('iframe')
              iframe.style.display = 'none'
              iframe.src = redirectURL
              document.body.appendChild(iframe)
              
              // 短暂延迟后移除iframe
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe)
                }
              }, 1000)
            }
          }, 1000)
          
        } catch (error) {
          console.error('❌ URL跳转失败:', error)
          setUIState(prev => ({ 
            ...prev, 
            error: 'Mac应用启动失败。请检查：\n1. 是否已安装InstaGo应用\n2. 应用是否正在运行\n3. URL scheme是否正确注册'
          }))
        }
      }, 1200) // 稍微缩短延迟时间，提升用户体验
      
    } catch (error) {
      console.error('❌ 处理回调时出错:', error)
      
      // 详细的错误信息
      let errorMessage = '处理授权时出错'
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = '网络连接错误，请检查网络后重试'
        } else if (error.message.includes('auth') || error.message.includes('token')) {
          errorMessage = '身份验证错误，请重新登录'
        } else {
          errorMessage = `处理授权失败: ${error.message}`
        }
      }
      
      setUIState(prev => ({ 
        ...prev, 
        error: `${errorMessage}\n\n如果问题持续，请尝试:\n1. 刷新页面重新开始\n2. 清除浏览器缓存\n3. 检查Mac应用是否正常运行` 
      }))
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
      
      // 登录成功后直接检查是否需要显示Mac app连接对话框
      console.log('📊 登录成功后状态检查:')
      console.log('  - callback参数:', !!callbackURL ? '存在' : '不存在')
      console.log('  - callback URL:', callbackURL || '无')
      console.log('  - 当前用户状态:', !!user ? '已登录' : '未登录')
      console.log('  - UI状态切换:', callbackURL ? 'Mac连接对话框' : '跳转到主页')
      
      if (callbackURL) {
        console.log('✅ 检测到callback参数，显示Mac app连接对话框')
        console.log('⚡ 即将显示确认对话框，等待用户确认连接Mac应用')
        console.log('🔄 设置UI状态: showReauthDialog=true, showLoginForm=false')
        
        setUIState(prev => {
          console.log('📝 UI状态更新前:', { ...prev })
          const newState = {
            ...prev, 
            showReauthDialog: true,
            showLoginForm: false,
            error: null
          }
          console.log('📝 UI状态更新后:', newState)
          return newState
        })
      } else {
        console.log('ℹ️ 无callback参数，登录完成后跳转到主页')
        // 如果没有callback参数，登录成功后跳转到主页
        setTimeout(() => {
          console.log('🚀 正在跳转到主页...')
          window.location.href = '/'
        }, 1500)
        
        setUIState(prev => ({ 
          ...prev, 
          showLoginForm: false,
          error: null
        }))
      }
      
    } catch (err: unknown) {
      console.error('Caught error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setUIState(prev => ({ ...prev, error: errorMessage }))
    } finally {
      setLoading(false)
    }
  }

  // 重新授权确认对话框
  console.log('📊 当前渲染状态检查:', {
    showReauthDialog: uiState.showReauthDialog,
    showLoginForm: uiState.showLoginForm,
    showRedirectMessage: uiState.showRedirectMessage,
    showCooldownMessage: uiState.showCooldownMessage,
    showCancelMessage: uiState.showCancelMessage,
    hasError: !!uiState.error,
    hasCallbackURL: !!callbackURL,
    hasUser: !!user
  })
  
  if (uiState.showReauthDialog) {
    console.log('📺 正在渲染Mac app连接确认对话框')
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
              <p className="text-gray-600 mb-4">
                刚刚已经发送过授权请求，请等待几秒后再试。
              </p>
              <div className="text-sm text-gray-500 mb-6">
                为了避免重复请求冲突，系统设置了3秒冷却时间。
              </div>
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
              
              {/* 调试信息 - 默认展开以便快速排查问题 */}
              {uiState.debugURL && (
                <details className="mt-6 text-left" open>
                  <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900 font-medium">
                    🔍 回调信息（排查问题时查看）
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-2 font-medium">📋 完整回调URL:</p>
                      <code className="text-xs text-blue-600 break-all bg-white p-2 rounded border block">
                        {uiState.debugURL}
                      </code>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-600 mb-2 font-medium">🔍 URL解析:</p>
                      <div className="text-xs bg-white p-2 rounded border">
                        {(() => {
                          try {
                            const url = new URL(uiState.debugURL || '')
                            const params = new URLSearchParams(url.search)
                            return (
                              <div className="space-y-1">
                                <div><span className="text-gray-500">协议:</span> <code className="text-blue-600">{url.protocol}</code></div>
                                <div><span className="text-gray-500">主机:</span> <code className="text-blue-600">{url.hostname}</code></div>
                                <div><span className="text-gray-500">参数数量:</span> <code className="text-blue-600">{params.size}个</code></div>
                                <div><span className="text-gray-500">令牌长度:</span> <code className="text-blue-600">{params.get('token')?.length || 0}字符</code></div>
                                <div><span className="text-gray-500">用户ID:</span> <code className="text-blue-600">{params.get('user_id') || '未找到'}</code></div>
                              </div>
                            )
                          } catch (e) {
                            return <span className="text-red-600">URL解析错误: {e instanceof Error ? e.message : '未知错误'}</span>
                          }
                        })()}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-600 mb-2 font-medium">💡 排查建议:</p>
                      <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside bg-white p-2 rounded border">
                        <li>确认InstaGo Mac应用正在运行</li>
                        <li>检查应用是否在菜单栏显示</li>
                        <li>尝试重启Mac应用重新注册URL scheme</li>
                        <li>查看Mac应用控制台日志</li>
                      </ul>
                    </div>
                                         <div className="mt-3 flex gap-2">
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(uiState.debugURL || '')
                           // 简单的复制成功反馈
                           const btn = event?.target as HTMLButtonElement
                           const originalText = btn.textContent
                           btn.textContent = '✅ 已复制'
                           setTimeout(() => {
                             btn.textContent = originalText
                           }, 2000)
                         }}
                         className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                       >
                         📋 复制URL
                       </button>
                       <button 
                         onClick={() => {
                           if (uiState.debugURL) {
                             console.log('🔄 手动重试跳转:', uiState.debugURL)
                             // 尝试多种跳转方法
                             window.location.href = uiState.debugURL
                             
                             // 备用方法：创建临时链接点击
                             setTimeout(() => {
                               const link = document.createElement('a')
                               link.href = uiState.debugURL || ''
                               link.style.display = 'none'
                               document.body.appendChild(link)
                               link.click()
                               document.body.removeChild(link)
                             }, 500)
                           }
                         }}
                         className="text-xs text-green-600 hover:text-green-800 px-2 py-1 border border-green-200 rounded hover:bg-green-50"
                       >
                         🔄 立即重试
                       </button>
                       <button 
                         onClick={() => location.reload()}
                         className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
                       >
                         🔄 重新开始
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