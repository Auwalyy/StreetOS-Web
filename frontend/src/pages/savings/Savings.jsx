import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { savingsApi, goalApi } from '../../api/services'
import { Button, Card, Modal, Input, Select, EmptyState, Spinner } from '../../components/ui'

function SavingsForm({ onClose, businessId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', type: 'business', targetAmount: '', frequency: 'monthly' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => savingsApi.create(businessId, { ...form, targetAmount: Number(form.targetAmount) }),
    onSuccess: () => { qc.invalidateQueries(['savings']); toast.success('Savings plan created'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Plan Name" placeholder="e.g. Business Emergency Fund" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
        {['personal', 'business', 'emergency', 'goal'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
      </Select>
      <Input label="Target Amount (₦)" type="number" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} required min="0" />
      <Select label="Frequency" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
        {['daily', 'weekly', 'monthly', 'manual'].map(f => <option key={f} value={f} className="capitalize">{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
      </Select>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Create Plan</Button>
      </div>
    </form>
  )
}

function GoalForm({ onClose, businessId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ title: '', type: 'revenue', targetAmount: '', period: 'monthly' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => goalApi.create(businessId, { ...form, targetAmount: Number(form.targetAmount) }),
    onSuccess: () => { qc.invalidateQueries(['goals']); toast.success('Goal set!'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Goal Title" placeholder="e.g. Hit ₦500k this month" value={form.title} onChange={e => set('title', e.target.value)} required />
      <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
        {['revenue', 'profit', 'savings', 'expense_reduction', 'customer'].map(t => <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
      </Select>
      <Input label="Target Amount (₦)" type="number" value={form.targetAmount} onChange={e => set('targetAmount', e.target.value)} required min="0" />
      <Select label="Period" value={form.period} onChange={e => set('period', e.target.value)}>
        {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
      </Select>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Set Goal</Button>
      </div>
    </form>
  )
}

export default function Savings() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showSavings, setShowSavings] = useState(false)
  const [showGoal, setShowGoal] = useState(false)
  const [depositModal, setDepositModal] = useState(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositType, setDepositType] = useState('deposit')

  const { data: savings, isLoading: savingsLoading } = useQuery({
    queryKey: ['savings', currentBusiness?._id],
    queryFn: () => savingsApi.getAll(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals', currentBusiness?._id],
    queryFn: () => goalApi.getAll(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { mutate: addTransaction, isPending: adding } = useMutation({
    mutationFn: () => savingsApi.addTransaction(currentBusiness._id, depositModal._id, { amount: Number(depositAmount), type: depositType }),
    onSuccess: () => { qc.invalidateQueries(['savings']); toast.success('Recorded'); setDepositModal(null); setDepositAmount('') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Savings & Goals 🏦</h1>
          <p className="text-gray-500 text-sm">Track your savings and business goals</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowGoal(true)}>🎯 Set Goal</Button>
          <Button onClick={() => setShowSavings(true)}>+ New Savings Plan</Button>
        </div>
      </div>

      {/* Savings */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Savings Plans</h2>
        {savingsLoading ? <Spinner /> : savings?.length === 0 ? (
          <EmptyState icon="🏦" title="No Savings Plans" description="Create a savings plan to grow your business." action={<Button onClick={() => setShowSavings(true)}>Create Plan</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savings?.map(s => {
              const pct = s.targetAmount > 0 ? Math.min((s.currentAmount / s.targetAmount) * 100, 100).toFixed(0) : 0
              return (
                <Card key={s._id}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{s.status}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₦{s.currentAmount.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">of ₦{s.targetAmount.toLocaleString()} target</p>
                  <div className="mt-3 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}% achieved</p>
                  <button onClick={() => { setDepositModal(s); setDepositType('deposit') }} className="mt-3 w-full text-sm py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors font-medium">
                    + Add Money
                  </button>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Goals */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Goals 🎯</h2>
        {goalsLoading ? <Spinner /> : goals?.length === 0 ? (
          <EmptyState icon="🎯" title="No Goals Set" description="Set revenue, profit or savings goals to stay on track." action={<Button onClick={() => setShowGoal(true)}>Set First Goal</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals?.map(g => {
              const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100).toFixed(0) : 0
              return (
                <Card key={g._id}>
                  <p className="font-semibold text-gray-900 mb-1">{g.title}</p>
                  <p className="text-xs text-gray-400 capitalize mb-3">{g.type.replace('_', ' ')} · {g.period}</p>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">₦{g.currentAmount.toLocaleString()}</span>
                    <span className="font-medium text-gray-900">₦{g.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${Number(pct) >= 100 ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{pct}% complete</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{g.status}</span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showSavings} onClose={() => setShowSavings(false)} title="New Savings Plan">
        <SavingsForm onClose={() => setShowSavings(false)} businessId={currentBusiness._id} />
      </Modal>

      <Modal open={showGoal} onClose={() => setShowGoal(false)} title="Set a Goal" size="sm">
        <GoalForm onClose={() => setShowGoal(false)} businessId={currentBusiness._id} />
      </Modal>

      <Modal open={!!depositModal} onClose={() => setDepositModal(null)} title="Add Money" size="sm">
        {depositModal && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {['deposit', 'withdrawal'].map(t => (
                <button key={t} onClick={() => setDepositType(t)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${depositType === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            <Input label="Amount (₦)" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} required min="1" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDepositModal(null)}>Cancel</Button>
              <Button className="flex-1" loading={adding} onClick={() => addTransaction()}>Confirm</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
