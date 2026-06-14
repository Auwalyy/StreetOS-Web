import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { inventoryApi, supplierApi } from '../../api/services'
import { Button, Card, Modal, Input, Select, Badge, EmptyState, Spinner } from '../../components/ui'

const UNITS = ['piece', 'bag', 'carton', 'kg', 'litre', 'pack', 'bottle', 'tin', 'roll', 'yard', 'metre', 'box', 'pair', 'dozen', 'set']
const CATEGORIES = ['Food & Drinks', 'Electronics', 'Clothing & Textile', 'Pharmacy', 'Stationery', 'Building Materials', 'Cosmetics', 'Provisions', 'Auto Parts', 'Other']

function ProductForm({ onClose, businessId, product, suppliers = [] }) {
  const qc = useQueryClient()
  const init = product || {
    name: '', sku: '', barcode: '', brand: '', category: '', supplier: '',
    description: '', costPrice: '', sellingPrice: '', wholesalePrice: '',
    minimumPrice: '', quantity: '', unit: 'piece', lowStockThreshold: 5,
    location: '', expiryDate: '', tags: '',
  }
  const [form, setForm] = useState(init)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        sellingPrice: Number(form.sellingPrice),
        costPrice: Number(form.costPrice) || 0,
        wholesalePrice: Number(form.wholesalePrice) || 0,
        minimumPrice: Number(form.minimumPrice) || 0,
        quantity: Number(form.quantity) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
        supplier: form.supplier || undefined,
      }
      return product
        ? inventoryApi.updateProduct(businessId, product._id, payload)
        : inventoryApi.createProduct(businessId, payload)
    },
    onSuccess: () => { qc.invalidateQueries(['inventory']); toast.success(product ? 'Product updated' : 'Product added'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); mutate() }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Product Name *" placeholder="e.g. Bag of Rice (50kg)" value={form.name} onChange={e => set('name', e.target.value)} required />
        <Input label="Brand" placeholder="e.g. Caprice" value={form.brand} onChange={e => set('brand', e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="SKU" placeholder="Auto if blank" value={form.sku} onChange={e => set('sku', e.target.value)} />
        <Input label="Barcode" placeholder="Scan or enter" value={form.barcode} onChange={e => set('barcode', e.target.value)} />
        <Select label="Category" value={form.category} onChange={e => set('category', e.target.value)}>
          <option value="">Select category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Selling Price (₦) *" type="number" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} required min="0" />
        <Input label="Cost Price (₦)" type="number" value={form.costPrice} onChange={e => set('costPrice', e.target.value)} min="0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Wholesale Price (₦)" type="number" value={form.wholesalePrice} onChange={e => set('wholesalePrice', e.target.value)} min="0" />
        <Input label="Minimum Price (₦)" type="number" value={form.minimumPrice} onChange={e => set('minimumPrice', e.target.value)} min="0" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input label="Quantity" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} min="0" />
        <Select label="Unit" value={form.unit} onChange={e => set('unit', e.target.value)}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </Select>
        <Input label="Low Stock Alert" type="number" value={form.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} min="0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Supplier" value={form.supplier} onChange={e => set('supplier', e.target.value)}>
          <option value="">No supplier</option>
          {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </Select>
        <Input label="Location / Shelf" placeholder="e.g. Shelf A3" value={form.location} onChange={e => set('location', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Expiry Date" type="date" value={form.expiryDate ? form.expiryDate.slice(0, 10) : ''} onChange={e => set('expiryDate', e.target.value)} />
        <Input label="Tags (comma-separated)" placeholder="rice, grain, staple" value={typeof form.tags === 'string' ? form.tags : (form.tags || []).join(', ')} onChange={e => set('tags', e.target.value)} />
      </div>
      {form.sellingPrice && form.costPrice && (
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm">
          <span className="text-green-700 font-medium">Profit per unit: </span>
          <span className="text-green-900 font-bold">₦{(Number(form.sellingPrice) - Number(form.costPrice)).toLocaleString()}</span>
          <span className="text-green-600 ml-2">({form.costPrice > 0 ? (((form.sellingPrice - form.costPrice) / form.sellingPrice) * 100).toFixed(1) : 100}% margin)</span>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>{product ? 'Update' : 'Add'} Product</Button>
      </div>
    </form>
  )
}

function StockAdjustModal({ product, businessId, onClose }) {
  const qc = useQueryClient()
  const [qty, setQty] = useState('')
  const [type, setType] = useState('stock_in')
  const [reason, setReason] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => inventoryApi.adjustStock(businessId, product._id, {
      quantity: type === 'stock_out' ? -Math.abs(Number(qty)) : Math.abs(Number(qty)),
      reason, type,
    }),
    onSuccess: () => { qc.invalidateQueries(['inventory']); toast.success('Stock adjusted'); onClose() },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <p className="font-medium text-gray-900">{product.name}</p>
        <p className="text-gray-500">Current stock: <span className="font-bold text-gray-900">{product.quantity} {product.unit}s</span></p>
      </div>
      <Select label="Type" value={type} onChange={e => setType(e.target.value)}>
        <option value="stock_in">Stock In (+)</option>
        <option value="stock_out">Stock Out (-)</option>
        <option value="damage">Damage</option>
        <option value="adjustment">Manual Adjustment</option>
      </Select>
      <Input label="Quantity" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="Enter quantity" />
      <Input label="Reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. New delivery, spoilage..." />
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={isPending} onClick={() => mutate()} disabled={!qty}>Adjust Stock</Button>
      </div>
    </div>
  )
}

export default function Inventory() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [stockProduct, setStockProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [tab, setTab] = useState('products') // products | movements | leakage | forecast | deadstock | report

  const bid = currentBusiness?._id

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', bid, search, category, lowStockOnly, showArchived],
    queryFn: () => inventoryApi.getProducts(bid, { search, category, lowStock: lowStockOnly, archived: showArchived }).then(r => r.data),
    enabled: !!bid,
  })

  const { data: reportData } = useQuery({
    queryKey: ['inventory-report', bid],
    queryFn: () => inventoryApi.getReport(bid).then(r => r.data.data),
    enabled: !!bid && tab === 'report',
  })

  const { data: leakageData, isLoading: leakLoading } = useQuery({
    queryKey: ['inventory-leakage', bid],
    queryFn: () => inventoryApi.detectLeakage(bid).then(r => r.data.data),
    enabled: !!bid && tab === 'leakage',
  })

  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ['inventory-forecast', bid],
    queryFn: () => inventoryApi.getForecast(bid).then(r => r.data.data),
    enabled: !!bid && tab === 'forecast',
  })

  const { data: deadData, isLoading: deadLoading } = useQuery({
    queryKey: ['inventory-dead', bid],
    queryFn: () => inventoryApi.getDeadStock(bid, { days: 30 }).then(r => r.data.data),
    enabled: !!bid && tab === 'deadstock',
  })

  const { data: movementsData, isLoading: moveLoading } = useQuery({
    queryKey: ['inventory-movements', bid],
    queryFn: () => inventoryApi.getMovements(bid, { limit: 50 }).then(r => r.data),
    enabled: !!bid && tab === 'movements',
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', bid],
    queryFn: () => supplierApi.getAll(bid).then(r => r.data.data),
    enabled: !!bid,
  })

  const { mutate: archiveP } = useMutation({
    mutationFn: (id) => inventoryApi.archiveProduct(bid, id),
    onSuccess: () => { qc.invalidateQueries(['inventory']); toast.success('Product archived') },
  })

  const { mutate: restoreP } = useMutation({
    mutationFn: (id) => inventoryApi.restoreProduct(bid, id),
    onSuccess: () => { qc.invalidateQueries(['inventory']); toast.success('Product restored') },
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const products = data?.data || []
  const lowStockCount = products.filter(p => p.quantity <= p.lowStockThreshold).length

  const TABS = [
    { key: 'products', label: '📦 Products' },
    { key: 'movements', label: '🔄 Movements' },
    { key: 'leakage', label: '🔍 Leakage' },
    { key: 'forecast', label: '📈 Forecast' },
    { key: 'deadstock', label: '💤 Dead Stock' },
    { key: 'report', label: '📊 Report' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Inventory</h1>
          <p className="text-gray-500 text-sm">{data?.pagination?.total || 0} products · {lowStockCount} low stock</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pos">
            <Button variant="success">⚡ POS Checkout</Button>
          </Link>
          <Button onClick={() => { setEditProduct(null); setShowModal(true) }}>+ Add Product</Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-white shadow text-orange-600' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {tab === 'products' && (
        <Card padding={false}>
          <div className="p-4 flex flex-wrap gap-3 border-b border-gray-100">
            <input placeholder="🔍 Search products (name, SKU, barcode, brand...)" className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="accent-orange-500" />
              <span className="text-sm text-gray-700">Low Stock</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="accent-gray-500" />
              <span className="text-sm text-gray-700">Archived</span>
            </label>
          </div>

          {isLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : products.length === 0 ? (
              <EmptyState icon="📦" title="No Products Yet" description="Add your first product to start tracking inventory." action={<Button onClick={() => setShowModal(true)}>Add First Product</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Product', 'Category', 'Stock', 'Sell Price', 'Cost', 'Profit', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const isLow = p.quantity <= p.lowStockThreshold
                      const profit = p.sellingPrice - p.costPrice
                      return (
                        <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{p.name}</p>
                              {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                              {p.sku && <p className="text-xs text-gray-300">SKU: {p.sku}</p>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-500">{p.category || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{p.quantity}</span>
                            <span className="text-gray-400 text-xs ml-1">{p.unit}s</span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-900">₦{p.sellingPrice.toLocaleString()}</td>
                          <td className="py-3 px-4 text-gray-500">₦{(p.costPrice || 0).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`font-medium ${profit > 0 ? 'text-green-600' : 'text-red-500'}`}>₦{profit.toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-4">
                            {p.isArchived ? <Badge color="gray">Archived</Badge>
                              : isLow ? <Badge color="red">Low Stock</Badge>
                                : p.quantity === 0 ? <Badge color="red">Out of Stock</Badge>
                                  : <Badge color="green">In Stock</Badge>}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <button onClick={() => setStockProduct(p)} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Stock</button>
                              <button onClick={() => { setEditProduct(p); setShowModal(true) }} className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100">Edit</button>
                              {p.isArchived
                                ? <button onClick={() => restoreP(p._id)} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">Restore</button>
                                : <button onClick={() => archiveP(p._id)} className="px-2 py-1 text-xs bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100">Archive</button>
                              }
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </Card>
      )}

      {/* Movements Tab */}
      {tab === 'movements' && (
        <Card padding={false}>
          {moveLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Date', 'Product', 'Type', 'Qty Change', 'Before', 'After', 'Reason', 'By'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(movementsData?.data || []).map(m => (
                    <tr key={m._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-medium">{m.product?.name || '—'}</td>
                      <td className="py-3 px-4">
                        <Badge color={m.type === 'stock_in' ? 'green' : m.type === 'sale' ? 'blue' : m.type === 'damage' ? 'red' : 'gray'}>
                          {m.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className={`py-3 px-4 font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                      <td className="py-3 px-4 text-gray-500">{m.quantityBefore}</td>
                      <td className="py-3 px-4 text-gray-900 font-medium">{m.quantityAfter}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{m.reason || '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{m.performedBy?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(movementsData?.data || []).length && <div className="text-center py-8 text-gray-400">No movements recorded yet</div>}
            </div>
          )}
        </Card>
      )}

      {/* Leakage Tab */}
      {tab === 'leakage' && (
        <div className="space-y-4">
          <Card className="bg-amber-50 border-amber-200">
            <p className="text-amber-800 text-sm">🔍 AI scans your expected vs actual stock to detect possible theft, loss, or data errors.</p>
          </Card>
          {leakLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !(leakageData || []).length ? (
              <Card><EmptyState icon="✅" title="No Leakage Detected" description="Your inventory looks clean! All products match expected quantities." /></Card>
            ) : (
              <div className="grid gap-4">
                {leakageData.map(item => (
                  <Card key={item._id} className="border-l-4 border-red-400">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <div className="flex gap-6 mt-2 text-sm">
                          <div><p className="text-gray-400 text-xs">Expected</p><p className="font-bold text-blue-600">{item.expected}</p></div>
                          <div><p className="text-gray-400 text-xs">Actual</p><p className="font-bold text-green-600">{item.actual}</p></div>
                          <div><p className="text-gray-400 text-xs">Missing</p><p className="font-bold text-red-600">{item.difference}</p></div>
                          <div><p className="text-gray-400 text-xs">Est. Loss</p><p className="font-bold text-red-700">₦{(item.estimatedLoss || 0).toLocaleString()}</p></div>
                        </div>
                      </div>
                      <Badge color={item.riskLevel === 'HIGH' ? 'red' : item.riskLevel === 'MEDIUM' ? 'yellow' : 'gray'}>{item.riskLevel} RISK</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Forecast Tab */}
      {tab === 'forecast' && (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <p className="text-blue-800 text-sm">📈 AI analyzes your sales velocity to predict which products need restocking within 14 days.</p>
          </Card>
          {forecastLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !(forecastData || []).length ? (
              <Card><EmptyState icon="🎉" title="Stock Levels Look Good" description="No products need urgent restocking right now." /></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {forecastData.map(item => (
                  <Card key={item._id} className={`border-l-4 ${item.daysRemaining < 3 ? 'border-red-400' : item.daysRemaining < 7 ? 'border-yellow-400' : 'border-blue-400'}`}>
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <div><p className="text-gray-400 text-xs">Daily Sales</p><p className="font-bold">{item.dailyVelocity?.toFixed(1)}/day</p></div>
                      <div><p className="text-gray-400 text-xs">Stock Left</p><p className="font-bold">{item.currentStock}</p></div>
                      <div><p className="text-gray-400 text-xs">Days Left</p><p className={`font-bold ${item.daysRemaining < 3 ? 'text-red-600' : 'text-yellow-600'}`}>{Math.floor(item.daysRemaining)} days</p></div>
                    </div>
                    <p className={`mt-2 text-xs font-medium ${item.daysRemaining < 3 ? 'text-red-600' : 'text-yellow-700'}`}>
                      ⚠️ Restock within {item.daysRemaining < 3 ? 'TODAY' : `${Math.floor(item.daysRemaining)} days`}
                    </p>
                  </Card>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Dead Stock Tab */}
      {tab === 'deadstock' && (
        <div className="space-y-4">
          <Card className="bg-gray-50 border-gray-200">
            <p className="text-gray-700 text-sm">💤 Products that haven't sold in 30+ days. Consider discounting or bundling to move stock.</p>
          </Card>
          {deadLoading ? <div className="flex justify-center py-12"><Spinner /></div>
            : !(deadData || []).length ? (
              <Card><EmptyState icon="🚀" title="No Dead Stock" description="All your products are selling. Great work!" /></Card>
            ) : (
              <Card padding={false}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Product', 'Category', 'Stock', 'Stock Value', 'Last Sold', 'Days Stale', 'Action'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deadData.map(p => (
                      <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{p.name}</td>
                        <td className="py-3 px-4 text-gray-500">{p.category || '—'}</td>
                        <td className="py-3 px-4">{p.quantity}</td>
                        <td className="py-3 px-4 text-red-600 font-medium">₦{(p.stockValue || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{p.lastSoldAt ? new Date(p.lastSoldAt).toLocaleDateString() : 'Never'}</td>
                        <td className="py-3 px-4"><Badge color="gray">{p.staleDays ? `${p.staleDays}d` : 'Never sold'}</Badge></td>
                        <td className="py-3 px-4 text-xs text-blue-600 font-medium">{p.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
        </div>
      )}

      {/* Report Tab */}
      {tab === 'report' && (
        <div className="space-y-4">
          {reportData && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Products', value: reportData.totalProducts, icon: '📦', color: 'blue' },
                  { label: 'Stock Cost Value', value: `₦${(reportData.totalStockValue || 0).toLocaleString()}`, icon: '💰', color: 'orange' },
                  { label: 'Retail Value', value: `₦${(reportData.totalRetailValue || 0).toLocaleString()}`, icon: '🏷️', color: 'green' },
                  { label: 'Potential Profit', value: `₦${(reportData.potentialProfit || 0).toLocaleString()}`, icon: '📈', color: 'purple' },
                ].map(s => (
                  <Card key={s.label} className="text-center">
                    <div className="text-3xl mb-2">{s.icon}</div>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  </Card>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <p className="font-semibold text-red-600 mb-3">⚠️ Low Stock ({reportData.lowStockCount})</p>
                  {reportData.lowStockProducts?.slice(0, 5).map(p => (
                    <div key={p._id} className="flex justify-between py-1 text-sm border-b border-gray-50 last:border-0">
                      <span className="text-gray-900">{p.name}</span>
                      <span className="font-bold text-red-500">{p.quantity} left</span>
                    </div>
                  ))}
                  {!reportData.lowStockProducts?.length && <p className="text-gray-400 text-sm">None</p>}
                </Card>
                <Card>
                  <p className="font-semibold text-gray-500 mb-3">🚫 Out of Stock ({reportData.outOfStockCount})</p>
                  {reportData.outOfStockProducts?.slice(0, 5).map(p => (
                    <div key={p._id} className="flex justify-between py-1 text-sm border-b border-gray-50 last:border-0">
                      <span className="text-gray-900">{p.name}</span>
                      <Badge color="red">0 stock</Badge>
                    </div>
                  ))}
                  {!reportData.outOfStockProducts?.length && <p className="text-gray-400 text-sm text-center py-4">✅ All products have stock</p>}
                </Card>
              </div>
            </>
          )}
          {!reportData && <div className="flex justify-center py-12"><Spinner /></div>}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditProduct(null) }}
        title={editProduct ? 'Edit Product' : 'Add Product'} size="lg">
        <ProductForm
          onClose={() => { setShowModal(false); setEditProduct(null) }}
          businessId={bid}
          product={editProduct}
          suppliers={suppliersData || []}
        />
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal open={!!stockProduct} onClose={() => setStockProduct(null)} title="Adjust Stock">
        {stockProduct && (
          <StockAdjustModal product={stockProduct} businessId={bid} onClose={() => setStockProduct(null)} />
        )}
      </Modal>
    </div>
  )
}
