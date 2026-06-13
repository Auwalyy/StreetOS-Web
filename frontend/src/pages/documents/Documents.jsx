import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import { format } from 'date-fns'
import { useAuthStore } from '../../store/authStore'
import { customerApi, productApi } from '../../api/services'
import { Button, Card, Input, Select, Modal } from '../../components/ui'
import toast from 'react-hot-toast'

const DOC_TYPES = [
  { value: 'invoice', label: '📄 Invoice', desc: 'Bill a customer for goods or services' },
  { value: 'receipt', label: '🧾 Receipt', desc: 'Confirm a payment received' },
  { value: 'quotation', label: '💬 Quotation', desc: 'Give a price quote before selling' },
  { value: 'purchase_order', label: '📦 Purchase Order', desc: 'Order goods from a supplier' },
  { value: 'delivery_note', label: '🚚 Delivery Note', desc: 'Confirm goods delivered' },
]

function DocumentPreview({ doc, business, ref: printRef }) {
  const { type, customerName, customerPhone, customerAddress, items, notes, docNumber, date, dueDate } = doc
  const subtotal = items.reduce((a, i) => a + (Number(i.qty) * Number(i.price)), 0)
  const tax = subtotal * (doc.taxRate / 100)
  const total = subtotal + tax

  const typeLabels = { invoice: 'INVOICE', receipt: 'RECEIPT', quotation: 'QUOTATION', purchase_order: 'PURCHASE ORDER', delivery_note: 'DELIVERY NOTE' }

  return (
    <div ref={printRef} className="bg-white p-8 max-w-2xl mx-auto font-sans text-sm" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-orange-500">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {business?.logo ? <img src={business.logo} alt="logo" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">{business?.name?.[0]}</div>}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{business?.name}</h2>
              <p className="text-gray-500 text-xs">{business?.address?.city}, {business?.address?.state}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">{business?.phone} · {business?.email}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-orange-500">{typeLabels[type]}</p>
          <p className="text-gray-600 mt-1">#{docNumber}</p>
          <p className="text-gray-400 text-xs">{format(new Date(date), 'dd MMMM yyyy')}</p>
          {dueDate && <p className="text-red-500 text-xs mt-1">Due: {format(new Date(dueDate), 'dd MMM yyyy')}</p>}
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{type === 'purchase_order' ? 'Supplier' : 'Bill To'}</p>
        <p className="font-semibold text-gray-900">{customerName}</p>
        {customerPhone && <p className="text-gray-500">{customerPhone}</p>}
        {customerAddress && <p className="text-gray-500">{customerAddress}</p>}
      </div>

      {/* Items Table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">Description</th>
            <th className="text-center py-2 px-3 text-xs text-gray-500 uppercase">Qty</th>
            <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Unit Price</th>
            <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-3 px-3 text-gray-800">{item.description}</td>
              <td className="py-3 px-3 text-center text-gray-600">{item.qty}</td>
              <td className="py-3 px-3 text-right text-gray-600">₦{Number(item.price).toLocaleString()}</td>
              <td className="py-3 px-3 text-right font-medium text-gray-900">₦{(Number(item.qty) * Number(item.price)).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-56">
          <div className="flex justify-between py-1"><span className="text-gray-500">Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
          {doc.taxRate > 0 && <div className="flex justify-between py-1"><span className="text-gray-500">Tax ({doc.taxRate}%)</span><span>₦{tax.toLocaleString()}</span></div>}
          <div className="flex justify-between py-2 border-t-2 border-gray-900 mt-1 font-bold text-lg">
            <span>TOTAL</span><span className="text-orange-500">₦{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p className="text-xs text-gray-400 mb-1">Notes</p>
          <p className="text-gray-700 text-sm">{notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>Generated by <strong>StreetOS AI</strong> · The Financial OS for Africa's Informal Economy</p>
        <p className="mt-1">Thank you for your business!</p>
      </div>
    </div>
  )
}

export default function Documents() {
  const { currentBusiness, user } = useAuthStore()
  const printRef = useRef()
  const [docType, setDocType] = useState('')
  const [preview, setPreview] = useState(false)
  const [doc, setDoc] = useState({
    type: 'invoice',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    docNumber: `DOC-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [{ description: '', qty: 1, price: '' }],
    notes: '',
    taxRate: 0,
  })

  const handlePrint = useReactToPrint({ contentRef: printRef })

  const addItem = () => setDoc(d => ({ ...d, items: [...d.items, { description: '', qty: 1, price: '' }] }))
  const removeItem = (i) => setDoc(d => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i, k, v) => setDoc(d => ({ ...d, items: d.items.map((item, idx) => idx === i ? { ...item, [k]: v } : item) }))

  const total = doc.items.reduce((a, i) => a + (Number(i.qty) * Number(i.price)), 0)

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  if (!docType) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📄 Document Generator</h1>
          <p className="text-gray-500 text-sm">Create professional business documents instantly</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOC_TYPES.map(t => (
            <button key={t.value} onClick={() => { setDocType(t.value); setDoc(d => ({ ...d, type: t.value, docNumber: `${t.value.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-6)}` })) }}
              className="p-6 bg-white rounded-xl border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all text-left">
              <p className="text-3xl mb-3">{t.label.split(' ')[0]}</p>
              <p className="font-semibold text-gray-900">{t.label.split(' ').slice(1).join(' ')}</p>
              <p className="text-sm text-gray-400 mt-1">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setDocType('')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">←</button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create {doc.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h1>
            <p className="text-gray-500 text-sm">#{doc.docNumber}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setPreview(true)}>👁️ Preview</Button>
          <Button onClick={handlePrint}>🖨️ Print / Save PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Document Info</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Document Number" value={doc.docNumber} onChange={e => setDoc(d => ({ ...d, docNumber: e.target.value }))} />
              <Input label="Date" type="date" value={doc.date} onChange={e => setDoc(d => ({ ...d, date: e.target.value }))} />
              {['invoice', 'quotation'].includes(doc.type) && <Input label="Due Date" type="date" value={doc.dueDate} onChange={e => setDoc(d => ({ ...d, dueDate: e.target.value }))} />}
              <Input label="Tax Rate (%)" type="number" value={doc.taxRate} onChange={e => setDoc(d => ({ ...d, taxRate: Number(e.target.value) }))} min="0" max="100" />
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">{doc.type === 'purchase_order' ? 'Supplier Details' : 'Customer Details'}</h3>
            <div className="space-y-3">
              <Input label="Name *" placeholder="Customer / Supplier Name" value={doc.customerName} onChange={e => setDoc(d => ({ ...d, customerName: e.target.value }))} required />
              <Input label="Phone" placeholder="+234 800 000 0000" value={doc.customerPhone} onChange={e => setDoc(d => ({ ...d, customerPhone: e.target.value }))} />
              <Input label="Address" placeholder="Address" value={doc.customerAddress} onChange={e => setDoc(d => ({ ...d, customerAddress: e.target.value }))} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Items</h3>
              <Button size="sm" variant="secondary" onClick={addItem}>+ Add Item</Button>
            </div>
            <div className="space-y-3">
              {doc.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {i === 0 && <label className="text-xs text-gray-500 mb-1 block">Description</label>}
                    <input className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Item description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label className="text-xs text-gray-500 mb-1 block">Qty</label>}
                    <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} min="1" />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <label className="text-xs text-gray-500 mb-1 block">Unit Price (₦)</label>}
                    <input type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="0" value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} min="0" />
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <label className="text-xs text-gray-500 mb-1 block">Total</label>}
                    <p className="py-2 text-sm font-medium text-gray-900">₦{(Number(item.qty) * Number(item.price || 0)).toLocaleString()}</p>
                  </div>
                  <div className="col-span-1">
                    {doc.items.length > 1 && <button onClick={() => removeItem(i)} className="p-2 text-red-400 hover:text-red-500">✕</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-orange-500">₦{(total * (1 + doc.taxRate / 100)).toLocaleString()}</span>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-3">Notes / Terms</h3>
            <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" rows={3} placeholder="Payment terms, delivery instructions, thank you note..." value={doc.notes} onChange={e => setDoc(d => ({ ...d, notes: e.target.value }))} />
          </Card>
        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Live Preview</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden scale-[0.85] origin-top-left" style={{ width: '118%' }}>
              <DocumentPreview doc={doc} business={currentBusiness} />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden print target */}
      <div className="hidden">
        <DocumentPreview doc={doc} business={currentBusiness} ref={printRef} />
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title="Document Preview" size="xl">
        <div className="overflow-y-auto max-h-[70vh]">
          <DocumentPreview doc={doc} business={currentBusiness} />
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t">
          <Button variant="secondary" className="flex-1" onClick={() => setPreview(false)}>Close</Button>
          <Button className="flex-1" onClick={handlePrint}>🖨️ Print / Download PDF</Button>
        </div>
      </Modal>
    </div>
  )
}
