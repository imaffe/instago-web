'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LogOut, Upload, Search, Home, BookOpen, FolderOpen } from 'lucide-react'
import Link from 'next/link'

export function Navbar() {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <nav className="bg-gray-800 text-white p-4 fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold flex items-center space-x-2">
          <img 
            src="/instago-icon-trans-1.png" 
            alt="InstaGo Logo" 
            className="w-16 h-16 object-contain"
          />
          <span>InstaGo</span>
        </Link>
        
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2 hover:text-gray-300">
            <Home size={20} />
            <span>Home</span>
          </Link>
          
          <Link href="/upload" className="flex items-center space-x-2 hover:text-gray-300">
            <Upload size={20} />
            <span>Upload</span>
          </Link>
          
          <Link href="/search" className="flex items-center space-x-2 hover:text-gray-300">
            <Search size={20} />
            <span>Search</span>
          </Link>
          
          <Link href="/collections" className="flex items-center space-x-2 hover:text-gray-300">
            <FolderOpen size={20} />
            <span>Collections</span>
          </Link>
          
          <Link href="/anki" className="flex items-center space-x-2 hover:text-gray-300">
            <BookOpen size={20} />
            <span>Anki Cards</span>
          </Link>
          
          <button
            onClick={signOut}
            className="flex items-center space-x-2 hover:text-gray-300"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}