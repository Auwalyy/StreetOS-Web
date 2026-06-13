import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { customerApi } from '../../api/services'
import { Button, Card, Modal, Input, Textarea, Avatar, ScoreRing, EmptyState, Spinner, Badge } from '../../components/ui'

function CustomerForm({ onClose, businessId, customer }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(customer || { name: '', phone: '', email: '', address: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => customer ? customerApi.update(businessId, customer._id, form) : customerApi.create(businessId, form),
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success(customer ? 'Customer updated' : 'Customer added'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Full Name *" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Input label="Phone" type="tel" placeholder="+234 800 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
      <Input label="Email" type="email" placeholder="customer@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
      <Input label="Address" placeholder="Street, City" value={form.address} onChange={e => set('address', e.target.value)} />
      <Textarea label="Notes" placeholder="Any notes about this customer" value={form.notes} onChange={e => set('notes', e.target.value)} />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>{customer ? 'Update' : 'Add'} Customer</Button>
      </div>
    </form>
  )
}

export default function Customers() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', currentBusiness?._id, search],
    queryFn: () => customerApi.getAll(currentBusiness._id, { search }).then(r => r.data),
    enabled: !!currentBusiness,
  })

  const { data: detail } = useQuery({
    queryKey: ['customer-detail', selected?._id],
    queryFn: () => customerApi.get(currentBusiness._id, selected._id).then(r => r.data.data),
    enabled: !!selected,
  })

  const { mutate: deleteC } = useMutation({
    mutationFn: (id) => customerApi.delete(currentBusiness._id, id),
    onSuccess: () => { qc.invalidateQueries(['customers']); toast.success('Deleted') },
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm">{data?.pagination?.total || 0} customers</p>
        </div>
        <Button onClick={() => { setEditCustomer(null); setShowModal(true) }}>+ Add Customer</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="p-4 border-b border-gray-100">
              <input placeholder="Search by name or phone..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : data?.data?.length === 0 ? (
              <EmptyState icon="👥" title="No Customers Yet" description="Add your first customer to track purchases and debts." action={<Button onClick={() => setShowModal(true)}>Add Customer</Button>} />
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.data?.map(c => (
                  <div key={c._id} className={`flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${selected?._id === c._id ? 'bg-orange-50' : ''}`} onClick={() => setSelected(c)}>
                    <Avatar name={c.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{c.name}</p>
                      <p className="text-sm text-gray-400">{c.phone || 'No phone'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">₦{c.totalPurchases.toLocaleString()}</p>
                      {c.totalDebt > 0 && <p className="text-xs text-red-500">₦{c.totalDebt.toLocaleString()} debt</p>}
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button onClick={(e) => { e.stopPropagation(); setEditCustomer(c); setShowModal(true) }} className="text-xs p-1 text-gray-400 hover:text-orange-500">✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) deleteC(c._id) }} className="text-xs p-1 text-gray-400 hover:text-red-500">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Customer Detail Panel */}
        <Card>
          {selected && detail ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} size="lg" />
                <div>
                  <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                  <p className="text-sm text-gray-400">{selected.phone}</p>
                </div>
              </div>
              <div className="flex justify-center">
                <ScoreRing score={selected.trustScore} label="Trust Score" size={100} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Purchases', value: `₦${selected.totalPurchases.toLocaleString()}`, color: 'text-green-600' },
                  { label: 'Total Debt', value: `₦${selected.totalDebt.toLocaleString()}`, color: 'text-red-500' },
                  { label: 'Total Paid', value: `₦${selected.totalPaid.toLocaleString()}`, color: 'text-blue-600' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className={`font-semibold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              {detail.transactions?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent Transactions</p>
                  {detail.transactions.slice(0, 3).map(t => (
                    <div key={t._id} className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-600">{t.description || t.type}</span>
                      <span className={`text-sm font-medium ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>₦{t.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <span className="text-4xl mb-2">👤</span>
              <p className="text-sm">Select a customer to view details</p>
            </div>
          )}
        </Card>
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditCustomer(null) }} title={editCustomer ? 'Edit Customer' : 'Add Customer'}>
        <CustomerForm onClose={() => { setShowModal(false); setEditCustomer(null) }} businessId={currentBusiness._id} customer={editCustomer} />
      </Modal>
    </div>
  )
}
