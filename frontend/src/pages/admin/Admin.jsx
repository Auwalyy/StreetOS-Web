import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { adminApi } from '../../api/services'
import { Card, Button, Avatar, Badge, Spinner, StatCard, Table } from '../../components/ui'

export default function Admin() {
  const [tab, setTab] = useState('dashboard')
  const [userSearch, setUserSearch] = useState('')
  const [bizSearch, setBizSearch] = useState('')
  const qc = useQueryClient()

  const { data: dash } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then(r => r.data.data),
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', userSearch],
    queryFn: () => adminApi.getUsers({ search: userSearch }).then(r => r.data),
    enabled: tab === 'users',
  })

  const { data: businesses, isLoading: bizLoading } = useQuery({
    queryKey: ['admin-businesses', bizSearch],
    queryFn: () => adminApi.getBusinesses({ search: bizSearch }).then(r => r.data),
    enabled: tab === 'businesses',
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: () => adminApi.getAuditLogs().then(r => r.data),
    enabled: tab === 'logs',
  })

  const { mutate: toggleUser } = useMutation({
    mutationFn: (id) => adminApi.toggleUserStatus(id),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('User status updated') },
  })

  const roleColors = { trader: 'orange', artisan: 'blue', business_owner: 'green', admin: 'red', super_admin: 'purple', agent: 'yellow' }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Admin Panel</h1>
        <p className="text-gray-500 text-sm">Platform management and oversight</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[['dashboard', '📊 Dashboard'], ['users', '👥 Users'], ['businesses', '🏪 Businesses'], ['logs', '📋 Audit Logs']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>{l}</button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={dash?.users || 0} icon={<span className="text-xl">👥</span>} color="orange" />
            <StatCard title="Businesses" value={dash?.businesses || 0} icon={<span className="text-xl">🏪</span>} color="blue" />
            <StatCard title="Transactions" value={dash?.transactions || 0} icon={<span className="text-xl">💳</span>} color="green" />
            <StatCard title="Platform Health" value="98%" icon={<span className="text-xl">💚</span>} color="purple" />
          </div>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Recent Users</h3>
            <div className="divide-y divide-gray-50">
              {dash?.recentUsers?.map(u => (
                <div key={u._id} className="flex items-center gap-3 py-3">
                  <Avatar name={`${u.firstName} ${u.lastName}`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                    <p className="text-sm text-gray-400">{u.email}</p>
                  </div>
                  <Badge color={roleColors[u.role] || 'gray'}>{u.role?.replace('_', ' ')}</Badge>
                  <span className="text-xs text-gray-400">{format(new Date(u.createdAt), 'dd MMM')}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100">
            <input placeholder="Search users..." className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          </div>
          {usersLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h, i) => (
                      <th key={i} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users?.data?.map(u => (
                    <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                          <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{u.email}</td>
                      <td className="py-3 px-4"><Badge color={roleColors[u.role] || 'gray'}>{u.role?.replace('_', ' ')}</Badge></td>
                      <td className="py-3 px-4"><Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="py-3 px-4 text-gray-400">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => toggleUser(u._id)} className={`text-xs px-2 py-1 rounded-lg transition-colors ${u.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Businesses Tab */}
      {tab === 'businesses' && (
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100">
            <input placeholder="Search businesses..." className="w-full max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={bizSearch} onChange={e => setBizSearch(e.target.value)} />
          </div>
          {bizLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Business', 'Owner', 'Category', 'Verified', 'Created'].map((h, i) => (
                      <th key={i} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {businesses?.data?.map(b => (
                    <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{b.name}</td>
                      <td className="py-3 px-4 text-gray-500">{b.owner?.firstName} {b.owner?.lastName}</td>
                      <td className="py-3 px-4"><Badge color="blue">{b.category?.replace('_', ' ')}</Badge></td>
                      <td className="py-3 px-4"><Badge color={b.isVerified ? 'green' : 'gray'}>{b.isVerified ? 'Verified' : 'Unverified'}</Badge></td>
                      <td className="py-3 px-4 text-gray-400">{format(new Date(b.createdAt), 'dd MMM yyyy')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Audit Logs Tab */}
      {tab === 'logs' && (
        <Card padding={false}>
          {logsLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Time', 'User', 'Action', 'Resource', 'IP', 'Status'].map((h, i) => (
                      <th key={i} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs?.data?.map(l => (
                    <tr key={l._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-400 text-xs">{format(new Date(l.createdAt), 'dd MMM HH:mm')}</td>
                      <td className="py-3 px-4 text-gray-600">{l.user?.email || 'System'}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{l.action}</td>
                      <td className="py-3 px-4 text-gray-500">{l.resource}</td>
                      <td className="py-3 px-4 text-gray-400">{l.ip}</td>
                      <td className="py-3 px-4"><Badge color={l.status === 'success' ? 'green' : 'red'}>{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
