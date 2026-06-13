import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { groupApi } from '../../api/services'
import { useAuthStore } from '../../store/authStore'
import { Button, Card, Modal, Input, Select, EmptyState, Spinner, Badge, Avatar } from '../../components/ui'

function GroupForm({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', type: 'adashe', contributionAmount: '', frequency: 'monthly', maxMembers: 10 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => groupApi.create({ ...form, contributionAmount: Number(form.contributionAmount), maxMembers: Number(form.maxMembers) }),
    onSuccess: () => { qc.invalidateQueries(['groups']); toast.success('Group created!'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Group Name *" placeholder="e.g. Market Women Adashe" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
        <option value="adashe">Adashe</option>
        <option value="esusu">Esusu</option>
        <option value="ajo">Ajo</option>
        <option value="cooperative">Cooperative</option>
      </Select>
      <Input label="Contribution Amount (₦) *" type="number" value={form.contributionAmount} onChange={e => set('contributionAmount', e.target.value)} required min="1" />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </Select>
        <Input label="Max Members" type="number" value={form.maxMembers} onChange={e => set('maxMembers', e.target.value)} min="2" max="50" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Create Group</Button>
      </div>
    </form>
  )
}

export default function Adashe() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)
  const [contribAmount, setContribAmount] = useState('')

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.getAll().then(r => r.data.data),
  })

  const { data: groupDetail } = useQuery({
    queryKey: ['group-detail', selected?._id],
    queryFn: () => groupApi.get(selected._id).then(r => r.data.data),
    enabled: !!selected,
  })

  const { mutate: joinGroup } = useMutation({
    mutationFn: (id) => groupApi.join(id),
    onSuccess: () => { qc.invalidateQueries(['groups']); toast.success('Joined group!') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to join'),
  })

  const { mutate: recordContrib, isPending: recording } = useMutation({
    mutationFn: ({ groupId, memberId }) => groupApi.recordContribution(groupId, { memberId, amount: Number(contribAmount) }),
    onSuccess: () => { qc.invalidateQueries(['group-detail']); toast.success('Contribution recorded!'); setContribAmount('') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Adashe / Esusu 🤝</h1>
          <p className="text-gray-500 text-sm">Collective savings groups</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Create Group</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className={`${selected ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : groups?.length === 0 ? (
            <EmptyState icon="🤝" title="No Groups Yet" description="Create or join a savings group with your community." action={<Button onClick={() => setShowModal(true)}>Create Group</Button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups?.map(g => {
                const isCreator = g.creator?._id === user?._id || g.creator === user?._id
                const isMember = g.members?.some(m => m.user === user?._id || m.user?._id === user?._id)
                return (
                  <Card key={g._id} className={`cursor-pointer hover:shadow-md transition-shadow ${selected?._id === g._id ? 'ring-2 ring-orange-400' : ''}`} onClick={() => setSelected(g)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{g.name}</p>
                        <p className="text-xs text-gray-400 capitalize">{g.type} · {g.frequency}</p>
                      </div>
                      <Badge color={g.status === 'active' ? 'green' : 'gray'}>{g.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div className="bg-orange-50 p-2 rounded-lg"><p className="text-xs text-gray-400">Contribution</p><p className="font-semibold text-orange-600">₦{g.contributionAmount?.toLocaleString()}</p></div>
                      <div className="bg-gray-50 p-2 rounded-lg"><p className="text-xs text-gray-400">Members</p><p className="font-semibold text-gray-900">{g.members?.length}/{g.maxMembers}</p></div>
                    </div>
                    <div className="flex gap-2">
                      {!isMember && !isCreator && g.members?.length < g.maxMembers && (
                        <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); joinGroup(g._id) }}>Join Group</Button>
                      )}
                      {isCreator && <Badge color="orange">Creator</Badge>}
                      {isMember && !isCreator && <Badge color="green">Member</Badge>}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Group Detail */}
        {selected && groupDetail && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{groupDetail.name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Total collected: <strong className="text-green-600">₦{groupDetail.totalCollected?.toLocaleString()}</strong></p>

            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Members ({groupDetail.members?.length})</p>
              {groupDetail.members?.map((m, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <Avatar name={m.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{m.name}</p>
                      <p className="text-xs text-gray-400">₦{m.totalContributed?.toLocaleString()} contributed</p>
                    </div>
                  </div>
                  {groupDetail.creator?._id === user?._id && (
                    <div className="flex items-center gap-2">
                      <Input type="number" placeholder="Amount" className="w-24 py-1 text-xs" value={contribAmount} onChange={e => setContribAmount(e.target.value)} />
                      <Button size="sm" onClick={() => recordContrib({ groupId: groupDetail._id, memberId: m._id })} loading={recording}>✓</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Savings Group">
        <GroupForm onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  )
}
