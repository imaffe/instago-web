'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/AuthForm'
import { Navbar } from '@/components/Navbar'
import { ScreenshotList } from '@/components/ScreenshotList'

export default function Home() {
  const { user, loading } = useAuth()
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // 检查用户是否已验证邮箱
    if (user && !user.email_confirmed_at) {
      setAuthError('Please verify your email address before continuing.')
    } else {
      setAuthError(null)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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

  // 如果用户未验证邮箱，显示提示信息
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <div className="text-yellow-600 mb-4">
                <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Email Verification Required</h2>
              <p className="text-gray-600 mb-4">{authError}</p>
              <p className="text-sm text-gray-500">
                Please check your email and click the verification link to continue.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Screenshots</h1>
        <ScreenshotList />
      </div>
    </div>
  )
}