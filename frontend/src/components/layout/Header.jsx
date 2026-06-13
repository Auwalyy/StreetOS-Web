import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { businessApi } from '../../api/services'
import { Avatar } from '../ui'

export default function Header({ onMenuClick }) {
  const { user, currentBusiness, setCurrentBusiness } = useAuthStore()
  const navigate = useNavigate()
  const [showBizPicker, setShowBizPicker] = useState(false)

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessApi.getAll().then(r => r.data.data),
  })

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-gray-100 lg:hidden">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Business Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowBizPicker(!showBizPicker)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
          >
            <span className="font-medium text-gray-700 max-w-[150px] truncate">
              {currentBusiness?.name || 'Select Business'}
            </span>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showBizPicker && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-2">
                {businesses?.map(biz => (
                  <button
                    key={biz._id}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${currentBusiness?._id === biz._id ? 'bg-orange-50 text-orange-600 font-medium' : 'hover:bg-gray-50'}`}
                    onClick={() => { setCurrentBusiness(biz); setShowBizPicker(false) }}
                  >
                    {biz.name}
                  </button>
                ))}
                <button
                  onClick={() => { navigate('/businesses/new'); setShowBizPicker(false) }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-orange-500 hover:bg-orange-50 font-medium transition-colors"
                >
                  + Add New Business
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-lg hover:bg-gray-100">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <button onClick={() => navigate('/profile')} className="flex items-center gap-2">
          <Avatar name={`${user?.firstName} ${user?.lastName}`} src={user?.avatar} size="sm" />
        </button>
      </div>
    </header>
  )
}
