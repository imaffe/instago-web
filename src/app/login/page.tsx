'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const imgInstagoIconTrans1 = "http://localhost:3845/assets/e2870fa454d290f95c1dce6dc86162b6edc36e28.png";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white overflow-clip relative rounded-[15px] w-full max-w-[621px] p-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h2 className="font-['Inter',_sans-serif] font-normal text-[28px] text-black leading-[34px]">
            <span>{`Log in to save your `}</span>
            <span className="font-['Patika',_sans-serif] font-medium">Instas</span>
          </h2>
          {callbackURL && (
            <p className="text-sm text-gray-600 mt-2">
              登录后将返回到Mac应用
            </p>
          )}
        </div>

        {/* Instago 图标 */}
        <div className="flex justify-center mb-8">
          <div className="flex-none rotate-[333deg]">
            <div
              className="bg-center bg-cover bg-no-repeat size-[87px]"
              style={{ backgroundImage: `url('${imgInstagoIconTrans1}')` }}
            />
          </div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email 输入框 */}
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="EMAIL"
              className="w-full h-[74px] bg-neutral-300 rounded-[15px] px-6 font-['Cutive_Mono',_sans-serif] text-[18px] text-black text-center placeholder-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Password 输入框 */}
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="PASSWORD"
              className="w-full h-[74px] bg-neutral-300 rounded-[15px] px-6 font-['Cutive_Mono',_sans-serif] text-[18px] text-black text-center placeholder-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* 错误提示 */}
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          
          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[74px] bg-black text-white rounded-[15px] font-['Cutive_Mono',_sans-serif] text-[18px] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Log in'}
          </button>
        </form>
        
        {/* 切换登录/注册 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-['Cutive_Mono',_sans-serif] text-[18px] text-[#006fff] hover:underline"
          >
            {isSignUp ? 'Already have an account?' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
} 