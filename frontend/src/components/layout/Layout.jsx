import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const { token } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
