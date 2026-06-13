import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { communityApi } from '../../api/services'
import { Button, Card, Modal, Input, Textarea, Avatar, Badge, EmptyState, Spinner } from '../../components/ui'

const typeColors = { discussion: 'blue', question: 'purple', success_story: 'green', announcement: 'orange', tip: 'yellow' }

function PostForm({ onClose }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [form, setForm] = useState({ title: '', content: '', type: 'discussion', category: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => communityApi.createPost(form),
    onSuccess: () => { qc.invalidateQueries(['posts']); toast.success('Post created!'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Title (optional)" placeholder="What's this about?" value={form.title} onChange={e => set('title', e.target.value)} />
      <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
        {['discussion', 'question', 'success_story', 'announcement', 'tip'].map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
      </Select>
      <Textarea label="Content *" placeholder="Share your thoughts, ask a question, or tell your story..." value={form.content} onChange={e => set('content', e.target.value)} required rows={5} />
      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Post</Button>
      </div>
    </form>
  )
}

function Select({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" {...props}>{children}</select>
    </div>
  )
}

export default function Community() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [activePost, setActivePost] = useState(null)
  const [comment, setComment] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['posts', typeFilter],
    queryFn: () => communityApi.getPosts({ type: typeFilter }).then(r => r.data),
  })

  const { mutate: likePost } = useMutation({
    mutationFn: (id) => communityApi.likePost(id),
    onSuccess: () => qc.invalidateQueries(['posts']),
  })

  const { mutate: addComment, isPending: commenting } = useMutation({
    mutationFn: (id) => communityApi.addComment(id, { content: comment }),
    onSuccess: () => { qc.invalidateQueries(['posts']); setComment(''); toast.success('Comment added') },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community 💬</h1>
          <p className="text-gray-500 text-sm">Connect, learn and grow with other business owners</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Post</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'All'], ['discussion', '💬 Discussion'], ['question', '❓ Questions'], ['success_story', '🏆 Success Stories'], ['tip', '💡 Tips']].map(([v, l]) => (
          <button key={v} onClick={() => setTypeFilter(v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === v ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : data?.data?.length === 0 ? (
            <EmptyState icon="💬" title="No Posts Yet" description="Be the first to start a conversation!" action={<Button onClick={() => setShowModal(true)}>Create Post</Button>} />
          ) : data?.data?.map(post => (
            <Card key={post._id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActivePost(post)}>
              <div className="flex items-start gap-3">
                <Avatar name={`${post.author?.firstName} ${post.author?.lastName}`} src={post.author?.avatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{post.author?.firstName} {post.author?.lastName}</span>
                    <Badge color={typeColors[post.type]}>{post.type.replace('_', ' ')}</Badge>
                    <span className="text-xs text-gray-400 ml-auto">{format(new Date(post.createdAt), 'dd MMM')}</span>
                  </div>
                  {post.title && <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>}
                  <p className="text-sm text-gray-600 line-clamp-3">{post.content}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <button onClick={(e) => { e.stopPropagation(); likePost(post._id) }} className="flex items-center gap-1 text-sm text-gray-400 hover:text-orange-500 transition-colors">
                      ❤️ {post.likes?.length || 0}
                    </button>
                    <span className="flex items-center gap-1 text-sm text-gray-400">
                      💬 {post.comments?.length || 0}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-gray-400">👁️ {post.views || 0}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Post Detail / Sidebar */}
        <div>
          {activePost ? (
            <Card>
              <button onClick={() => setActivePost(null)} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Back</button>
              <div className="flex items-center gap-2 mb-3">
                <Avatar name={`${activePost.author?.firstName}`} />
                <div>
                  <p className="text-sm font-medium">{activePost.author?.firstName} {activePost.author?.lastName}</p>
                  <p className="text-xs text-gray-400">{format(new Date(activePost.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>
              {activePost.title && <h3 className="font-semibold text-gray-900 mb-2">{activePost.title}</h3>}
              <p className="text-sm text-gray-600 mb-4">{activePost.content}</p>
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-gray-500 mb-3">{activePost.comments?.length} COMMENTS</p>
                {activePost.comments?.map((c, i) => (
                  <div key={i} className="flex gap-2 mb-3">
                    <Avatar name={`${c.author?.firstName}`} size="sm" />
                    <div className="flex-1 bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-medium text-gray-700">{c.author?.firstName}</p>
                      <p className="text-sm text-gray-600">{c.content}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                  <Button size="sm" onClick={() => addComment(activePost._id)} loading={commenting} disabled={!comment}>Post</Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <h3 className="font-semibold text-gray-900 mb-3">Community Tips</h3>
              <div className="space-y-3">
                {['Record every transaction, big or small', 'Check your health score weekly', 'Use debt reminders to get paid faster', 'Join the Adashe group to save collectively'].map((tip, i) => (
                  <div key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-orange-400 flex-shrink-0">•</span>{tip}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Post">
        <PostForm onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
