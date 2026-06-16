import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import { format } from 'date-fns'
import { useAuthStore } from '../../store/authStore'
import { salesApi } from '../../api/services'
import { Button, Spinner } from '../../components/ui'

export default function Invoice() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentBusiness } = useAuthStore()
  const printRef = useRef()

  const handlePrint = useReactToPrint({ contentRef: printRef })

  const shareWhatsApp = (sale) => {
    if (!sale) return
    const items = sale.products?.map(p => `  - ${p.name} x${p.quantity} = \u20a6${p.total?.toLocaleString()}`).join('\n')
    const msg = [
      `\ud83e\udfe7 *RECEIPT from ${currentBusiness?.name}*`,
      `Receipt No: #${sale._id?.slice(-8).toUpperCase()}`,
      `Date: ${format(new Date(sale.createdAt), 'dd MMM yyyy, HH:mm')}`,
      ``,
      `*Items:*`,
      items,
      ``,
      `Subtotal: \u20a6${sale.subtotal?.toLocaleString()}`,
      sale.discount > 0 ? `Discount: -\u20a6${sale.discount?.toLocaleString()}` : null,
      `*TOTAL: \u20a6${sale.total?.toLocaleString()}*`,
      `Payment: ${sale.paymentMethod?.toUpperCase()} (${sale.paymentStatus})`,
      ``,
      `_Thank you for shopping at ${currentBusiness?.name}!_ \ud83d\ude4f`,
      `_Powered by StreetOS AI_`,
    ].filter(Boolean).join('\n')

    const phone = sale.customer?.phone?.replace(/[^0-9]/g, '')
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesApi.getSale(currentBusiness._id, id).then(r => r.data.data),
    enabled: !!currentBusiness && !!id,
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!sale) return <div className="text-center py-20 text-gray-400">Sale not found</div>

  const statusColor = { paid: 'text-green-600', pending: 'text-red-500', partial: 'text-yellow-600' }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/pos')} className="text-sm text-gray-500 hover:text-gray-700">← New Sale</button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/sales')}>View All Sales</Button>
          <Button variant="success" onClick={() => shareWhatsApp(sale)}>📱 WhatsApp Receipt</Button>
          <Button onClick={handlePrint}>🖨️ Print Receipt</Button>
        </div>
      </div>

      {/* Receipt */}
      <div ref={printRef} className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-orange-500">
          <div className="flex items-center gap-3">
            {currentBusiness?.logo
              ? <img src={currentBusiness.logo} className="w-12 h-12 rounded-xl object-cover" alt="logo" />
              : <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">{currentBusiness?.name?.[0]}</div>
            }
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentBusiness?.name}</h2>
              <p className="text-gray-500 text-xs">{currentBusiness?.address?.city}, {currentBusiness?.address?.state}</p>
              <p className="text-gray-400 text-xs">{currentBusiness?.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-500">RECEIPT</p>
            <p className="text-gray-600 text-sm mt-1">#{sale._id?.slice(-8).toUpperCase()}</p>
            <p className="text-gray-400 text-xs">{format(new Date(sale.createdAt), 'dd MMM yyyy · HH:mm')}</p>
            <p className={`font-bold text-sm mt-1 capitalize ${statusColor[sale.paymentStatus]}`}>{sale.paymentStatus}</p>
          </div>
        </div>

        {/* Customer */}
        {sale.customer && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Customer</p>
            <p className="font-semibold text-gray-900">{sale.customer.name}</p>
            {sale.customer.phone && <p className="text-gray-500 text-sm">{sale.customer.phone}</p>}
          </div>
        )}

        {/* Items */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">Item</th>
              <th className="text-center py-2 px-3 text-xs text-gray-500 uppercase">Qty</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Price</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.products?.map((item, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-3 px-3 text-gray-800">{item.name}</td>
                <td className="py-3 px-3 text-center text-gray-600">{item.quantity}</td>
                <td className="py-3 px-3 text-right text-gray-600">₦{item.unitPrice?.toLocaleString()}</td>
                <td className="py-3 px-3 text-right font-medium text-gray-900">₦{item.total?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-52 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₦{sale.subtotal?.toLocaleString()}</span></div>
            {sale.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₦{sale.discount?.toLocaleString()}</span></div>}
            <div className="flex justify-between pt-2 border-t-2 border-gray-900 font-bold text-base">
              <span>TOTAL</span><span className="text-orange-500">₦{sale.total?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-500"><span>Paid</span><span>₦{sale.amountPaid?.toLocaleString()}</span></div>
            {sale.total > sale.amountPaid && (
              <div className="flex justify-between text-red-500 font-bold"><span>Balance</span><span>₦{(sale.total - sale.amountPaid)?.toLocaleString()}</span></div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 flex gap-6 text-sm">
          <div><p className="text-gray-400 text-xs">Payment Method</p><p className="font-semibold capitalize">{sale.paymentMethod}</p></div>
          <div><p className="text-gray-400 text-xs">Status</p><p className={`font-semibold capitalize ${statusColor[sale.paymentStatus]}`}>{sale.paymentStatus}</p></div>
        </div>

        {sale.notes && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
            <p className="text-gray-400 text-xs mb-1">Notes</p>
            <p className="text-gray-700">{sale.notes}</p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          <p>Generated by <strong>StreetOS AI</strong> · The Financial OS for Africa's Informal Economy</p>
          <p className="mt-1">Thank you for your business!</p>
        </div>
      </div>
    </div>
  )
}
