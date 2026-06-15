import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { purchaseOrderApi, supplierApi, inventoryApi } from '../../api/services'
import { Button, Card, Modal, Input, Select, Badge, EmptyState, Spinner } from '../../components/ui'

const STATUS_COLORS = { draft: 'gray', sent: 'blue', received: 'green', partial: 'yellow', cancelled: 'red' }

function POForm({ onClose, businessId }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ supplier: '', expectedDate: '', notes: '' })
  const [items, setItems] = useState([{ productName: '', quantity: 1, unitCost: '' }])

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', businessId],
    queryFn: () => supplierApi.getAll(businessId).then(r => r.data.data),
  })

  const addItem = () => setItems(i => [...i, { productName: '', quantity: 1, unitCost: '' }])
  const updateItem = (idx, k, v) => setItems(items.map((it, i) => i === idx ? { ...it, [k]: v } : it))
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const total = items.reduce((a, i) => a + (Number(i.quantity) * Number(i.unitCost || 0)), 0)

  const { mutate, isPending } = useMutation({
    mutationFn: () => purchaseOrderApi.create(businessId, {
      ...form,
      items: items.map(i => ({ ...i, quantity: Number(i.quantity), unitCost: Number(i.unitCost), total: Number(i.quantity) * Number(i.unitCost) })),
      totalAmount: total,
    }),
    onSuccess: () => { qc.invalidateQueries(['purchase-orders']); toast.success('Purchase order created'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); mutate() }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Supplier" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}>
          <option value="">Select supplier</option>
          {suppliers?.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </Select>
        <Input label="Expected Delivery" type="date" value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Items</p>
          <Button type="button" variant="secondary" size="sm" onClick={addItem}>+ Add Item</Button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5">
                {i === 0 && <label className="text-xs text-gray-500 block mb-1">Product Name</label>}
                <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Product name" value={item.productName} onChange={e => updateItem(i, 'productName', e.target.value)} />
              </div>
              <div className="col-span-2">
                {i === 0 && <label className="text-xs text-gray-500 block mb-1">Qty</label>}
                <input type="number" min="1" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
              </div>
              <div className="col-span-3">
                {i === 0 && <label className="text-xs text-gray-500 block mb-1">Unit Cost (₦)</label>}
                <input type="number" min="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="0" value={item.unitCost} onChange={e => updateItem(i, 'unitCost', e.target.value)} />
              </div>
              <div className="col-span-1">
                {i === 0 && <label className="text-xs text-gray-500 block mb-1">Total</label>}
                <p className="py-2 text-sm font-medium text-gray-900">₦{(Number(item.quantity) * Number(item.unitCost || 0)).toLocaleString()}</p>
              </div>
              <div className="col-span-1">
                {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="p-2 text-red-400 hover:text-red-500">✕</button>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2 font-semibold text-sm">
          Total: <span className="text-orange-600 ml-2">₦{total.toLocaleString()}</span>
        </div>
      </div>

      <Input label="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Delivery instructions, terms..." />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Create Purchase Order</Button>
      </div>
    </form>
  )
}

export default function PurchaseOrders() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', currentBusiness?._id],
    queryFn: () => purchaseOrderApi.getAll(currentBusiness._id).then(r => r.data),
    enabled: !!currentBusiness,
  })

  const { mutate: receive } = useMutation({
    mutationFn: (id) => purchaseOrderApi.receive(currentBusiness._id, id, {}),
    onSuccess: () => { qc.invalidateQueries(['purchase-orders']); qc.invalidateQueries(['inventory']); toast.success('Stock received & inventory updated!') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Purchase Orders</h1>
          <p className="text-gray-500 text-sm">Track stock orders from suppliers</p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ New Order</Button>
      </div>

      <Card padding={false}>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
          : (data?.data || []).length === 0 ? (
            <EmptyState icon="📦" title="No Purchase Orders" description="Create purchase orders to track supplier deliveries." action={<Button onClick={() => setShowModal(true)}>Create Order</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Date', 'Supplier', 'Items', 'Total', 'Expected', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map(po => (
                    <tr key={po._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-xs text-gray-500">{format(new Date(po.createdAt), 'dd MMM yyyy')}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{po.supplier?.name || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{po.items?.length} item{po.items?.length !== 1 ? 's' : ''}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">₦{po.totalAmount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{po.expectedDate ? format(new Date(po.expectedDate), 'dd MMM yyyy') : '—'}</td>
                      <td className="py-3 px-4"><Badge color={STATUS_COLORS[po.status]}>{po.status}</Badge></td>
                      <td className="py-3 px-4">
                        {po.status !== 'received' && po.status !== 'cancelled' && (
                          <button
                            onClick={() => { if (confirm('Mark as received? This will update inventory stock.')) receive(po._id) }}
                            className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                          >
                            ✅ Receive Stock
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Purchase Order" size="lg">
        <POForm onClose={() => setShowModal(false)} businessId={currentBusiness._id} />
      </Modal>
    </div>
  )
}
