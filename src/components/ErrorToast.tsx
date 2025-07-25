'use client'

import { useEffect, useState } from 'react'
import { X, AlertCircle } from 'lucide-react'

interface ErrorToastProps {
  message: string | null
  onClose: () => void
  duration?: number
}

export function ErrorToast({ message, onClose, duration = 5000 }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setIsVisible(true)
      
      // 自动关闭
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // 等待动画完成后关闭
      }, duration)

      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [message, duration, onClose])

  if (!message) return null

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible 
        ? 'translate-y-0 opacity-100' 
        : '-translate-y-full opacity-0'
    }`}>
      <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 flex items-center space-x-3 max-w-md">
        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-600" />
        </div>
        
        <div className="flex-1">
          <p className="text-red-800 text-sm font-medium">删除失败</p>
          <p className="text-red-700 text-sm mt-1">{message}</p>
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="p-1 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  )
} 