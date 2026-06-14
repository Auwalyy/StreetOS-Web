import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { purchaseOrderApi, supplierApi, inventoryApi } from '../../api/services'
import { Button, Card, Modal, Input, Select, Badge, EmptyState, Spinner } from '../../components/ui'

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`
const STATUS_COLORS = { draft: 'gray', sent: 'blue', partial: 'yellow', received: 'green', cancelled: 'red' }

function POForm({ onClose, businessId, suppliers = [] }) {
  const qc = useQueryClient()
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [notes, setNotes] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [items, setItems] = useState([{ name: '', quantity: 1, unitCost: 0, product: '' }])
  const [search, setSearch] = useState('')

  const { data: productsData } = useQuery({
    queryKey: ['inventory', businessId, search],
    queryFn: () => inventoryApi.getProducts(businessId, { search, limit: 8 }).then(r => r.data.data),
    enabled: search.length > 1,
  })

  const addItem = (product) => {
    setItems(prev => [...prev, { name: product.name, quantity: 1, unitCost: product.costPrice || 0, product: product._id }])
    setSearch('')
  }

  const updateItem = (i, field, val) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item))
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const { mutate, isPending } = useMutation({
    mutationFn: () => purchaseOrderApi.create(businessId, {
      supplierId: supplierId || undefined,
      supplierName: supplierName || suppliers.find(s => s._id === supplierId)?.name,
      items: items.filter(i => i.name).map(i => ({ ...i, quantity: Number(i.quantity), unitCost: Number(i.unitCost) })),
      notes,
      expectedDate: expectedDate || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries(['purchase-orders']); toast.success('Purchase order created'); onClose() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitCost), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          <option value="">Select supplier</option>
          {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </Select>
        <Input label="Or Enter Supplier Name" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Manual entry" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Expected Delivery Date" type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
        <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Order Items</p>
        <input placeholder="🔍 Search product to add..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        {search && (productsData || []).length > 0 && (
          <div className="border border-gray-100 rounded-lg mb-2 max-h-40 overflow-y-auto">
            {productsData.map(p => (
              <button key={p._id} onClick={() => addItem(p)}
                className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm flex justify-between border-b border-gray-50 last:border-0">
                <span className="font-medium">{p.name}</span>
                <span className="text-gray-400">Cost: {fmt(p.costPrice)}</span>
              </button>
            ))}
          </div>
        )}
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 items-end">
              <Input label={i === 0 ? 'Product Name' : ''} value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="Product name" className="flex-1" />
              <Input label={i === 0 ? 'Qty' : ''} type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-20" />
              <Input label={i === 0 ? 'Unit Cost (₦)' : ''} type="number" min="0" value={item.unitCost} onChange={e => updateItem(i, 'unitCost', e.target.value)} className="w-32" />
              <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 pb-2 text-xl">×</button>
            </div>
          ))}
          <button onClick={() => setItems(p => [...p, { name: '', quantity: 1, unitCost: 0, product: '' }])}
            className="text-sm text-orange-600 hover:text-orange-700">+ Add Item</button>
        </div>
      </div>

      <div className="flex justify-between font-bold text-gray-900 border-t pt-3">
        <span>Order Total</span>
        <span className="text-orange-600">{fmt(total)}</span>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={isPending} onClick={() => mutate()}>Create Order</Button>
      </div>
    </div>
  )
}

function ReceiveModal({ order, businessId, onClose }) {
  const qc = useQueryClient()
  const [received, setReceived] = useState(order.items.map(i => ({ ...i, receivedQuantity: i.quantity - (i.receivedQuantity || 0) })))

  const { mutate, isPending } = useMutation({
    mutationFn: () => purchaseOrderApi.receive(businessId, order._id, {
      receivedItems: received.map(i => ({ product: i.product, receivedQuantity: Number(i.receivedQuantity), unitCost: Number(i.unitCost) }))
    }),
    onSuccess: () => { qc.invalidateQueries(['purchase-orders']); toast.success('Stock received and inventory updated!'); onClose() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Enter the quantities received. Stock will be added to inventory automatically.</p>
      <div className="space-y-3">
        {received.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-sm">{item.name}</p>
              <p className="text-xs text-gray-400">Ordered: {item.quantity}</p>
            </div>
            <Input label="Received" type="number" min="0" max={item.quantity}
              value={item.receivedQuantity}
              onChange={e => setReceived(p => p.map((r, idx) => idx === i ? { ...r, receivedQuantity: e.target.value } : r))}
              className="w-24" />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={isPending} onClick={() => mutate()}>Receive & Update Stock</Button>
      </div>
    </div>
  )
}

export default function PurchaseOrders() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const bid = currentBusiness?._id
  const [showCreate, setShowCreate] = useState(false)
  const [receiveOrder, setReceiveOrder] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', bid, statusFilter],
    queryFn: () => purchaseOrderApi.getAll(bid, { status: statusFilter || undefined }).then(r => r.data),
    enabled: !!bid,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', bid],
    queryFn: () => supplierApi.getAll(bid).then(r => r.data.data),
    enabled: !!bid,
  })

  const { mutate: deleteOrder } = useMutation({
    mutationFn: (id) => purchaseOrderApi.delete(bid, id),
    onSuccess: () => { qc.invalidateQueries(['purchase-orders']); toast.success('Order deleted') },
    onError: e => toast.error(e.response?.data?.message || 'Cannot delete'),
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const orders = data?.data || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 text-sm">{data?.pagination?.total || 0} orders total</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New Order</Button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'draft', 'sent', 'partial', 'received', 'cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
          : orders.length === 0 ? (
            <EmptyState icon="📋" title="No Purchase Orders" description="Create your first purchase order to restock inventory." action={<Button onClick={() => setShowCreate(true)}>Create Order</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Order #', 'Supplier', 'Items', 'Total', 'Status', 'Expected', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs text-blue-600">{order.orderNumber}</td>
                      <td className="py-3 px-4 font-medium">{order.supplierName || order.supplier?.name || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{order.items?.length}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">{fmt(order.total)}</td>
                      <td className="py-3 px-4"><Badge color={STATUS_COLORS[order.status] || 'gray'}>{order.status}</Badge></td>
                      <td className="py-3 px-4 text-xs text-gray-400">{order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {order.status !== 'received' && order.status !== 'cancelled' && (
                            <button onClick={() => setReceiveOrder(order)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">Receive</button>
                          )}
                          {order.status === 'draft' && (
                            <button onClick={() => { if (window.confirm('Delete this order?')) deleteOrder(order._id) }} className="px-2 py-1 text-xs bg-red-50 text-red-500 rounded hover:bg-red-100">Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Purchase Order" size="lg">
        <POForm onClose={() => setShowCreate(false)} businessId={bid} suppliers={suppliersData || []} />
      </Modal>

      <Modal open={!!receiveOrder} onClose={() => setReceiveOrder(null)} title="Receive Stock" size="md">
        {receiveOrder && <ReceiveModal order={receiveOrder} businessId={bid} onClose={() => setReceiveOrder(null)} />}
      </Modal>
    </div>
  )
}
