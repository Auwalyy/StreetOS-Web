import { useQuery } from '@tanstack/react-query'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAuthStore } from '../../store/authStore'
import { analyticsApi, aiApi } from '../../api/services'
import { Card, StatCard, ScoreRing, Spinner, Badge } from '../../components/ui'
import { useNavigate } from 'react-router-dom'

function NoBusiness() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="text-6xl mb-4">🏪</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">No Business Selected</h2>
      <p className="text-gray-500 mb-6">Create or select a business to view your dashboard</p>
      <button onClick={() => navigate('/businesses/new')} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors">
        Create Business
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { currentBusiness } = useAuthStore()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics-dashboard', currentBusiness?._id],
    queryFn: () => analyticsApi.getDashboard(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: chart } = useQuery({
    queryKey: ['revenue-chart', currentBusiness?._id],
    queryFn: () => analyticsApi.getRevenueChart(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: health } = useQuery({
    queryKey: ['health-score', currentBusiness?._id],
    queryFn: () => analyticsApi.getHealthScore(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: advice } = useQuery({
    queryKey: ['ai-advice', currentBusiness?._id],
    queryFn: () => aiApi.getAdvice(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
    staleTime: 5 * 60 * 1000,
  })

  if (!currentBusiness) return <NoBusiness />
  if (statsLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  // Process chart data
  const chartData = []
  if (chart) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const map = {}
    chart.forEach(d => {
      const key = `${months[d._id.month - 1]} ${d._id.year}`
      if (!map[key]) map[key] = { name: key, revenue: 0, expenses: 0 }
      if (d._id.type === 'sale') map[key].revenue = d.total
      if (d._id.type === 'expense') map[key].expenses = d.total
    })
    Object.values(map).slice(-6).forEach(v => chartData.push(v))
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">{currentBusiness.name} · {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Revenue (This Month)" value={stats?.revenue || 0} change={stats?.revenueGrowth} icon={<span className="text-xl">💰</span>} color="green" prefix="₦" />
        <StatCard title="Expenses" value={stats?.expenses || 0} icon={<span className="text-xl">💸</span>} color="red" prefix="₦" />
        <StatCard title="Profit" value={stats?.profit || 0} icon={<span className="text-xl">📈</span>} color="orange" prefix="₦" />
        <StatCard title="Total Customers" value={stats?.customers || 0} icon={<span className="text-xl">👥</span>} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₦${v.toLocaleString()}`} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#f97316" fill="url(#rev)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="url(#exp)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Health Score */}
        <Card className="flex flex-col items-center">
          <h3 className="text-base font-semibold text-gray-900 mb-4 self-start">Business Health Score</h3>
          {health ? (
            <>
              <ScoreRing score={health.score} label="Overall Score" />
              <div className="mt-4 w-full space-y-2">
                {health.strengths?.slice(0, 2).map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-green-700 bg-green-50 p-2 rounded-lg">
                    <span>✅</span><span>{s}</span>
                  </div>
                ))}
                {health.weaknesses?.slice(0, 1).map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                    <span>⚠️</span><span>{w}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <Spinner />}
        </Card>
      </div>

      {/* AI Advisor + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Advice */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🤖</span>
            <h3 className="text-base font-semibold text-gray-900">AI Business Advisor</h3>
            <Badge color="orange">Powered by AI</Badge>
          </div>
          {advice ? (
            <div className="space-y-2">
              {advice.warnings?.map((w, i) => (
                <div key={i} className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-800">{w}</div>
              ))}
              {advice.recommendations?.slice(0, 2).map((r, i) => (
                <div key={i} className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">{r}</div>
              ))}
              {advice.opportunities?.slice(0, 1).map((o, i) => (
                <div key={i} className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">{o}</div>
              ))}
            </div>
          ) : <Spinner />}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '💳', label: 'Add Sale', to: '/transactions?new=sale' },
              { icon: '💸', label: 'Add Expense', to: '/transactions?new=expense' },
              { icon: '📒', label: 'Record Debt', to: '/debts?new=true' },
              { icon: '📦', label: 'Add Product', to: '/inventory?new=true' },
              { icon: '👤', label: 'Add Customer', to: '/customers?new=true' },
              { icon: '🎯', label: 'Set Goal', to: '/savings?new=goal' },
            ].map(a => (
              <a key={a.to} href={a.to} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-orange-50 hover:text-orange-600 transition-colors text-center">
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-medium text-gray-700">{a.label}</span>
              </a>
            ))}
          </div>
        </Card>
      </div>

      {/* Alerts Row */}
      {(stats?.lowStockCount > 0 || stats?.activeDebtBalance > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats?.lowStockCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-medium text-amber-800">{stats.lowStockCount} Low Stock Alert{stats.lowStockCount > 1 ? 's' : ''}</p>
                <a href="/inventory?filter=lowStock" className="text-xs text-amber-600 hover:underline">View products →</a>
              </div>
            </div>
          )}
          {stats?.activeDebtBalance > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <p className="font-medium text-red-800">₦{stats.activeDebtBalance.toLocaleString()} Outstanding Debts</p>
                <a href="/debts" className="text-xs text-red-600 hover:underline">View debts →</a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
