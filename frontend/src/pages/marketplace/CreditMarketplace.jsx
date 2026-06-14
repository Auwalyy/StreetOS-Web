import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { loanApi, aiApi } from '../../api/services'
import { Card, Button, Modal, Input, Select, Textarea, Badge, ScoreRing, Spinner, EmptyState } from '../../components/ui'

const statusColors = { draft: 'gray', submitted: 'blue', under_review: 'yellow', approved: 'green', rejected: 'red', disbursed: 'purple', repaying: 'orange', completed: 'green' }

function ApplyModal({ lender, businessId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ amount: '', purpose: '', tenure: 12, tenureUnit: 'months', lender: { type: lender.type, name: lender.name } })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => loanApi.apply(businessId, form),
    onSuccess: () => { qc.invalidateQueries(['loan-applications']); toast.success('Application submitted! 🎉'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to submit'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-xl mb-2">
        <span className="text-3xl">{lender.logo}</span>
        <div>
          <p className="font-semibold text-gray-900">{lender.name}</p>
          <p className="text-sm text-gray-500">{lender.rate} · Up to ₦{lender.maxAmount.toLocaleString()}</p>
        </div>
      </div>
      <Input label="Loan Amount (₦) *" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} min={lender.minAmount} max={lender.maxAmount} required placeholder={`₦${lender.minAmount.toLocaleString()} – ₦${lender.maxAmount.toLocaleString()}`} />
      <Textarea label="Loan Purpose *" placeholder="What will you use this loan for?" value={form.purpose} onChange={e => set('purpose', e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Tenure" type="number" value={form.tenure} onChange={e => set('tenure', Number(e.target.value))} min={1} />
        <Select label="Period" value={form.tenureUnit} onChange={e => set('tenureUnit', e.target.value)}>
          <option value="months">Months</option>
          <option value="weeks">Weeks</option>
        </Select>
      </div>
      <div className="bg-gray-50 p-3 rounded-xl">
        <p className="text-xs font-medium text-gray-500 mb-2">Requirements:</p>
        {lender.requirements.map((r, i) => <p key={i} className="text-xs text-gray-600">• {r}</p>)}
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>Submit Application</Button>
      </div>
    </form>
  )
}

export default function CreditMarketplace() {
  const { currentBusiness } = useAuthStore()
  const [tab, setTab] = useState('marketplace')
  const [selectedLender, setSelectedLender] = useState(null)
  const [amountFilter, setAmountFilter] = useState('')

  const { data: lenders, isLoading: lendersLoading } = useQuery({
    queryKey: ['lenders', amountFilter],
    queryFn: () => loanApi.getLenders(currentBusiness?._id, { amount: amountFilter }).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['loan-applications', currentBusiness?._id],
    queryFn: () => loanApi.getApplications(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness && tab === 'applications',
  })

  const { data: loanReadiness } = useQuery({
    queryKey: ['loan-readiness', currentBusiness?._id],
    queryFn: () => aiApi.getLoanReadiness(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const typeColors = { bank: 'blue', fintech: 'orange', microfinance: 'green', cooperative: 'purple' }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🏦 SME Credit Marketplace</h1>
        <p className="text-gray-500 text-sm">Connect with banks, fintechs and microfinance institutions</p>
      </div>

      {/* Loan Readiness Banner */}
      {loanReadiness && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white flex items-center gap-6">
          <ScoreRing score={loanReadiness.loanReadinessScore} size={90} />
          <div>
            <p className="font-bold text-lg">Your Loan Readiness Score</p>
            <p className="opacity-90">Credit Score: <strong>{loanReadiness.creditScore}/850</strong> · Risk: <strong>{loanReadiness.riskLevel.toUpperCase()}</strong></p>
            <p className="mt-1 opacity-80">Estimated eligible loan: <strong>₦{loanReadiness.maxLoanEstimate?.toLocaleString()}</strong></p>
          </div>
        </div>
      )}

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[['marketplace', '🏦 Lenders'], ['applications', '📋 My Applications']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>{l}</button>
        ))}
      </div>

      {/* Marketplace Tab */}
      {tab === 'marketplace' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input placeholder="Enter desired loan amount..." type="number" value={amountFilter} onChange={e => setAmountFilter(e.target.value)} className="max-w-xs" />
            {amountFilter && <p className="text-sm text-gray-500">Showing lenders for ₦{Number(amountFilter).toLocaleString()}</p>}
          </div>

          {lendersLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {lenders?.map((l, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{l.logo}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{l.name}</p>
                        <Badge color={typeColors[l.type]}>{l.type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-green-50 p-2 rounded-lg"><p className="text-xs text-gray-400">Min Amount</p><p className="font-semibold text-green-700">₦{l.minAmount.toLocaleString()}</p></div>
                    <div className="bg-blue-50 p-2 rounded-lg"><p className="text-xs text-gray-400">Max Amount</p><p className="font-semibold text-blue-700">₦{l.maxAmount.toLocaleString()}</p></div>
                    <div className="bg-orange-50 p-2 rounded-lg"><p className="text-xs text-gray-400">Interest Rate</p><p className="font-semibold text-orange-700">{l.rate}</p></div>
                    <div className="bg-purple-50 p-2 rounded-lg"><p className="text-xs text-gray-400">Tenure</p><p className="font-semibold text-purple-700">{l.tenure}</p></div>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-1">Requirements:</p>
                    {l.requirements.slice(0, 2).map((r, i) => <p key={i} className="text-xs text-gray-600">• {r}</p>)}
                  </div>
                  <Button className="w-full" onClick={() => setSelectedLender(l)}>Apply Now</Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applications Tab */}
      {tab === 'applications' && (
        <Card padding={false}>
          {appsLoading ? <div className="flex justify-center py-12"><Spinner /></div> : applications?.length === 0 ? (
            <EmptyState icon="📋" title="No Applications Yet" description="Apply for a loan from the marketplace to get started." action={<Button onClick={() => setTab('marketplace')}>Browse Lenders</Button>} />
          ) : (
            <div className="divide-y divide-gray-50">
              {applications?.map(app => (
                <div key={app._id} className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-xl">🏦</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{app.lender?.name || 'Unknown Lender'}</p>
                    <p className="text-sm text-gray-400">{app.purpose} · {format(new Date(app.createdAt), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₦{Number(app.amount).toLocaleString()}</p>
                    <Badge color={statusColors[app.status]}>{app.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal open={!!selectedLender} onClose={() => setSelectedLender(null)} title={`Apply — ${selectedLender?.name}`} size="md">
        {selectedLender && <ApplyModal lender={selectedLender} businessId={currentBusiness._id} onClose={() => setSelectedLender(null)} />}
      </Modal>
    </div>
  )
}
