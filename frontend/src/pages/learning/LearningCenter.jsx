import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { learningApi } from '../../api/services'
import { Card, Badge, Spinner, EmptyState, Button, Modal } from '../../components/ui'

const typeIcons = { article: '📄', video: '🎥', audio: '🎧', infographic: '🖼️' }
const categoryColors = { record_keeping: 'blue', marketing: 'orange', inventory: 'green', loan_readiness: 'purple', savings: 'yellow', pricing: 'red', general: 'gray' }

function ContentViewer({ item, onClose }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge color={categoryColors[item.category]}>{item.category.replace('_', ' ')}</Badge>
        <Badge color="gray">{item.type}</Badge>
        <Badge color="blue">{item.level}</Badge>
        {item.readTime && <span className="text-xs text-gray-400">📖 {item.readTime} min read</span>}
        <span className="text-xs text-gray-400">👁️ {item.views} views</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900">{item.title}</h2>
      {item.description && <p className="text-gray-500 text-sm">{item.description}</p>}
      {item.videoUrl && (
        <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
          <iframe src={item.videoUrl} className="w-full h-full rounded-xl" allowFullScreen />
        </div>
      )}
      {item.content && (
        <div className="prose prose-sm max-w-none">
          {item.content.split('\n').map((line, i) => (
            <p key={i} className={`${line.startsWith('•') ? 'ml-4' : ''} text-gray-700 mb-2`}>{line || <br />}</p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LearningCenter() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [category, setCategory] = useState('')
  const [type, setType] = useState('')
  const [level, setLevel] = useState('')
  const [selected, setSelected] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['learning', category, type, level],
    queryFn: () => learningApi.getAll({ category, type, level, limit: 20 }).then(r => r.data),
  })

  const { data: fullItem } = useQuery({
    queryKey: ['learning-item', selected?._id],
    queryFn: () => learningApi.get(selected._id).then(r => r.data.data),
    enabled: !!selected,
  })

  const { mutate: likeItem } = useMutation({
    mutationFn: (id) => learningApi.like(id),
    onSuccess: () => qc.invalidateQueries(['learning']),
  })

  const categories = [
    ['', 'All Topics'],
    ['record_keeping', '📒 Record Keeping'],
    ['marketing', '📣 Marketing'],
    ['inventory', '📦 Inventory'],
    ['loan_readiness', '🏦 Loan Readiness'],
    ['savings', '💰 Savings'],
    ['pricing', '💲 Pricing'],
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📚 Business Learning Center</h1>
        <p className="text-gray-500 text-sm">Grow your business knowledge — articles, videos and audio lessons</p>
      </div>

      {/* Featured Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl p-6 text-white">
        <p className="text-sm opacity-80 mb-1">Featured Learning Path</p>
        <h2 className="text-xl font-bold mb-2">🎓 From Street Trader to Business Owner</h2>
        <p className="opacity-90 text-sm">Master the basics of record keeping, pricing, inventory and loan readiness in 6 lessons.</p>
        <button onClick={() => setCategory('record_keeping')} className="mt-3 bg-white text-orange-500 px-4 py-2 rounded-lg font-medium text-sm hover:bg-orange-50 transition-colors">Start Learning →</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(([v, l]) => (
          <button key={v} onClick={() => setCategory(v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${category === v ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['', 'All Formats'], ['article', '📄 Articles'], ['video', '🎥 Videos'], ['audio', '🎧 Audio']].map(([v, l]) => (
          <button key={v} onClick={() => setType(v)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${type === v ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
        ))}
        {[['', 'All Levels'], ['beginner', '🟢 Beginner'], ['intermediate', '🟡 Intermediate'], ['advanced', '🔴 Advanced']].map(([v, l]) => (
          <button key={v} onClick={() => setLevel(v)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${level === v ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : data?.data?.length === 0 ? (
        <EmptyState icon="📚" title="No Content Found" description="Check back soon for more learning resources." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data?.map(item => (
            <Card key={item._id} className="cursor-pointer hover:shadow-md transition-all group" onClick={() => setSelected(item)} padding={false}>
              {/* Thumbnail */}
              <div className={`h-32 rounded-t-xl flex items-center justify-center text-5xl ${
                item.category === 'record_keeping' ? 'bg-blue-50' :
                item.category === 'marketing' ? 'bg-orange-50' :
                item.category === 'loan_readiness' ? 'bg-purple-50' :
                item.category === 'savings' ? 'bg-yellow-50' : 'bg-green-50'
              }`}>
                {typeIcons[item.type]}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge color={categoryColors[item.category]}>{item.category.replace('_', ' ')}</Badge>
                  {item.isFeatured && <Badge color="orange">Featured</Badge>}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-orange-600 transition-colors line-clamp-2">{item.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {item.readTime && <span>📖 {item.readTime} min</span>}
                    <span>👁️ {item.views}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); likeItem(item._id) }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                    ❤️ {item.likes?.length || 0}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Content Viewer Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Learning Center" size="lg">
        {fullItem ? <ContentViewer item={fullItem} onClose={() => setSelected(null)} /> : <div className="flex justify-center py-8"><Spinner /></div>}
      </Modal>
    </div>
  )
}
