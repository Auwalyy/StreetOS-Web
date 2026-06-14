import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useRef } from 'react'
import { useAuthStore } from '../../store/authStore'
import { salesApi } from '../../api/services'
import { Button, Badge, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`

export default function Invoice() {
  const { id } = useParams()
  const { currentBusiness } = useAuthStore()
  const navigate = useNavigate()
  const printRef = useRef(null)
  const bid = currentBusiness?._id

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', bid, id],
    queryFn: () => salesApi.getSale(bid, id).then(r => r.data.data),
    enabled: !!bid && !!id,
  })

  const { mutate: voidSale, isPending: voiding } = useMutation({
    mutationFn: () => salesApi.voidSale(bid, id),
    onSuccess: () => { toast.success('Sale voided'); navigate('/sales') },
    onError: e => toast.error(e.response?.data?.message || 'Failed to void'),
  })

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    if (!sale) return
    const lines = sale.items.map(i => `  • ${i.name} x${i.quantity} = ${fmt(i.total)}`).join('\n')
    const msg = `*Receipt - ${sale.invoiceNumber}*\n\n${lines}\n\nSubtotal: ${fmt(sale.subtotal)}\nDiscount: ${fmt(sale.discount)}\n*Total: ${fmt(sale.total)}*\n\nPayment: ${sale.paymentMethod} (${sale.paymentStatus})\n\nThank you for shopping with ${currentBusiness.name}!`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (!currentBusiness) return null
  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!sale) return <div className="text-center py-20 text-gray-400">Invoice not found</div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">← Back</button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleWhatsApp}>📱 WhatsApp</Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>🖨️ Print</Button>
          <Button variant="danger" size="sm" loading={voiding}
            onClick={() => { if (window.confirm('Void this sale? Stock will be restored.')) voidSale() }}>
            Void Sale
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div ref={printRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 print:shadow-none print:border-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 border-b border-gray-100 pb-6">
          <div>
            <h1 className="text-3xl font-black text-orange-500">{currentBusiness.name}</h1>
            {currentBusiness.address && <p className="text-gray-500 text-sm mt-1">{currentBusiness.address}</p>}
            {currentBusiness.phone && <p className="text-gray-500 text-sm">{currentBusiness.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">RECEIPT</p>
            <p className="text-sm font-mono text-gray-500 mt-1">{sale.invoiceNumber}</p>
            <p className="text-sm text-gray-400">{new Date(sale.date).toLocaleString()}</p>
          </div>
        </div>

        {/* Customer & Staff */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium mb-1">Customer</p>
            <p className="font-semibold text-gray-900">{sale.customerName}</p>
            {sale.customer?.phone && <p className="text-sm text-gray-500">{sale.customer.phone}</p>}
            {sale.customer?.email && <p className="text-sm text-gray-500">{sale.customer.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase font-medium mb-1">Served By</p>
            <p className="font-medium text-gray-700">{sale.soldBy?.name || '—'}</p>
            <p className="text-xs text-gray-400">{sale.priceType} pricing</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-gray-600 font-semibold">Item</th>
              <th className="text-center py-2 text-gray-600 font-semibold">Qty</th>
              <th className="text-right py-2 text-gray-600 font-semibold">Unit Price</th>
              <th className="text-right py-2 text-gray-600 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-3">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                </td>
                <td className="py-3 text-center text-gray-600">{item.quantity}</td>
                <td className="py-3 text-right text-gray-600">{fmt(item.unitPrice)}</td>
                <td className="py-3 text-right font-semibold text-gray-900">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{fmt(sale.subtotal)}</span></div>
          {sale.discount > 0 && <div className="flex justify-between text-sm text-red-500"><span>Discount</span><span>-{fmt(sale.discount)}</span></div>}
          {sale.tax > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span>{fmt(sale.tax)}</span></div>}
          <div className="flex justify-between text-xl font-black border-t border-gray-200 pt-3 mt-2">
            <span>TOTAL</span>
            <span className="text-orange-600">{fmt(sale.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Amount Paid</span>
            <span className="font-medium text-green-600">{fmt(sale.amountPaid)}</span>
          </div>
          {sale.change > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Change</span><span className="font-medium">{fmt(sale.change)}</span></div>}
        </div>

        {/* Payment Badge */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <Badge color={sale.paymentStatus === 'paid' ? 'green' : sale.paymentStatus === 'partial' ? 'yellow' : 'red'}>
            {sale.paymentStatus?.toUpperCase()}
          </Badge>
          <span className="text-sm text-gray-500">{sale.paymentMethod}</span>
          {sale.isVoiceEntry && <Badge color="purple">Voice Entry</Badge>}
        </div>

        {/* Notes */}
        {sale.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400 uppercase font-medium mb-1">Notes</p>
            <p className="text-sm text-gray-700">{sale.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-xs border-t border-gray-100 pt-4">
          <p>Thank you for your business!</p>
          <p className="mt-1">Powered by StreetOS AI</p>
        </div>
      </div>

      <style>{`@media print { .print\\:hidden { display: none !important; } }`}</style>
    </div>
  )
}
