import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { customerApi } from '../../api/services'
import { Button, Card, Modal, Input, Badge, Avatar, Spinner, EmptyState } from '../../components/ui'

export default function CreditLimits() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [editCustomer, setEditCustomer] = useState(null)
  const [newLimit, setNewLimit] = useState('')
  const bid = currentBusiness?._id

  const { data, isLoading } = useQuery({
    queryKey: ['customers-credit', bid, search],
    queryFn: () => customerApi.getAll(bid, { search, limit: 50 }).then(r => r.data),
    enabled: !!bid,
  })

  const { mutate: updateLimit, isPending } = useMutation({
    mutationFn: () => customerApi.update(bid, editCustomer._id, { creditLimit: Number(newLimit) }),
    onSuccess: () => {
      qc.invalidateQueries(['customers-credit'])
      toast.success(`✅ Credit limit set to ₦${Number(newLimit).toLocaleString()} for ${editCustomer.name}`)
      setEditCustomer(null)
      setNewLimit('')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const { mutate: blockCustomer } = useMutation({
    mutationFn: (c) => customerApi.update(bid, c._id, { creditBlocked: !c.creditBlocked }),
    onSuccess: (_, c) => {
      qc.invalidateQueries(['customers-credit'])
      toast.success(c.creditBlocked ? `${c.name} unblocked` : `${c.name} blocked from credit`)
    },
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const customers = data?.data || []
  const totalCredit = customers.reduce((a, c) => a + (c.totalDebt || 0), 0)
  const blockedCount = customers.filter(c => c.creditBlocked).length
  const overLimitCount = customers.filter(c => c.creditLimit > 0 && c.totalDebt > c.creditLimit).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💳 Customer Credit Limits</h1>
        <p className="text-gray-500 text-sm">Manage bashi (credit) limits — get alerted when customers exceed their limit</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Outstanding Credit', value: `₦${totalCredit.toLocaleString()}`, color: 'text-red-600', bg: 'bg-red-50', icon: '💸' },
          { label: 'Customers with Credit', value: customers.filter(c => c.totalDebt > 0).length, color: 'text-orange-600', bg: 'bg-orange-50', icon: '👥' },
          { label: 'Over Limit', value: overLimitCount, color: 'text-red-700', bg: 'bg-red-100', icon: '🚨' },
          { label: 'Blocked', value: blockedCount, color: 'text-gray-700', bg: 'bg-gray-100', icon: '🔒' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <span>{s.icon}</span>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Over-limit alert */}
      {overLimitCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-bold text-red-800">{overLimitCount} customer{overLimitCount > 1 ? 's' : ''} over credit limit</p>
            <p className="text-sm text-red-600">These customers have exceeded their bashi limit. Consider collecting payment before new credit.</p>
          </div>
        </div>
      )}

      {/* Customer List */}
      <Card padding={false}>
        <div className="p-4 border-b border-gray-100">
          <input
            placeholder="Search customers..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
          : customers.length === 0 ? <EmptyState icon="👥" title="No customers yet" description="Add customers to manage credit limits" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Customer', 'Total Debt', 'Credit Limit', 'Used', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => {
                    const hasLimit = c.creditLimit > 0
                    const used = hasLimit ? Math.round((c.totalDebt / c.creditLimit) * 100) : null
                    const isOver = hasLimit && c.totalDebt > c.creditLimit
                    const isNear = hasLimit && !isOver && used >= 80
                    return (
                      <tr key={c._id} className={`border-b border-gray-50 hover:bg-gray-50 ${isOver ? 'bg-red-50' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={c.name} size="sm" />
                            <div>
                              <p className="font-medium text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-400">{c.phone || 'No phone'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${c.totalDebt > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            ₦{(c.totalDebt || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {hasLimit ? (
                            <span className="font-medium text-gray-700">₦{c.creditLimit.toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-300 italic text-xs">No limit set</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {hasLimit && used !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${isOver ? 'bg-red-500' : isNear ? 'bg-yellow-400' : 'bg-green-400'}`}
                                  style={{ width: `${Math.min(used, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${isOver ? 'text-red-600' : isNear ? 'text-yellow-600' : 'text-green-600'}`}>
                                {used}%
                              </span>
                            </div>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          {c.creditBlocked ? <Badge color="red" label="🔒 Blocked" />
                            : isOver ? <Badge color="red" label="Over Limit" />
                              : isNear ? <Badge color="yellow" label="Near Limit" />
                                : c.totalDebt > 0 ? <Badge color="orange" label="Has Debt" />
                                  : <Badge color="green" label="Clear" />}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setEditCustomer(c); setNewLimit(c.creditLimit || '') }}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                            >
                              Set Limit
                            </button>
                            <button
                              onClick={() => blockCustomer(c)}
                              className={`px-2 py-1 text-xs rounded ${c.creditBlocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                              {c.creditBlocked ? 'Unblock' : 'Block'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      {/* Set Limit Modal */}
      <Modal open={!!editCustomer} onClose={() => { setEditCustomer(null); setNewLimit('') }} title="Set Credit Limit" size="sm">
        {editCustomer && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
              <Avatar name={editCustomer.name} />
              <div>
                <p className="font-bold text-gray-900">{editCustomer.name}</p>
                <p className="text-sm text-red-500">Current debt: ₦{(editCustomer.totalDebt || 0).toLocaleString()}</p>
              </div>
            </div>
            <Input
              label="Maximum Credit Limit (₦)"
              type="number"
              value={newLimit}
              onChange={e => setNewLimit(e.target.value)}
              placeholder="e.g. 50000"
              min="0"
            />
            <p className="text-xs text-gray-400">
              Set to 0 to remove the limit. The system will warn you during POS when this customer exceeds their limit.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setEditCustomer(null); setNewLimit('') }}>Cancel</Button>
              <Button className="flex-1" loading={isPending} onClick={() => updateLimit()}>Save Limit</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
