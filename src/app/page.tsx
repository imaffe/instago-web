'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AuthForm } from '@/components/AuthForm'
import { Navbar } from '@/components/Navbar'
import { ScreenshotList } from '@/components/ScreenshotList'

export default function Home() {
  const { user, loading } = useAuth()

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