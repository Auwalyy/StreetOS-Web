import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'
import { Button, Card, Input, Badge, Spinner, Modal } from '../../components/ui'

const registerApi = {
  getToday: (bid) => api.get(`/businesses/${bid}/register/today`),
  open: (bid, d) => api.post(`/businesses/${bid}/register/open`, d),
  close: (bid, d) => api.post(`/businesses/${bid}/register/close`, d),
  getHistory: (bid) => api.get(`/businesses/${bid}/register/history`),
}

export default function CashRegister() {
  const { currentBusiness, user } = useAuthStore()
  const qc = useQueryClient()
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [showCloseModal, setShowCloseModal] = useState(false)
  const bid = currentBusiness?._id

  const { data: session, isLoading } = useQuery({
    queryKey: ['register-today', bid],
    queryFn: () => registerApi.getToday(bid).then(r => r.data.data),
    enabled: !!bid,
    refetchInterval: 30000,
  })

  const { data: history } = useQuery({
    queryKey: ['register-history', bid],
    queryFn: () => registerApi.getHistory(bid).then(r => r.data.data),
    enabled: !!bid,
  })

  const { mutate: openRegister, isPending: opening } = useMutation({
    mutationFn: () => registerApi.open(bid, { openingBalance: Number(openingBalance) }),
    onSuccess: () => { qc.invalidateQueries(['register-today']); toast.success('✅ Register opened!') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const { mutate: closeRegister, isPending: closing } = useMutation({
    mutationFn: () => registerApi.close(bid, { closingBalance: Number(closingBalance), notes: closingNotes }),
    onSuccess: ({ data }) => {
      qc.invalidateQueries(['register-today'])
      qc.invalidateQueries(['register-history'])
      setShowCloseModal(false)
      const disc = data.data?.discrepancy || 0
      if (disc !== 0) toast.error(`⚠️ Discrepancy: ₦${Math.abs(disc).toLocaleString()} ${disc > 0 ? 'surplus' : 'shortage'}`)
      else toast.success('✅ Register closed. Books balanced!')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>
  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const expectedCash = session ? (session.openingBalance + session.cashSales - (session.cashRefunds || 0)) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏦 Daily Cash Register</h1>
          <p className="text-gray-500 text-sm">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        {session?.status === 'open' && (
          <Button variant="danger" onClick={() => setShowCloseModal(true)}>🔒 Close Register</Button>
        )}
      </div>

      {/* Open Register */}
      {!session && (
        <Card className="max-w-md">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏦</div>
            <h2 className="text-xl font-bold text-gray-900">Open Today's Register</h2>
            <p className="text-gray-500 text-sm mt-1">Count your opening cash and start the day</p>
          </div>
          <Input label="Opening Cash Balance (₦)" type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="e.g. 50,000" min="0" />
          <p className="text-xs text-gray-400 mt-1 mb-4">Count all cash in your till right now</p>
          <Button onClick={() => openRegister()} loading={opening} size="lg" className="w-full" disabled={!openingBalance}>🔓 Open Register</Button>
        </Card>
      )}

      {/* Active/Closed Session */}
      {session && (
        <>
          <div className={`rounded-2xl p-6 text-white ${session.status === 'open' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-gray-700 to-gray-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white/70 text-sm">Register Status</p>
                <p className="text-2xl font-bold">{session.status === 'open' ? '🟢 Open' : '🔴 Closed'}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Opened {format(new Date(session.openedAt), 'HH:mm')}</p>
                {session.closedAt && <p className="text-white/70 text-xs">Closed {format(new Date(session.closedAt), 'HH:mm')}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Opening Balance', value: `₦${session.openingBalance?.toLocaleString()}` },
                { label: 'Cash Sales', value: `₦${(session.cashSales || 0).toLocaleString()}` },
                { label: 'Expected in Till', value: `₦${expectedCash.toLocaleString()}` },
              ].map((s, i) => (
                <div key={i} className="bg-white/15 rounded-xl p-3 text-center">
                  <p className="text-white/60 text-xs mb-1">{s.label}</p>
                  <p className="font-bold">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: session.totalSales || 0, prefix: '₦', color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Cash Sales', value: session.cashSales || 0, prefix: '₦', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Transfer/POS', value: (session.totalSales || 0) - (session.cashSales || 0), prefix: '₦', color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Sales Count', value: session.salesCount || 0, prefix: '', color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-xl p-4`}>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.prefix}{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {session.status === 'closed' && session.discrepancy !== undefined && (
            <Card className={session.discrepancy === 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">{session.discrepancy === 0 ? '✅' : '⚠️'}</span>
                <div>
                  <p className="font-bold text-gray-900">{session.discrepancy === 0 ? 'Books Balanced!' : 'Discrepancy Detected'}</p>
                  {session.discrepancy !== 0 && (
                    <p className={`text-sm font-medium ${session.discrepancy > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {session.discrepancy > 0 ? `+₦${session.discrepancy.toLocaleString()} surplus` : `-₦${Math.abs(session.discrepancy).toLocaleString()} shortage`}
                    </p>
                  )}
                  {session.notes && <p className="text-xs text-gray-500 mt-1">{session.notes}</p>}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* History */}
      {history?.length > 0 && (
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Register History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date', 'Opening', 'Cash Sales', 'Total Sales', 'Closing', 'Discrepancy', 'Status'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(r => (
                  <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{format(new Date(r.openedAt), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4">₦{r.openingBalance?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-blue-600">₦{(r.cashSales || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">₦{(r.totalSales || 0).toLocaleString()}</td>
                    <td className="py-3 px-4">{r.closingBalance ? `₦${r.closingBalance.toLocaleString()}` : '—'}</td>
                    <td className="py-3 px-4">
                      {r.discrepancy !== undefined && r.discrepancy !== null ? (
                        <span className={`font-bold ${r.discrepancy === 0 ? 'text-green-600' : r.discrepancy > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {r.discrepancy === 0 ? '✅ 0' : `${r.discrepancy > 0 ? '+' : ''}₦${r.discrepancy.toLocaleString()}`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4"><Badge color={r.status === 'open' ? 'green' : 'gray'} label={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Close Modal */}
      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)} title="Close Today's Register" size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4 text-sm">
            <p className="text-blue-700 font-medium">Expected cash in till:</p>
            <p className="text-2xl font-bold text-blue-900">₦{expectedCash.toLocaleString()}</p>
            <p className="text-xs text-blue-500 mt-1">Opening ₦{session?.openingBalance?.toLocaleString()} + Cash sales ₦{(session?.cashSales || 0).toLocaleString()}</p>
          </div>
          <Input label="Actual Cash Counted (₦)" type="number" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} placeholder="Count your cash" min="0" />
          {closingBalance && (
            <div className={`rounded-lg p-3 text-sm font-medium ${Number(closingBalance) === expectedCash ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {Number(closingBalance) === expectedCash ? '✅ Perfect — books balanced!' :
                `⚠️ ₦${Math.abs(Number(closingBalance) - expectedCash).toLocaleString()} ${Number(closingBalance) > expectedCash ? 'surplus' : 'shortage'}`}
            </div>
          )}
          <Input label="Notes (optional)" value={closingNotes} onChange={e => setClosingNotes(e.target.value)} placeholder="Any notes for today" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCloseModal(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" loading={closing} onClick={() => closeRegister()} disabled={!closingBalance}>🔒 Close Register</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
