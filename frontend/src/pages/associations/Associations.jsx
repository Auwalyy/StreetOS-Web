import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { associationApi } from '../../api/services'
import { useAuthStore } from '../../store/authStore'
import { Button, Card, Modal, Input, Select, Textarea, Badge, Avatar, EmptyState, Spinner } from '../../components/ui'

function AssociationForm({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', type: 'market', description: '', location: { city: '', state: '' }, membershipFee: '', feeFrequency: 'monthly' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => associationApi.create({ ...form, membershipFee: Number(form.membershipFee) }),
    onSuccess: () => { qc.invalidateQueries(['associations']); toast.success('Association created!'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Association Name *" placeholder="e.g. Lagos Market Women Association" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
        <option value="market">Market Association</option>
        <option value="trade">Trade Union</option>
        <option value="cooperative">Cooperative</option>
        <option value="community">Community Group</option>
        <option value="other">Other</option>
      </Select>
      <Textarea label="Description" placeholder="What is this association about?" value={form.description} onChange={e => set('description', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="City" value={form.location.city} onChange={e => setForm(f => ({ ...f, location: { ...f.location, city: e.target.value } }))} />
        <Input label="State" value={form.location.state} onChange={e => setForm(f => ({ ...f, location: { ...f.location, state: e.target.value } }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Membership Fee (₦)" type="number" value={form.membershipFee} onChange={e => set('membershipFee', e.target.value)} min="0" />
        <Select label="Fee Frequency" value={form.feeFrequency} onChange={e => set('feeFrequency', e.target.value)}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="one_time">One Time</option>
        </Select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Create Association</Button>
      </div>
    </form>
  )
}

function AnnouncementForm({ assocId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', content: '', priority: 'normal' })

  const { mutate, isPending } = useMutation({
    mutationFn: () => associationApi.addAnnouncement(assocId, form),
    onSuccess: () => { qc.invalidateQueries(['association-detail', assocId]); toast.success('Announcement posted!'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Title *" placeholder="Announcement title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
      <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
        <option value="normal">Normal</option>
        <option value="important">Important</option>
        <option value="urgent">Urgent</option>
      </Select>
      <Textarea label="Content *" placeholder="Write your announcement..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required rows={4} />
      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Post</Button>
      </div>
    </form>
  )
}

const priorityColors = { normal: 'blue', important: 'orange', urgent: 'red' }
const typeColors = { market: 'orange', trade: 'blue', cooperative: 'green', community: 'purple', other: 'gray' }

export default function Associations() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showAnnounce, setShowAnnounce] = useState(false)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('all')

  const { data: all, isLoading: allLoading } = useQuery({
    queryKey: ['associations'],
    queryFn: () => associationApi.getAll().then(r => r.data),
    enabled: tab === 'all',
  })

  const { data: mine, isLoading: mineLoading } = useQuery({
    queryKey: ['my-associations'],
    queryFn: () => associationApi.getMine().then(r => r.data.data),
    enabled: tab === 'mine',
  })

  const { data: detail } = useQuery({
    queryKey: ['association-detail', selected?._id],
    queryFn: () => associationApi.get(selected._id).then(r => r.data.data),
    enabled: !!selected,
  })

  const { mutate: join } = useMutation({
    mutationFn: (id) => associationApi.join(id),
    onSuccess: () => { qc.invalidateQueries(['associations']); qc.invalidateQueries(['my-associations']); toast.success('Joined association!') },
    onError: (e) => toast.error(e.response?.data?.message || 'Already a member'),
  })

  const { mutate: recordFee, isPending: recordingFee } = useMutation({
    mutationFn: ({ id, memberId }) => associationApi.recordFee(id, { memberId }),
    onSuccess: () => { qc.invalidateQueries(['association-detail', selected?._id]); toast.success('Fee recorded') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const associations = tab === 'mine' ? (mine || []) : (all?.data || [])
  const isLoading = tab === 'mine' ? mineLoading : allLoading

  const isLeader = (a) => a.leader?._id === user?._id || a.leader === user?._id
  const isMember = (a) => a.members?.some(m => m.user === user?._id || m.user?._id === user?._id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏛️ Market Associations</h1>
          <p className="text-gray-500 text-sm">Join or create a market association</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ Create Association</Button>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[['all', '🌍 All Associations'], ['mine', '👤 My Associations']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>{l}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className={selected ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : associations.length === 0 ? (
            <EmptyState icon="🏛️" title="No Associations Found" description="Create or join a market association." action={<Button onClick={() => setShowCreate(true)}>Create Association</Button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {associations.map(a => (
                <Card key={a._id} className={`cursor-pointer hover:shadow-md transition-shadow ${selected?._id === a._id ? 'ring-2 ring-orange-400' : ''}`} onClick={() => setSelected(a)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{a.name}</p>
                      <Badge color={typeColors[a.type]}>{a.type}</Badge>
                    </div>
                    {isLeader(a) && <Badge color="orange">Leader</Badge>}
                    {!isLeader(a) && isMember(a) && <Badge color="green">Member</Badge>}
                  </div>
                  {a.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{a.description}</p>}
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="bg-gray-50 p-2 rounded-lg">
                      <p className="text-xs text-gray-400">Members</p>
                      <p className="font-semibold text-gray-900">{a.members?.length || 0}</p>
                    </div>
                    <div className="bg-orange-50 p-2 rounded-lg">
                      <p className="text-xs text-gray-400">Fee</p>
                      <p className="font-semibold text-orange-600">{a.membershipFee > 0 ? `₦${a.membershipFee.toLocaleString()}` : 'Free'}</p>
                    </div>
                  </div>
                  {a.location?.city && <p className="text-xs text-gray-400">📍 {a.location.city}, {a.location.state}</p>}
                  {!isMember(a) && !isLeader(a) && (
                    <Button size="sm" className="w-full mt-3" onClick={(e) => { e.stopPropagation(); join(a._id) }}>Join Association</Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && detail && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{detail.name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>

            {isLeader(detail) && (
              <Button size="sm" variant="secondary" className="w-full mb-4" onClick={() => setShowAnnounce(true)}>
                📢 Post Announcement
              </Button>
            )}

            {/* Announcements */}
            {detail.announcements?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Announcements</p>
                <div className="space-y-2">
                  {detail.announcements.slice(0, 3).map((ann, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${ann.priority === 'urgent' ? 'bg-red-50 border-red-100' : ann.priority === 'important' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-800">{ann.title}</p>
                        <Badge color={priorityColors[ann.priority]}>{ann.priority}</Badge>
                      </div>
                      <p className="text-xs text-gray-600">{ann.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{format(new Date(ann.createdAt), 'dd MMM yyyy')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Members ({detail.members?.length})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detail.members?.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <Avatar name={m.user?.firstName ? `${m.user.firstName} ${m.user.lastName}` : 'Member'} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{m.user?.firstName} {m.user?.lastName}</p>
                        <p className="text-xs text-gray-400 capitalize">{m.role || 'member'}</p>
                      </div>
                    </div>
                    {isLeader(detail) && detail.membershipFee > 0 && (
                      <button
                        onClick={() => recordFee({ id: detail._id, memberId: m._id })}
                        className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        + Fee
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Association" size="md">
        <AssociationForm onClose={() => setShowCreate(false)} />
      </Modal>

      <Modal open={showAnnounce} onClose={() => setShowAnnounce(false)} title="Post Announcement" size="sm">
        {selected && <AnnouncementForm assocId={selected._id} onClose={() => setShowAnnounce(false)} />}
      </Modal>
    </div>
  )
}
