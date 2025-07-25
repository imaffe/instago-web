'use client'

import { X, AlertTriangle } from 'lucide-react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({ isOpen, title, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* 模态框内容 */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-in zoom-in-95 duration-200">
        {/* 关闭按钮 */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* 图标和标题 */}
        <div className="flex items-start space-x-4 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-gray-600">
              确定要删除截图 <span className="font-medium">&ldquo;{title}&rdquo;</span> 吗？
            </p>
            <p className="text-sm text-gray-500 mt-2">此操作无法撤销。</p>
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
} 