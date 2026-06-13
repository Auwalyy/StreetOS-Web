import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { marketApi } from '../../api/services'
import { Card, Badge, Spinner, Input } from '../../components/ui'

const trendColors = { rising: 'red', falling: 'green', stable: 'blue' }
const trendIcons = { rising: '📈', falling: '📉', stable: '➡️' }
const demandColors = { high: 'green', medium: 'yellow', low: 'gray' }

export default function MarketIntelligence() {
  const { currentBusiness } = useAuthStore()
  const [tab, setTab] = useState('prices')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['market-prices', search, category],
    queryFn: () => marketApi.getPrices({ search, category }).then(r => r.data.data),
  })

  const { data: trends } = useQuery({
    queryKey: ['market-trends'],
    queryFn: () => marketApi.getTrends().then(r => r.data.data),
  })

  const { data: intelligence } = useQuery({
    queryKey: ['market-intelligence', currentBusiness?._id],
    queryFn: () => marketApi.getIntelligence(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness && tab === 'intelligence',
  })

  const categories = ['grains', 'vegetables', 'oil', 'food', 'fashion', 'building', 'fuel', 'electronics']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Market Intelligence</h1>
        <p className="text-gray-500 text-sm">Real-time market prices, trends and demand predictions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[['prices', '💰 Price Board'], ['trends', '📈 Trends'], ['intelligence', '🧠 Business Intelligence'], ['demand', '🔮 Demand Predictions']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>{l}</button>
        ))}
      </div>

      {/* Price Board Tab */}
      {tab === 'prices' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input placeholder="Search product..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          {pricesLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {prices?.map(p => (
                <Card key={p._id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{p.product}</p>
                      <p className="text-xs text-gray-400 capitalize">{p.category} · per {p.unit}</p>
                    </div>
                    <span className="text-xl">{trendIcons[p.trend]}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₦{p.currentPrice.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge color={trendColors[p.trend]}>{p.trend} {p.trendPercentage > 0 ? `+${p.trendPercentage}%` : ''}</Badge>
                    <Badge color={demandColors[p.demand]}>{p.demand} demand</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">📍 {p.location?.city}, {p.location?.state}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {tab === 'trends' && trends && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">📈 <span>Rising Prices</span></h3>
            <div className="space-y-3">
              {trends.rising?.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.product}</p>
                    <p className="text-xs text-gray-400">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">+{p.trendPercentage}%</p>
                    <p className="text-xs text-gray-500">₦{p.currentPrice.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">🔥 <span>High Demand</span></h3>
            <div className="space-y-3">
              {trends.highDemand?.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.product}</p>
                    <p className="text-xs text-gray-400">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <Badge color="green">High Demand</Badge>
                    <p className="text-xs text-gray-500 mt-1">₦{p.currentPrice.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">💡 <span>Market Tips</span></h3>
            <div className="space-y-3 text-sm">
              {[
                'Rice prices are rising — consider stocking up now before prices increase further.',
                'Tomatoes have high demand this season due to festive cooking.',
                'Cooking gas consistently sells well — a reliable product to stock.',
                'Monitor your pricing against the market board regularly.',
              ].map((tip, i) => (
                <div key={i} className="p-3 bg-orange-50 rounded-xl text-orange-800">{tip}</div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Business Intelligence Tab */}
      {tab === 'intelligence' && (
        <div className="space-y-6">
          {!currentBusiness ? (
            <p className="text-gray-400 text-center py-8">Select a business to see personalized intelligence</p>
          ) : !intelligence ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">🏆 Your Top Products</h3>
                {intelligence.topProducts?.length > 0 ? intelligence.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-orange-500 font-bold w-5">#{i + 1}</span>
                      <p className="text-sm font-medium text-gray-800">{p._id || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₦{p.totalRevenue?.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{p.totalSold} units sold</p>
                    </div>
                  </div>
                )) : <p className="text-gray-400 text-sm text-center py-4">No sales data yet. Start recording transactions!</p>}
              </Card>

              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">🗓️ Seasonal Opportunities</h3>
                <div className="space-y-3">
                  {intelligence.seasonalOpportunities?.map((s, i) => (
                    <div key={i} className="p-3 bg-green-50 border border-green-100 rounded-xl">
                      <p className="font-medium text-green-800">{s.product}</p>
                      <p className="text-sm text-green-600">{s.reason}</p>
                      <p className="text-xs text-green-500 mt-1">Expected demand increase: <strong>{s.expectedIncrease}</strong></p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Demand Predictions Tab */}
      {tab === 'demand' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">🔮 Demand Forecast — Next 30 Days</h3>
            <div className="space-y-3">
              {[
                { product: 'Rice & Grains', forecast: 'Very High', reason: 'Approaching festive period', confidence: 90 },
                { product: 'Cooking Oil', forecast: 'High', reason: 'Steady household demand', confidence: 80 },
                { product: 'Tomatoes & Peppers', forecast: 'High', reason: 'Soup cooking season', confidence: 75 },
                { product: 'Children\'s Clothing', forecast: 'Medium-High', reason: 'School resumption period', confidence: 65 },
                { product: 'Electronics/Phones', forecast: 'Medium', reason: 'Regular tech replacement cycle', confidence: 55 },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{f.product}</p>
                    <p className="text-xs text-gray-400">{f.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{f.forecast}</p>
                    <p className="text-xs text-gray-400">{f.confidence}% confidence</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">📅 Seasonal Calendar</h3>
            <div className="space-y-3">
              {[
                { months: 'Jan – Feb', events: 'New Year Sales, Valentine\'s', products: 'Clothes, Gifts, Food' },
                { months: 'Mar – Apr', events: 'Easter Season', products: 'Fabrics, Food, Travel' },
                { months: 'May – Jul', events: 'Mid-year, Sallah', products: 'Ram, Food, Fashion' },
                { months: 'Aug – Sep', events: 'Back to School', products: 'School Items, Uniforms' },
                { months: 'Oct – Dec', events: 'Christmas & End of Year', products: 'Everything increases' },
              ].map((s, i) => (
                <div key={i} className="p-3 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-orange-500">{s.months}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-600">{s.events}</span>
                  </div>
                  <p className="text-xs text-gray-400">📦 {s.products}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
