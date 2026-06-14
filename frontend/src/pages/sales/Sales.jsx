import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { salesApi } from '../../api/services'
import { Card, Badge, Spinner, EmptyState, Button } from '../../components/ui'
import { useNavigate } from 'react-router-dom'

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
]

const PAY_COLORS = { cash: 'green', transfer: 'blue', pos: 'purple', credit: 'red', opay: 'orange', moniepoint: 'blue', palmpay: 'green', other: 'gray' }

export default function Sales() {
  const { currentBusiness } = useAuthStore()
  const navigate = useNavigate()
  const bid = currentBusiness?._id
  const [period, setPeriod] = useState('today')
  const [page, setPage] = useState(1)

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['sales-summary', bid, period],
    queryFn: () => salesApi.getSummary(bid, { period }).then(r => r.data.data),
    enabled: !!bid,
  })

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales', bid, page],
    queryFn: () => salesApi.getSales(bid, { page, limit: 20 }).then(r => r.data),
    enabled: !!bid,
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const s = summary?.summary || {}
  const sales = salesData?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 text-sm">Track all your POS sales and revenue</p>
        </div>
        <Button onClick={() => navigate('/pos')}>⚡ New Sale</Button>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p.key ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {sumLoading ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Sales', value: s.totalSales || 0, icon: '🛒', color: 'text-blue-600' },
            { label: 'Revenue', value: fmt(s.totalRevenue), icon: '💰', color: 'text-orange-600' },
            { label: 'Profit', value: fmt(s.totalProfit), icon: '📈', color: 'text-green-600' },
            { label: 'Avg. Order', value: fmt(s.avgOrderValue), icon: '🎯', color: 'text-purple-600' },
          ].map(stat => (
            <Card key={stat.label} className="text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Staff Performance */}
      {summary?.staffPerformance?.length > 0 && (
        <Card>
          <p className="font-semibold text-gray-900 mb-3">👥 Staff Performance</p>
          <div className="space-y-2">
            {summary.staffPerformance.map((s, i) => (
              <div key={s._id} className="flex items-center gap-3">
                <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <span className="flex-1 text-sm font-medium text-gray-900">{s.name || 'Unknown'}</span>
                <span className="text-sm text-gray-500">{s.totalSales} sales</span>
                <span className="font-bold text-orange-600">{fmt(s.totalRevenue)}</span>
                <span className="text-xs text-green-600">{fmt(s.totalProfit)} profit</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Daily Breakdown */}
      {summary?.dailyBreakdown?.length > 0 && (
        <Card>
          <p className="font-semibold text-gray-900 mb-3">📅 Daily Breakdown</p>
          <div className="space-y-2">
            {summary.dailyBreakdown.slice(-7).map(d => (
              <div key={d._id} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-24">{new Date(d._id).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${Math.min(100, (d.revenue / (summary.summary?.totalRevenue || 1)) * 100 * summary.dailyBreakdown.length)}%` }} />
                </div>
                <span className="font-medium text-sm w-28 text-right">{fmt(d.revenue)}</span>
                <span className="text-xs text-green-600 w-20 text-right">{fmt(d.profit)}</span>
                <Badge color="gray">{d.count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sales List */}
      <Card padding={false}>
        <div className="p-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900">Recent Sales</p>
        </div>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
          : sales.length === 0 ? <EmptyState icon="🛒" title="No Sales Yet" description="Complete your first sale on the POS screen." action={<Button onClick={() => navigate('/pos')}>Go to POS</Button>} />
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Invoice', 'Customer', 'Items', 'Total', 'Profit', 'Payment', 'Status', 'Date', ''].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale._id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/invoice/${sale._id}`)}>
                        <td className="py-3 px-4 font-mono text-xs text-blue-600">{sale.invoiceNumber}</td>
                        <td className="py-3 px-4 font-medium">{sale.customerName || 'Walk-in'}</td>
                        <td className="py-3 px-4 text-gray-500">{sale.items?.length}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{fmt(sale.total)}</td>
                        <td className="py-3 px-4 text-green-600">{fmt(sale.totalProfit)}</td>
                        <td className="py-3 px-4"><Badge color={PAY_COLORS[sale.paymentMethod] || 'gray'}>{sale.paymentMethod}</Badge></td>
                        <td className="py-3 px-4"><Badge color={sale.paymentStatus === 'paid' ? 'green' : sale.paymentStatus === 'partial' ? 'yellow' : 'red'}>{sale.paymentStatus}</Badge></td>
                        <td className="py-3 px-4 text-xs text-gray-400">{new Date(sale.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4"><span className="text-orange-500 text-xs">View →</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        {salesData?.pagination && (
          <div className="p-4 flex justify-between items-center border-t border-gray-50">
            <span className="text-sm text-gray-500">{salesData.pagination.total} total sales</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
              <Button size="sm" variant="secondary" disabled={page >= salesData.pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
