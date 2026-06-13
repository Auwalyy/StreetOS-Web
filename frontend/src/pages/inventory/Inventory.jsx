import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { productApi } from '../../api/services'
import { Button, Card, Modal, Input, Select, Badge, EmptyState, Spinner } from '../../components/ui'

function ProductForm({ onClose, businessId, product }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(product || { name: '', category: '', sellingPrice: '', costPrice: '', quantity: '', unit: 'piece', lowStockThreshold: 5 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => product
      ? productApi.update(businessId, product._id, form)
      : productApi.create(businessId, { ...form, sellingPrice: Number(form.sellingPrice), costPrice: Number(form.costPrice), quantity: Number(form.quantity) }),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success(product ? 'Product updated' : 'Product added'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <Input label="Product Name *" placeholder="e.g. Rice (50kg bag)" value={form.name} onChange={e => set('name', e.target.value)} required />
      <Input label="Category" placeholder="e.g. Grains, Electronics" value={form.category} onChange={e => set('category', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Selling Price (₦) *" type="number" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} required min="0" />
        <Input label="Cost Price (₦)" type="number" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} min="0" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="Quantity" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} min="0" />
        <Input label="Unit" placeholder="piece" value={form.unit} onChange={e => set('unit', e.target.value)} />
        <Input label="Low Stock Alert" type="number" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} min="0" />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>{product ? 'Update' : 'Add'} Product</Button>
      </div>
    </form>
  )
}

export default function Inventory() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products', currentBusiness?._id, search, lowStockOnly],
    queryFn: () => productApi.getAll(currentBusiness._id, { search, lowStock: lowStockOnly }).then(r => r.data),
    enabled: !!currentBusiness,
  })

  const { mutate: deleteP } = useMutation({
    mutationFn: (id) => productApi.delete(currentBusiness._id, id),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product deleted') },
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const products = data?.data || []
  const lowStockCount = products.filter(p => p.quantity <= p.lowStockThreshold).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm">{data?.pagination?.total || 0} products · {lowStockCount} low stock</p>
        </div>
        <Button onClick={() => { setEditProduct(null); setShowModal(true) }}>+ Add Product</Button>
      </div>

      <Card padding={false}>
        <div className="p-4 flex flex-wrap gap-3 border-b border-gray-100">
          <input placeholder="Search products..." className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={search} onChange={e => setSearch(e.target.value)} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="accent-orange-500" />
            <span className="text-sm text-gray-700">Low Stock Only</span>
          </label>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : products.length === 0 ? (
          <EmptyState icon="📦" title="No Products Yet" description="Add your products to track inventory and sales." action={<Button onClick={() => setShowModal(true)}>Add First Product</Button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {products.map(p => {
              const isLow = p.quantity <= p.lowStockThreshold
              return (
                <div key={p._id} className={`border rounded-xl p-4 hover:shadow-sm transition-shadow ${isLow ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-white'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
                    </div>
                    {isLow && <Badge color="yellow">Low Stock</Badge>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-400 text-xs">Price</p>
                      <p className="font-semibold text-gray-900">₦{p.sellingPrice.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Stock</p>
                      <p className={`font-semibold ${isLow ? 'text-amber-600' : 'text-gray-900'}`}>{p.quantity} {p.unit}s</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditProduct(p); setShowModal(true) }} className="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">Edit</button>
                    <button onClick={() => { if (confirm('Delete product?')) deleteP(p._id) }} className="flex-1 text-xs py-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-500 transition-colors">Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditProduct(null) }} title={editProduct ? 'Edit Product' : 'Add Product'}>
        <ProductForm onClose={() => { setShowModal(false); setEditProduct(null) }} businessId={currentBusiness._id} product={editProduct} />
      </Modal>
    </div>
  )
}
