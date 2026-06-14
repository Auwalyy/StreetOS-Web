import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { inventoryApi, customerApi, salesApi } from '../../api/services'
import { Button, Badge, Spinner, Modal, Input, Select } from '../../components/ui'

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`

export default function Checkout() {
  const { currentBusiness } = useAuthStore()
  const navigate = useNavigate()
  const bid = currentBusiness?._id
  const searchRef = useRef(null)

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payStatus, setPayStatus] = useState('paid')
  const [amountPaid, setAmountPaid] = useState('')
  const [discount, setDiscount] = useState(0)
  const [priceType, setPriceType] = useState('retail')
  const [notes, setNotes] = useState('')
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [listenActive, setListenActive] = useState(false)
  const [completedSale, setCompletedSale] = useState(null)
  const recognitionRef = useRef(null)

  const { data: productsData } = useQuery({
    queryKey: ['inventory', bid, search],
    queryFn: () => inventoryApi.getProducts(bid, { search, limit: 12 }).then(r => r.data.data),
    enabled: !!bid && search.length > 0,
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers', bid, customerSearch],
    queryFn: () => customerApi.getAll(bid, { search: customerSearch, limit: 10 }).then(r => r.data.data),
    enabled: !!bid && customerSearch.length > 0,
  })

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SR()
      recognitionRef.current.continuous = false
      recognitionRef.current.lang = 'en-NG'
      recognitionRef.current.onresult = (e) => {
        const text = e.results[0][0].transcript
        setVoiceText(text)
        setListenActive(false)
        parseVoiceMutation.mutate({ transcript: text })
      }
      recognitionRef.current.onend = () => setListenActive(false)
    }
  }, [])

  const parseVoiceMutation = useMutation({
    mutationFn: (d) => salesApi.parseVoice(bid, d).then(r => r.data.data),
    onSuccess: (data) => {
      if (data.detectedItems?.length) {
        data.detectedItems.forEach(item => addToCart(item))
        toast.success(`Detected: ${data.detectedItems.map(i => i.name).join(', ')}`)
      }
      if (data.detectedCustomer) setCustomerSearch(data.detectedCustomer)
      setShowVoice(false)
    },
    onError: () => toast.error('Voice parsing failed'),
  })

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const pid = (product._id || product.product)?.toString()
      const existing = prev.find(i => i.product === pid)
      if (existing) {
        const qty = existing.quantity + (product.quantity || 1)
        return prev.map(i => i.product === pid
          ? { ...i, quantity: qty, total: i.unitPrice * qty, profit: (i.unitPrice - i.costPrice) * qty }
          : i)
      }
      const unitPrice = priceType === 'wholesale' && product.wholesalePrice > 0
        ? product.wholesalePrice
        : product.sellingPrice || product.unitPrice
      const qty = product.quantity || 1
      return [...prev, {
        product: pid,
        name: product.name,
        unitPrice,
        costPrice: product.costPrice || 0,
        quantity: qty,
        total: unitPrice * qty,
        profit: (unitPrice - (product.costPrice || 0)) * qty,
        availableStock: product.quantity ?? 999,
        unit: product.unit || 'piece',
      }]
    })
    setSearch('')
    searchRef.current?.focus()
  }, [priceType])

  const updateQty = (pid, qty) => {
    if (qty <= 0) { setCart(p => p.filter(i => i.product !== pid)); return }
    setCart(p => p.map(i => i.product === pid
      ? { ...i, quantity: qty, total: i.unitPrice * qty, profit: (i.unitPrice - i.costPrice) * qty }
      : i))
  }

  const subtotal = cart.reduce((s, i) => s + i.total, 0)
  const discountAmt = discount > 0 ? (discount > 1 ? discount : subtotal * discount / 100) : 0
  const total = subtotal - discountAmt
  const totalProfit = cart.reduce((s, i) => s + i.profit, 0)
  const change = amountPaid ? Math.max(0, Number(amountPaid) - total) : 0

  const { mutate: completeSale, isPending: checkingOut } = useMutation({
    mutationFn: () => salesApi.createSale(bid, {
      items: cart.map(i => ({ product: i.product, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
      customerId: customer?._id,
      customerName: customer?.name || 'Walk-in Customer',
      paymentMethod: payMethod,
      paymentStatus: payStatus,
      amountPaid: Number(amountPaid) || total,
      discount,
      priceType,
      notes,
    }).then(r => r.data.data),
    onSuccess: (sale) => {
      setCompletedSale(sale)
      setCart([])
      setCustomer(null)
      setAmountPaid('')
      setDiscount(0)
      toast.success('✅ Sale completed!')
    },
    onError: e => toast.error(e.response?.data?.message || 'Checkout failed'),
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  if (completedSale) {
    return (
      <div className="max-w-md mx-auto space-y-4 py-8">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600">Sale Complete!</h2>
          <p className="text-gray-500">{completedSale.invoiceNumber}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Customer</span><span className="font-medium">{completedSale.customerName}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Items</span><span className="font-medium">{completedSale.items?.length}</span></div>
          <div className="flex justify-between"><span className="font-bold text-gray-900">Total</span><span className="text-2xl font-bold text-orange-600">{fmt(completedSale.total)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Profit</span><span className="font-medium text-green-600">{fmt(completedSale.totalProfit)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Payment</span><Badge color="green">{completedSale.paymentMethod}</Badge></div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => navigate(`/invoice/${completedSale._id}`)}>🧾 View Invoice</Button>
          <Button className="flex-1" onClick={() => setCompletedSale(null)}>⚡ New Sale</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4">
      {/* LEFT: Product Search */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-gray-900">⚡ POS Checkout</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowVoice(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
              🎤 Voice Sale
            </button>
            <Select value={priceType} onChange={e => setPriceType(e.target.value)} className="!py-2">
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="special">Special</option>
            </Select>
          </div>
        </div>

        <input
          ref={searchRef}
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search product by name, SKU, or barcode..."
          className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl text-base focus:outline-none focus:border-orange-500 bg-orange-50"
        />

        {search && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(productsData || []).map(p => {
              const unitPrice = priceType === 'wholesale' && p.wholesalePrice > 0 ? p.wholesalePrice : p.sellingPrice
              const profit = unitPrice - p.costPrice
              const isOut = p.quantity === 0
              return (
                <button key={p._id} onClick={() => !isOut && addToCart(p)} disabled={isOut}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${isOut ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-orange-400 hover:bg-orange-50 active:scale-95'}`}>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{p.name}</p>
                  {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                  <p className="text-lg font-bold text-orange-600 mt-1">{fmt(unitPrice)}</p>
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs ${p.quantity <= p.lowStockThreshold ? 'text-red-500' : 'text-gray-400'}`}>{p.quantity} {p.unit}s</span>
                    <span className="text-xs text-green-600 font-medium">+{fmt(profit)}</span>
                  </div>
                  {isOut && <p className="text-xs text-red-500 font-medium">Out of stock</p>}
                </button>
              )
            })}
            {productsData?.length === 0 && <div className="col-span-3 text-center py-8 text-gray-400">No products found for "{search}"</div>}
          </div>
        )}

        {!search && cart.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <div className="text-8xl mb-4">🛒</div>
            <p className="text-lg font-medium text-gray-400">Type to search products</p>
            <p className="text-sm">Or scan a barcode · use voice 🎤</p>
          </div>
        )}
      </div>

      {/* RIGHT: Cart & Payment */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        {/* Customer */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">👤 Customer</p>
            {customer && <button onClick={() => setCustomer(null)} className="text-xs text-red-400">Remove</button>}
          </div>
          {customer ? (
            <div className="flex items-center gap-3 p-2 bg-orange-50 rounded-lg">
              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">{customer.name[0]}</div>
              <div>
                <p className="font-medium text-sm">{customer.name}</p>
                <p className="text-xs text-gray-400">{customer.phone} · Trust: {customer.trustScore}/100</p>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCustomerPicker(true)} className="w-full text-sm text-orange-600 border border-orange-200 rounded-lg py-2 hover:bg-orange-50">
              + Select Customer (optional)
            </button>
          )}
        </div>

        {/* Cart */}
        <div className="bg-white rounded-xl border border-gray-100 flex-1 overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <p className="font-semibold text-gray-900">Cart ({cart.length})</p>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-400">Clear all</button>}
          </div>
          <div className="overflow-y-auto max-h-72 divide-y divide-gray-50">
            {cart.length === 0
              ? <div className="text-center py-8 text-gray-300">Cart is empty</div>
              : cart.map(item => (
                <div key={item.product} className="p-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-green-600">profit: {fmt(item.profit)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product, item.quantity - 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold hover:bg-gray-100">−</button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product, item.quantity + 1)}
                      disabled={item.quantity >= item.availableStock}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center font-bold hover:bg-gray-100 disabled:opacity-30">+</button>
                  </div>
                  <div className="text-right min-w-0">
                    <p className="text-sm font-bold">{fmt(item.total)}</p>
                    <p className="text-xs text-gray-400">{fmt(item.unitPrice)}</p>
                  </div>
                  <button onClick={() => setCart(p => p.filter(i => i.product !== item.product))} className="text-red-400 hover:text-red-600 text-lg">×</button>
                </div>
              ))}
          </div>
        </div>

        {/* Payment */}
        {cart.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-20">Discount</span>
              <Input type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="flex-1 !py-1 text-sm" placeholder="₦ or %" />
              {discountAmt > 0 && <span className="text-xs text-red-500 whitespace-nowrap">-{fmt(discountAmt)}</span>}
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-bold">Total</span>
              <span className="text-2xl font-bold text-orange-600">{fmt(total)}</span>
            </div>
            <div className="flex justify-between text-sm bg-green-50 rounded-lg p-2">
              <span className="text-green-700">Profit</span>
              <span className="font-bold text-green-700">{fmt(totalProfit - discountAmt)}</span>
            </div>
            <Select label="Payment Method" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              {['cash', 'transfer', 'pos', 'opay', 'moniepoint', 'palmpay', 'credit'].map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </Select>
            <Select label="Payment Status" value={payStatus} onChange={e => setPayStatus(e.target.value)}>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partial Payment</option>
              <option value="pending">Pending / Credit</option>
            </Select>
            <Input label="Amount Paid (₦)" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={fmt(total)} />
            {change > 0 && <div className="bg-blue-50 rounded-lg p-2 text-center"><p className="text-blue-700 font-bold">Change: {fmt(change)}</p></div>}
            <Button className="w-full py-4 text-lg" onClick={() => completeSale()} loading={checkingOut}>
              ✅ Complete Sale · {fmt(total)}
            </Button>
          </div>
        )}
      </div>

      {/* Customer Picker Modal */}
      <Modal open={showCustomerPicker} onClose={() => setShowCustomerPicker(false)} title="Select Customer" size="sm">
        <div className="space-y-3">
          <Input placeholder="Search customer..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} autoFocus />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(customersData || []).map(c => (
              <button key={c._id} onClick={() => { setCustomer(c); setShowCustomerPicker(false) }}
                className="w-full text-left p-3 rounded-lg border border-gray-100 hover:bg-orange-50 hover:border-orange-200 transition-colors">
                <p className="font-medium">{c.name}</p>
                <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                  <span>{c.phone}</span>
                  <span>Purchases: {fmt(c.totalPurchases)}</span>
                  {c.totalDebt > 0 && <span className="text-red-500">Debt: {fmt(c.totalDebt)}</span>}
                </div>
              </button>
            ))}
            {customerSearch && !customersData?.length && <p className="text-gray-400 text-sm text-center py-4">No customers found</p>}
            {!customerSearch && <p className="text-gray-400 text-sm text-center py-4">Type a name to search</p>}
          </div>
        </div>
      </Modal>

      {/* Voice Modal */}
      <Modal open={showVoice} onClose={() => setShowVoice(false)} title="🎤 Voice Sale Entry" size="sm">
        <div className="space-y-4 text-center">
          <p className="text-gray-500 text-sm">Say something like:<br /><em className="text-gray-700">"I sold 2 bags of rice to Musa"</em></p>
          <button onClick={() => { setVoiceText(''); setListenActive(true); recognitionRef.current?.start() }}
            className={`w-28 h-28 rounded-full mx-auto flex flex-col items-center justify-center text-white font-medium shadow-lg transition-all ${listenActive ? 'bg-red-500 animate-pulse scale-110' : 'bg-orange-500 hover:bg-orange-600'}`}>
            <span className="text-4xl">{listenActive ? '🔴' : '🎤'}</span>
            <span className="text-xs mt-1">{listenActive ? 'Listening...' : 'Tap to speak'}</span>
          </button>
          {voiceText && (
            <div className="bg-gray-50 rounded-xl p-4 text-left">
              <p className="text-xs text-gray-400 mb-1">Heard:</p>
              <p className="font-medium">"{voiceText}"</p>
              {parseVoiceMutation.isPending && <div className="flex items-center gap-2 mt-2 text-orange-500 text-sm"><Spinner size="sm" /> Detecting...</div>}
            </div>
          )}
          <div className="flex gap-2">
            <input value={voiceText} onChange={e => setVoiceText(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Or type your sale..." />
            <Button size="sm" onClick={() => parseVoiceMutation.mutate({ transcript: voiceText })} loading={parseVoiceMutation.isPending}>Parse</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
