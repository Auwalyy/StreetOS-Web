import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { transactionApi, customerApi } from '../../api/services'
import { Button, Card, Modal, Input, Select, Badge, EmptyState, Spinner } from '../../components/ui'

const typeColors = { sale: 'green', expense: 'red', income: 'blue', refund: 'yellow', transfer: 'purple', debt_payment: 'orange', savings: 'gray' }

function TransactionForm({ onClose, businessId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ type: 'sale', amount: '', description: '', category: '', date: new Date().toISOString().split('T')[0], paymentMethod: 'cash' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => transactionApi.create(businessId, { ...form, amount: Number(form.amount) }),
    onSuccess: () => { qc.invalidateQueries(['transactions']); qc.invalidateQueries(['analytics-dashboard']); toast.success('Transaction added'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Type" value={form.type} onChange={e => set('type', e.target.value)}>
          {['sale', 'expense', 'income', 'refund', 'transfer'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </Select>
        <Input label="Amount (₦)" type="number" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} required min="0" />
      </div>
      <Input label="Description" placeholder="What was this for?" value={form.description} onChange={e => set('description', e.target.value)} />
      <Input label="Category" placeholder="e.g. Food, Rent, Sales" value={form.category} onChange={e => set('category', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Date" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        <Select label="Payment Method" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
          {['cash', 'transfer', 'pos', 'opay', 'moniepoint', 'palmpay'].map(m => <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </Select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Save Transaction</Button>
      </div>
    </form>
  )
}

export default function Transactions() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState({ type: '', search: '', page: 1 })

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', currentBusiness?._id, filter],
    queryFn: () => transactionApi.getAll(currentBusiness._id, filter).then(r => r.data),
    enabled: !!currentBusiness,
  })

  const { mutate: deleteT } = useMutation({
    mutationFn: (id) => transactionApi.delete(currentBusiness._id, id),
    onSuccess: () => { qc.invalidateQueries(['transactions']); toast.success('Deleted') },
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 text-sm">Track all your income and expenses</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Transaction</Button>
      </div>

      {/* Filters */}
      <Card padding={false}>
        <div className="p-4 flex flex-wrap gap-3">
          <input
            placeholder="Search transactions..."
            className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value, page: 1 }))}
          />
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={filter.type}
            onChange={e => setFilter(f => ({ ...f, type: e.target.value, page: 1 }))}
          >
            <option value="">All Types</option>
            {['sale', 'expense', 'income', 'refund', 'transfer'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : data?.data?.length === 0 ? (
          <EmptyState icon="💳" title="No Transactions Yet" description="Start recording your sales and expenses to track your business finances." action={<Button onClick={() => setShowModal(true)}>Add First Transaction</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Date', 'Description', 'Category', 'Type', 'Method', 'Amount', ''].map((h, i) => (
                    <th key={i} className="text-left py-3 px-4 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data?.map(t => (
                  <tr key={t._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500">{format(new Date(t.date), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{t.description || '—'}</td>
                    <td className="py-3 px-4 text-gray-500">{t.category || '—'}</td>
                    <td className="py-3 px-4"><Badge color={typeColors[t.type]}>{t.type}</Badge></td>
                    <td className="py-3 px-4 text-gray-500 capitalize">{t.paymentMethod}</td>
                    <td className={`py-3 px-4 font-semibold ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                      {t.type === 'expense' ? '-' : '+'}₦{t.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => { if (confirm('Delete this transaction?')) deleteT(t._id) }} className="text-gray-400 hover:text-red-500 transition-colors">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data?.pagination && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">{data.pagination.total} total transactions</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={filter.page <= 1} onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={filter.page >= data.pagination.pages} onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))}>Next</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Transaction">
        <TransactionForm onClose={() => setShowModal(false)} businessId={currentBusiness._id} />
      </Modal>
    </div>
  )
}
