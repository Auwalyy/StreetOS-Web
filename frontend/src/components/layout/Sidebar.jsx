import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/services'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/pos', icon: '⚡', label: 'POS Checkout' },
  { to: '/sales', icon: '🛒', label: 'Sales' },
  { to: '/inventory', icon: '📦', label: 'Inventory' },
  { to: '/purchase-orders', icon: '📋', label: 'Purchase Orders' },
  { to: '/transactions', icon: '💳', label: 'Transactions' },
  { to: '/customers', icon: '👥', label: 'Customers' },
  { to: '/debts', icon: '📒', label: 'Debt Book' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/savings', icon: '🏦', label: 'Savings' },
  { to: '/employees', icon: '👷', label: 'Employees' },
  { to: '/suppliers', icon: '🚚', label: 'Suppliers' },
  { to: '/ai-advisor', icon: '🤖', label: 'AI Advisor' },
  { to: '/adashe', icon: '🤝', label: 'Adashe/Esusu' },
  { to: '/associations', icon: '🏛️', label: 'Associations' },
  { to: '/community', icon: '💬', label: 'Community' },
  { to: '/marketplace', icon: '🏦', label: 'Credit Marketplace' },
  { to: '/market-intelligence', icon: '📈', label: 'Market Intel' },
  { to: '/learning', icon: '📚', label: 'Learning Center' },
  { to: '/documents', icon: '📄', label: 'Documents' },
  { to: '/agents', icon: '🤝', label: 'Agent Network' },
]

const adminItems = [
  { to: '/admin', icon: '⚙️', label: 'Admin Panel' },
]

export default function Sidebar({ open, onClose }) {
  const { user, currentBusiness, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out')
  }

  const isAdmin = ['admin', 'super_admin'].includes(user?.role)

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-30 flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-lg font-bold">S</div>
            <div>
              <p className="font-bold text-white leading-tight">StreetOS AI</p>
              <p className="text-xs text-gray-400 leading-tight truncate max-w-[140px]">{currentBusiness?.name || 'Select Business'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1">
                <p className="px-3 text-xs text-gray-600 uppercase tracking-wider font-medium">Admin</p>
              </div>
              {adminItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors" title="Logout">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
