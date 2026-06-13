import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { supplierApi } from '../../api/services'
import { Button, Card, Modal, Input, Textarea, EmptyState, Spinner } from '../../components/ui'

function SupplierForm({ onClose, businessId, supplier }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(supplier || { name: '', phone: '', email: '', address: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => supplier
      ? supplierApi.update(businessId, supplier._id, form)
      : supplierApi.create(businessId, form),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); toast.success(supplier ? 'Updated' : 'Supplier added'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Supplier Name *" placeholder="e.g. Alaba Electronics Ltd" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Input label="Phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
      <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
      <Input label="Address" value={form.address} onChange={e => set('address', e.target.value)} />
      <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>{supplier ? 'Update' : 'Add'} Supplier</Button>
      </div>
    </form>
  )
}

export default function Suppliers() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editSupplier, setEditSupplier] = useState(null)
  const [search, setSearch] = useState('')

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', currentBusiness?._id, search],
    queryFn: () => supplierApi.getAll(currentBusiness._id, { search }).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { mutate: deleteS } = useMutation({
    mutationFn: (id) => supplierApi.delete(currentBusiness._id, id),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); toast.success('Deleted') },
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers 🚚</h1>
          <p className="text-gray-500 text-sm">{suppliers?.length || 0} suppliers</p>
        </div>
        <Button onClick={() => { setEditSupplier(null); setShowModal(true) }}>+ Add Supplier</Button>
      </div>

      <Card padding={false}>
        <div className="p-4 border-b border-gray-100">
          <input placeholder="Search suppliers..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : suppliers?.length === 0 ? (
          <EmptyState icon="🚚" title="No Suppliers Yet" description="Add your suppliers to track purchases and balances." action={<Button onClick={() => setShowModal(true)}>Add Supplier</Button>} />
        ) : (
          <div className="divide-y divide-gray-50">
            {suppliers?.map(s => (
              <div key={s._id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                  {s.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="text-sm text-gray-400">{s.phone || s.email || 'No contact info'}</p>
                </div>
                <div className="text-right">
                  {s.outstandingBalance > 0 && <p className="text-sm font-semibold text-red-500">₦{s.outstandingBalance.toLocaleString()} owed</p>}
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`text-xs ${i < s.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditSupplier(s); setShowModal(true) }} className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Edit</button>
                  <button onClick={() => { if (confirm('Delete?')) deleteS(s._id) }} className="text-xs px-2 py-1 border border-red-100 rounded-lg hover:bg-red-50 text-red-500">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditSupplier(null) }} title={editSupplier ? 'Edit Supplier' : 'Add Supplier'}>
        <SupplierForm onClose={() => { setShowModal(false); setEditSupplier(null) }} businessId={currentBusiness._id} supplier={editSupplier} />
      </Modal>
    </div>
  )
}
