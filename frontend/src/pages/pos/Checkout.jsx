import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { inventoryApi, customerApi, salesApi } from '../../api/services'
import { Button, Card, Modal, Input, Badge } from '../../components/ui'

const PAYMENT_METHODS = ['cash', 'transfer', 'pos', 'opay', 'moniepoint', 'palmpay']

function ProductSearch({ onAdd, businessId }) {
  const [search, setSearch] = useState('')

  const { data } = useQuery({
    queryKey: ['pos-products', businessId, search],
    queryFn: () => inventoryApi.getProducts(businessId, { search, limit: 20 }).then(r => r.data.data),
    enabled: !!businessId && search.length > 0,
  })

  return (
    <div className="relative">
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Search product name, SKU or barcode..."
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        autoFocus
      />
      {data?.length > 0 && search && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-72 overflow-y-auto">
          {data.map(p => (
            <button
              key={p._id}
              onClick={() => { onAdd(p); setSearch('') }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors text-left border-b border-gray-50 last:border-0"
            >
              <div>
                <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                <p className="text-xs text-gray-400">{p.category} · {p.quantity} {p.unit}s left</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-600">₦{p.sellingPrice.toLocaleString()}</p>
                {p.quantity === 0 && <Badge color="red">Out of stock</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Checkout() {
  const { currentBusiness } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState('')
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState('paid') // paid | pending | partial

  const bid = currentBusiness?._id

  const { data: customers } = useQuery({
    queryKey: ['pos-customers', bid, customerSearch],
    queryFn: () => customerApi.getAll(bid, { search: customerSearch }).then(r => r.data.data),
    enabled: !!bid && customerSearch.length > 1,
  })

  const { mutate: checkout, isPending } = useMutation({
    mutationFn: () => {
      const products = cart.map(item => ({
        product: item._id,
        name: item.name,
        quantity: item.qty,
        unitPrice: item.sellingPrice,
        total: item.sellingPrice * item.qty,
      }))
      return salesApi.createSale(bid, {
        products,
        customer: customer?._id,
        subtotal,
        discount: Number(discount),
        total,
        amountPaid: paymentStatus === 'paid' ? total : Number(amountPaid) || 0,
        paymentMethod,
        paymentStatus,
        notes: note,
      })
    },
    onSuccess: ({ data }) => {
      qc.invalidateQueries(['inventory'])
      qc.invalidateQueries(['analytics-dashboard'])
      qc.invalidateQueries(['transactions'])
      toast.success('✅ Sale completed!')
      navigate(`/invoice/${data.data._id}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Checkout failed'),
  })

  const addToCart = (product) => {
    if (product.quantity === 0) return toast.error(`${product.name} is out of stock`)
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id)
      if (existing) {
        if (existing.qty >= product.quantity) return toast.error(`Only ${product.quantity} ${product.unit}s available`) || prev
        return prev.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id, qty) => {
    const item = cart.find(i => i._id === id)
    if (qty > item.quantity) return toast.error(`Only ${item.quantity} ${item.unit}s in stock`)
    if (qty < 1) return removeItem(id)
    setCart(prev => prev.map(i => i._id === id ? { ...i, qty } : i))
  }

  const removeItem = (id) => setCart(prev => prev.filter(i => i._id !== id))

  const updatePrice = (id, price) => {
    setCart(prev => prev.map(i => i._id === id ? { ...i, sellingPrice: Number(price) } : i))
  }

  const subtotal = cart.reduce((a, i) => a + i.sellingPrice * i.qty, 0)
  const total = Math.max(0, subtotal - Number(discount))
  const change = Number(amountPaid) - total

  if (!currentBusiness) return (
    <div className="text-center py-20 text-gray-400">Select a business first</div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⚡ POS Checkout</h1>
          <p className="text-gray-500 text-sm">Quick sale — products auto-deducted from inventory</p>
        </div>
        <button onClick={() => navigate('/inventory')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Inventory
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT — Product Search + Cart */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <ProductSearch onAdd={addToCart} businessId={bid} />
          </Card>

          <Card padding={false}>
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                🛒 Cart <span className="text-gray-400 font-normal text-sm">({cart.length} items)</span>
              </h3>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🛒</p>
                <p className="text-sm">Search and add products above</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cart.map(item => (
                  <div key={item._id} className="flex items-center gap-3 px-4 py-3">
                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.quantity} {item.unit}s in stock</p>
                    </div>

                    {/* Price (editable) */}
                    <div className="w-28">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <span className="px-2 text-gray-400 text-xs bg-gray-50 py-2 border-r border-gray-200">₦</span>
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={e => updatePrice(item._id, e.target.value)}
                          className="w-full px-2 py-1.5 text-sm text-right focus:outline-none"
                          min="0"
                        />
                      </div>
                    </div>

                    {/* Qty controls */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item._id, item.qty - 1)} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center">−</button>
                      <span className="w-8 text-center font-bold text-sm">{item.qty}</span>
                      <button onClick={() => updateQty(item._id, item.qty + 1)} className="w-7 h-7 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold text-sm flex items-center justify-center">+</button>
                    </div>

                    {/* Line total */}
                    <div className="w-24 text-right">
                      <p className="font-bold text-gray-900 text-sm">₦{(item.sellingPrice * item.qty).toLocaleString()}</p>
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeItem(item._id)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — Payment Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer */}
          <Card>
            <p className="text-sm font-semibold text-gray-700 mb-3">👤 Customer (optional)</p>
            {customer ? (
              <div className="flex items-center justify-between bg-orange-50 rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{customer.name}</p>
                  <p className="text-xs text-gray-400">{customer.phone}</p>
                  {customer.creditLimit > 0 && (
                    <div className="mt-1">
                      {customer.creditBlocked ? (
                        <span className="text-xs font-bold text-red-600">🔒 Credit blocked — cash only</span>
                      ) : customer.totalDebt + total > customer.creditLimit ? (
                        <span className="text-xs font-bold text-red-600">⚠️ Over credit limit (₦{customer.creditLimit.toLocaleString()})</span>
                      ) : (
                        <span className="text-xs text-gray-500">Credit: ₦{customer.totalDebt?.toLocaleString()} / ₦{customer.creditLimit.toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setCustomer(null)} className="text-gray-400 hover:text-red-400 text-sm">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {customers?.length > 0 && customerSearch && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-40 overflow-y-auto">
                    {customers.map(c => (
                      <button key={c._id} onClick={() => { setCustomer(c); setCustomerSearch('') }}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 text-sm border-b border-gray-50 last:border-0">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Order Summary */}
          <Card>
            <p className="text-sm font-semibold text-gray-700 mb-3">📋 Order Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Discount (₦)</span>
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  min="0"
                  max={subtotal}
                  className="w-28 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Total</span>
                <span className="text-orange-600">₦{total.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Payment Method */}
          <Card>
            <p className="text-sm font-semibold text-gray-700 mb-3">💳 Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-lg text-xs font-medium capitalize transition-all ${paymentMethod === m ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {m}
                </button>
              ))}
            </div>

            {/* Payment Status */}
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Payment Status</p>
              <div className="flex gap-2">
                {[['paid', '✅ Paid in Full'], ['pending', '⏳ Pay Later'], ['partial', '💰 Part Payment']].map(([v, l]) => (
                  <button key={v} onClick={() => setPaymentStatus(v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${paymentStatus === v ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Paid */}
            {paymentStatus !== 'pending' && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 block mb-1">Amount Received (₦)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder={total.toString()}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {amountPaid && change > 0 && (
                  <p className="text-green-600 font-bold text-sm mt-1">Change: ₦{change.toLocaleString()}</p>
                )}
                {amountPaid && change < 0 && (
                  <p className="text-red-500 font-bold text-sm mt-1">Balance: ₦{Math.abs(change).toLocaleString()}</p>
                )}
              </div>
            )}
          </Card>

          {/* Note */}
          <Card>
            <label className="text-xs text-gray-500 block mb-1">Note (optional)</label>
            <textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a note to this sale..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </Card>

          {/* Checkout Button */}
          <Button
            onClick={() => checkout()}
            loading={isPending}
            disabled={cart.length === 0}
            size="lg"
            className="w-full"
          >
            {isPending ? 'Processing...' : `⚡ Complete Sale — ₦${total.toLocaleString()}`}
          </Button>

          {cart.length === 0 && (
            <p className="text-center text-xs text-gray-400">Add products to the cart to proceed</p>
          )}
        </div>
      </div>
    </div>
  )
}
