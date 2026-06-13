import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { debtApi, customerApi } from '../../api/services'
import { Button, Card, Modal, Input, Select, Badge, EmptyState, Spinner } from '../../components/ui'

const statusColors = { active: 'orange', partial: 'yellow', paid: 'green', overdue: 'red', written_off: 'gray' }

function DebtForm({ onClose, businessId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ customer: '', originalAmount: '', description: '', dueDate: '', type: 'owed_to_me' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { data: customers } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: () => customerApi.getAll(businessId).then(r => r.data.data),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () => debtApi.create(businessId, { ...form, originalAmount: Number(form.originalAmount) }),
    onSuccess: () => { qc.invalidateQueries(['debts']); toast.success('Debt recorded'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
        <option value="owed_to_me">Customer owes me</option>
        <option value="i_owe">I owe a supplier</option>
      </Select>
      <Select label="Customer *" value={form.customer} onChange={e => set('customer', e.target.value)} required>
        <option value="">Select customer</option>
        {customers?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
      </Select>
      <Input label="Amount (₦) *" type="number" placeholder="0" value={form.originalAmount} onChange={e => set('originalAmount', e.target.value)} required min="0" />
      <Input label="Description" placeholder="e.g. Goods on credit" value={form.description} onChange={e => set('description', e.target.value)} />
      <Input label="Due Date" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Record Debt</Button>
      </div>
    </form>
  )
}

function PaymentModal({ debt, businessId, onClose }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')

  const { mutate, isPending } = useMutation({
    mutationFn: () => debtApi.recordPayment(businessId, debt._id, { amount: Number(amount), method }),
    onSuccess: () => { qc.invalidateQueries(['debts']); toast.success('Payment recorded'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-xl">
        <p className="text-sm text-gray-500">Outstanding Balance</p>
        <p className="text-2xl font-bold text-red-500">₦{debt.balance.toLocaleString()}</p>
      </div>
      <Input label="Payment Amount (₦)" type="number" value={amount} onChange={e => setAmount(e.target.value)} max={debt.balance} required min="1" />
      <Select label="Payment Method" value={method} onChange={e => setMethod(e.target.value)}>
        {['cash', 'transfer', 'pos', 'opay', 'moniepoint', 'palmpay'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
      </Select>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" variant="success" loading={isPending}>Record Payment</Button>
      </div>
    </form>
  )
}

export default function Debts() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [payDebt, setPayDebt] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['debts', currentBusiness?._id, statusFilter],
    queryFn: () => debtApi.getAll(currentBusiness._id, { status: statusFilter }).then(r => r.data),
    enabled: !!currentBusiness,
  })

  const { mutate: sendReminder } = useMutation({
    mutationFn: (id) => debtApi.sendReminder(currentBusiness._id, id),
    onSuccess: () => toast.success('Reminder sent!'),
    onError: () => toast.error('Failed to send reminder'),
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const debts = data?.data || []
  const totalOwed = debts.filter(d => d.type === 'owed_to_me').reduce((a, b) => a + b.balance, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debt Book 📒</h1>
          <p className="text-gray-500 text-sm">{debts.length} records · ₦{totalOwed.toLocaleString()} owed to you</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Record Debt</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Owed to Me', value: totalOwed, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'I Owe Others', value: debts.filter(d => d.type === 'i_owe').reduce((a, b) => a + b.balance, 0), color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Active Debts', value: debts.filter(d => d.status === 'active').length, color: 'text-orange-600', bg: 'bg-orange-50', isCount: true },
          { label: 'Paid This Month', value: debts.filter(d => d.status === 'paid').length, color: 'text-blue-600', bg: 'bg-blue-50', isCount: true },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.isCount ? s.value : `₦${s.value.toLocaleString()}`}</p>
          </div>
        ))}
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-100 flex gap-3 flex-wrap">
          {['', 'active', 'partial', 'paid', 'overdue'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : debts.length === 0 ? (
          <EmptyState icon="📒" title="No Debts Recorded" description="Record customer debts and track payments easily." action={<Button onClick={() => setShowModal(true)}>Record First Debt</Button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {debts.map(d => (
              <div key={d._id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                  {d.type === 'owed_to_me' ? '💰' : '💸'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{d.customer?.name}</p>
                  <p className="text-sm text-gray-400">{d.description || 'No description'} {d.dueDate && `· Due ${format(new Date(d.dueDate), 'dd MMM')}`}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${d.type === 'owed_to_me' ? 'text-green-600' : 'text-red-500'}`}>₦{d.balance.toLocaleString()}</p>
                  <Badge color={statusColors[d.status]}>{d.status}</Badge>
                </div>
                <div className="flex gap-2">
                  {d.status !== 'paid' && (
                    <>
                      <button onClick={() => setPayDebt(d)} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">Pay</button>
                      <button onClick={() => sendReminder(d._id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">Remind</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Debt">
        <DebtForm onClose={() => setShowModal(false)} businessId={currentBusiness._id} />
      </Modal>

      <Modal open={!!payDebt} onClose={() => setPayDebt(null)} title="Record Payment" size="sm">
        {payDebt && <PaymentModal debt={payDebt} businessId={currentBusiness._id} onClose={() => setPayDebt(null)} />}
      </Modal>
    </div>
  )
}
