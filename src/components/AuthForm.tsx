'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const imgInstagoIconTrans1 = "http://localhost:3845/assets/e2870fa454d290f95c1dce6dc86162b6edc36e28.png";

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const { signIn, signUp } = useAuth()

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