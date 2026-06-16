import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { salesApi } from '../../api/services'
import { Button, Card, Badge, EmptyState, Spinner } from '../../components/ui'

const STATUS_COLORS = { paid: 'green', pending: 'red', partial: 'yellow' }

function shareWhatsApp(sale, bizName) {
  const items = sale.products?.map(p => `  - ${p.name} x${p.quantity} = \u20a6${p.total?.toLocaleString()}`).join('\n')
  const msg = [
    `\ud83e\udfe7 *RECEIPT from ${bizName}*`,
    `Receipt: #${sale._id?.slice(-8).toUpperCase()}`,
    `Date: ${format(new Date(sale.createdAt), 'dd MMM yyyy, HH:mm')}`,
    ``,
    items,
    ``,
    `*TOTAL: \u20a6${sale.total?.toLocaleString()}*`,
    `Payment: ${sale.paymentMethod?.toUpperCase()}`,
    `_Thank you! Powered by StreetOS AI_`,
  ].filter(Boolean).join('\n')
  const phone = sale.customer?.phone?.replace(/[^0-9]/g, '')
  const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
  window.open(url, '_blank')
}

export default function Sales() {
  const { currentBusiness } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filter, setFilter] = useState({ page: 1, status: '', search: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['sales', currentBusiness?._id, filter],
    queryFn: () => salesApi.getSales(currentBusiness._id, filter).then(r => r.data),
    enabled: !!currentBusiness,
  })

  const { data: summary } = useQuery({
    queryKey: ['sales-summary', currentBusiness?._id],
    queryFn: () => salesApi.getSummary(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { mutate: voidSale } = useMutation({
    mutationFn: (id) => salesApi.voidSale(currentBusiness._id, id),
    onSuccess: () => { qc.invalidateQueries(['sales']); toast.success('Sale voided') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const sales = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💳 Sales History</h1>
          <p className="text-gray-500 text-sm">{data?.pagination?.total || 0} total sales</p>
        </div>
        <Button onClick={() => navigate('/pos')}>⚡ New Sale</Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Today's Revenue", value: `₦${(summary.todayRevenue || 0).toLocaleString()}`, bg: 'bg-green-50', color: 'text-green-700' },
            { label: "This Month", value: `₦${(summary.monthRevenue || 0).toLocaleString()}`, bg: 'bg-orange-50', color: 'text-orange-700' },
            { label: "Pending Payments", value: `₦${(summary.pendingAmount || 0).toLocaleString()}`, bg: 'bg-red-50', color: 'text-red-700' },
            { label: "Total Sales", value: summary.totalCount || 0, bg: 'bg-blue-50', color: 'text-blue-700' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl p-4`}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <Card padding={false}>
        {/* Filters */}
        <div className="p-4 flex flex-wrap gap-3 border-b border-gray-100">
          <input
            placeholder="Search sale ID or customer..."
            className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value, page: 1 }))}
          />
          <div className="flex gap-2">
            {['', 'paid', 'pending', 'partial'].map(s => (
              <button key={s} onClick={() => setFilter(f => ({ ...f, status: s, page: 1 }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter.status === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
          : sales.length === 0 ? (
            <EmptyState icon="💳" title="No Sales Yet" description="Complete your first sale from the POS." action={<Button onClick={() => navigate('/pos')}>Go to POS</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Date', 'Sale ID', 'Customer', 'Items', 'Total', 'Paid', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500 text-xs">{format(new Date(s.createdAt), 'dd MMM HH:mm')}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-600">#{s._id?.slice(-8).toUpperCase()}</td>
                      <td className="py-3 px-4 text-gray-700">{s.customer?.name || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{s.products?.length} item{s.products?.length !== 1 ? 's' : ''}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">₦{s.total?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-gray-600">₦{s.amountPaid?.toLocaleString()}</td>
                      <td className="py-3 px-4"><Badge color={STATUS_COLORS[s.paymentStatus]}>{s.paymentStatus}</Badge></td>
                      <td className="py-3 px-4">
                          <div className="flex gap-1">
                          <button onClick={() => navigate(`/invoice/${s._id}`)} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Receipt</button>
                          <button onClick={() => shareWhatsApp(s, currentBusiness?.name)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">📱 WA</button>
                          {s.paymentStatus !== 'void' && (
                            <button onClick={() => { if (confirm('Void this sale?')) voidSale(s._id) }} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">Void</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data?.pagination && (
                <div className="flex items-center justify-between p-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">{data.pagination.total} total sales</p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" disabled={filter.page <= 1} onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}>Previous</Button>
                    <Button variant="secondary" size="sm" disabled={filter.page >= data.pagination.pages} onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
      </Card>
    </div>
  )
}
