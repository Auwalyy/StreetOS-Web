import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useAuthStore } from '../../store/authStore'
import { analyticsApi } from '../../api/services'
import { Card, ScoreRing, Badge, Spinner } from '../../components/ui'

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899']

export default function Analytics() {
  const { currentBusiness } = useAuthStore()
  const [period, setPeriod] = useState('monthly')

  const { data: dashboard } = useQuery({
    queryKey: ['analytics-dashboard', currentBusiness?._id],
    queryFn: () => analyticsApi.getDashboard(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: chart, isLoading: chartLoading } = useQuery({
    queryKey: ['revenue-chart', currentBusiness?._id, period],
    queryFn: () => analyticsApi.getRevenueChart(currentBusiness._id, { period }).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', currentBusiness?._id],
    queryFn: () => analyticsApi.getTopProducts(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: health } = useQuery({
    queryKey: ['health-score', currentBusiness?._id],
    queryFn: () => analyticsApi.getHealthScore(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const chartData = []
  if (chart) {
    const map = {}
    chart.forEach(d => {
      const key = period === 'yearly' ? String(d._id.year) : `${months[d._id.month - 1]}`
      if (!map[key]) map[key] = { name: key, revenue: 0, expenses: 0 }
      if (d._id.type === 'sale') map[key].revenue = d.total
      if (d._id.type === 'expense') map[key].expenses = d.total
    })
    Object.values(map).forEach(v => chartData.push(v))
  }

  const profitData = chartData.map(d => ({ ...d, profit: d.revenue - d.expenses }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm">Detailed business performance insights</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: dashboard?.revenue || 0, color: 'text-green-600', bg: 'bg-green-50', icon: '💰' },
          { label: 'Expenses', value: dashboard?.expenses || 0, color: 'text-red-500', bg: 'bg-red-50', icon: '💸' },
          { label: 'Net Profit', value: dashboard?.profit || 0, color: 'text-orange-600', bg: 'bg-orange-50', icon: '📈' },
          { label: 'Customers', value: dashboard?.customers || 0, color: 'text-blue-600', bg: 'bg-blue-50', icon: '👥', isCount: true },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{k.icon}</span>
            </div>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.isCount ? k.value : `₦${k.value.toLocaleString()}`}</p>
          </div>
        ))}
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {['daily', 'weekly', 'monthly', 'yearly'].map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${period === p ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue & Expenses</h3>
          {chartLoading ? <div className="flex justify-center py-8"><Spinner /></div> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₦${v.toLocaleString()}`} />
                <Bar dataKey="revenue" name="Revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Profit Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₦${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          {topProducts?.length > 0 ? (
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((p, i) => {
                const max = topProducts[0].totalRevenue
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{p._id || 'Unknown'}</span>
                        <span className="text-sm font-semibold text-gray-900">₦{p.totalRevenue.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(p.totalRevenue / max) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-gray-400 text-sm text-center py-8">No product data yet</p>}
        </Card>

        {/* Health Score */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Business Health</h3>
          {health ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <ScoreRing score={health.score} label="Health Score" />
              </div>
              <div className="space-y-2">
                {health.recommendations?.slice(0, 3).map((r, i) => (
                  <div key={i} className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg flex items-start gap-2">
                    <span>💡</span><span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <Spinner />}
        </Card>
      </div>
    </div>
  )
}
