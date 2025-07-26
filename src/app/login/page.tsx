'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'

const imgInstagoIconTrans1 = "https://instago-server-fbtibvhmga-uc.a.run.app/assets/e2870fa454d290f95c1dce6dc86162b6edc36e28.png";

function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const { signIn, signUp, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // 获取URL中的callback参数
  const callbackURL = searchParams?.get('callback')
  
  // 调试信息
  useEffect(() => {
    console.log('LoginPage mounted')
    console.log('callbackURL:', callbackURL)
    console.log('user:', user)
  }, [callbackURL, user])

  // 登录成功后的回调处理
  const handleLoginSuccess = useCallback(async () => {
    console.log('handleLoginSuccess called')
    console.log('user:', user)
    console.log('callbackURL:', callbackURL)
    
    if (!user || !callbackURL) {
      console.log('Missing user or callbackURL, returning')
      return
    }

    try {
      console.log('Getting session...')
      // 获取用户的访问令牌
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Session:', session)
      const token = session?.access_token

      if (!token) {
        console.error('No access token found')
        return
      }

      console.log('Token found:', token.substring(0, 20) + '...')

      // 构建回调URL参数
      const callbackParams = new URLSearchParams({
        token: token,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        user_email: user.email || ''
      })

      console.log('Callback params:', {
        token: token.substring(0, 20) + '...',
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        user_email: user.email || ''
      })

      // 处理callback URL（可能已经解码或者需要解码）
      let decodedCallback = callbackURL
      try {
        // 尝试解码，如果已经是解码状态，这不会改变结果
        if (callbackURL.includes('%')) {
          decodedCallback = decodeURIComponent(callbackURL)
        }
      } catch (error) {
        console.warn('Failed to decode callback URL, using original:', error)
        decodedCallback = callbackURL
      }
      
      const redirectURL = `${decodedCallback}?${callbackParams.toString()}`

      console.log('Original callback URL:', callbackURL)
      console.log('Decoded callback URL:', decodedCallback)
      console.log('Final redirect URL:', redirectURL)
      
      // 重定向到Mac App
      console.log('About to redirect to Mac app...')
      window.location.href = redirectURL
    } catch (error) {
      console.error('Error handling Mac app callback:', error)
      setError('回调到Mac应用时出错')
    }
  }, [user, callbackURL])

  // 如果用户已经登录且有callback，直接处理回调
  useEffect(() => {
    if (user && callbackURL) {
      handleLoginSuccess()
    }
  }, [user, callbackURL, handleLoginSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
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
        setError('Please check your email to verify your account before signing in.')
        setIsSignUp(false) // 切换到登录模式
        return
      }
      
      console.log('Auth successful!')
      
      // 如果有callback，立即处理Mac app回调
      if (callbackURL) {
        console.log('Callback found, processing Mac app callback...')
        
        try {
          // 直接获取当前session和token
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token
          const currentUser = session?.user

          if (!token || !currentUser) {
            console.error('No token or user found after login')
            setError('登录成功但无法获取用户信息')
            return
          }

          console.log('Got user and token after login:', {
            user_id: currentUser.id,
            user_email: currentUser.email,
            token: token.substring(0, 20) + '...'
          })

          // 构建回调URL参数
          const callbackParams = new URLSearchParams({
            token: token,
            user_id: currentUser.id,
            user_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || '',
            user_email: currentUser.email || ''
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

          console.log('Final redirect URL:', redirectURL)
          console.log('About to redirect to Mac app...')
          
          // 重定向到Mac App
          window.location.href = redirectURL
          
        } catch (error) {
          console.error('Error processing Mac app callback:', error)
          setError('处理Mac应用回调时出错')
        }
      } else {
        console.log('No callback, redirecting to home')
        router.push('/')
      }
      
    } catch (err: unknown) {
      console.error('Caught error:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

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
          {callbackURL ? (
            <p className="text-gray-600">
              登录后将返回到Mac应用
            </p>
          ) : (
            <p className="text-gray-600">
              {isSignUp ? '创建账户开始使用' : '登录保存你的截图'}
            </p>
          )}
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
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
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
                setError(null)
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