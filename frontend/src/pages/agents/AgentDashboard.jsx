import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { agentApi } from '../../api/services'
import { Card, Button, Input, Select, Badge, Avatar, Spinner, EmptyState, Modal } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AgentDashboard() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [showRegister, setShowRegister] = useState(false)
  const [showOnboard, setShowOnboard] = useState(false)
  const [form, setForm] = useState({ territory: { city: '', state: '', lga: '' }, bankAccount: { bankName: '', accountNumber: '', accountName: '' } })
  const [bizId, setBizId] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['agent-profile'],
    queryFn: () => agentApi.getProfile().then(r => r.data.data),
    retry: false,
  })

  const { data: merchants } = useQuery({
    queryKey: ['agent-merchants'],
    queryFn: () => agentApi.getMerchants().then(r => r.data.data),
    enabled: !!profile,
  })

  const { data: commissions } = useQuery({
    queryKey: ['agent-commissions'],
    queryFn: () => agentApi.getCommissions().then(r => r.data.data),
    enabled: !!profile,
  })

  const { mutate: register, isPending: registering } = useMutation({
    mutationFn: () => agentApi.register(form),
    onSuccess: () => { qc.invalidateQueries(['agent-profile']); toast.success('Agent profile created! 🎉'); setShowRegister(false) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const { mutate: onboard, isPending: onboarding } = useMutation({
    mutationFn: () => agentApi.onboardMerchant({ businessId: bizId }),
    onSuccess: () => { qc.invalidateQueries(['agent-merchants']); qc.invalidateQueries(['agent-commissions']); toast.success('Merchant onboarded! Commission earned.'); setShowOnboard(false); setBizId('') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤝 Agent Network</h1>
          <p className="text-gray-500 text-sm">Become a StreetOS agent and earn commissions</p>
        </div>

        <Card className="max-w-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🤝</div>
            <h2 className="text-xl font-bold text-gray-900">Become a StreetOS Agent</h2>
            <p className="text-gray-500 mt-2">Help businesses in your area onboard to StreetOS and earn commissions for every merchant you bring.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[['₦500', 'Per onboarding'], ['5%', 'Transaction fee'], ['Unlimited', 'Earning potential']].map(([v, l], i) => (
              <div key={i} className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-orange-500">{v}</p>
                <p className="text-xs text-gray-500">{l}</p>
              </div>
            ))}
          </div>
          <Button className="w-full" size="lg" onClick={() => setShowRegister(true)}>Register as Agent</Button>
        </Card>

        <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Register as Agent">
          <form onSubmit={(e) => { e.preventDefault(); register() }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" value={form.territory.city} onChange={e => setForm(f => ({ ...f, territory: { ...f.territory, city: e.target.value } }))} />
              <Input label="State" value={form.territory.state} onChange={e => setForm(f => ({ ...f, territory: { ...f.territory, state: e.target.value } }))} />
              <Input label="LGA" value={form.territory.lga} onChange={e => setForm(f => ({ ...f, territory: { ...f.territory, lga: e.target.value } }))} />
            </div>
            <Input label="Bank Name" value={form.bankAccount.bankName} onChange={e => setForm(f => ({ ...f, bankAccount: { ...f.bankAccount, bankName: e.target.value } }))} />
            <Input label="Account Number" value={form.bankAccount.accountNumber} onChange={e => setForm(f => ({ ...f, bankAccount: { ...f.bankAccount, accountNumber: e.target.value } }))} />
            <Input label="Account Name" value={form.bankAccount.accountName} onChange={e => setForm(f => ({ ...f, bankAccount: { ...f.bankAccount, accountName: e.target.value } }))} />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowRegister(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={registering}>Register Now</Button>
            </div>
          </form>
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤝 Agent Dashboard</h1>
          <p className="text-gray-500 text-sm">Code: <strong className="text-orange-500">{profile.agentCode}</strong> · Territory: {profile.territory?.city}, {profile.territory?.state}</p>
        </div>
        <Button onClick={() => setShowOnboard(true)}>+ Onboard Merchant</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Merchants Onboarded', value: profile.merchantsOnboarded, icon: '🏪', color: 'bg-orange-50 text-orange-600' },
          { label: 'Total Earnings', value: `₦${profile.totalEarnings.toLocaleString()}`, icon: '💰', color: 'bg-green-50 text-green-600' },
          { label: 'Pending Commission', value: `₦${profile.pendingCommission.toLocaleString()}`, icon: '⏳', color: 'bg-yellow-50 text-yellow-600' },
          { label: 'KYC Status', value: profile.kycStatus, icon: '✅', color: 'bg-blue-50 text-blue-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 capitalize">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Merchants */}
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">My Merchants ({merchants?.length || 0})</h3>
          </div>
          {merchants?.length === 0 ? (
            <EmptyState icon="🏪" title="No Merchants Yet" description="Onboard your first merchant to start earning." action={<Button size="sm" onClick={() => setShowOnboard(true)}>Onboard Merchant</Button>} />
          ) : (
            <div className="divide-y divide-gray-50">
              {merchants?.map(m => (
                <div key={m._id} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center font-bold text-orange-600">{m.name?.[0]}</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-sm text-gray-400 capitalize">{m.category?.replace('_', ' ')} · {m.owner?.phone}</p>
                  </div>
                  <Badge color="green">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Commissions */}
        <Card padding={false}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Commission History</h3>
          </div>
          {commissions?.commissions?.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No commissions yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {commissions?.commissions?.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{c.type} commission</p>
                    <p className="text-xs text-gray-400">{c.date ? new Date(c.date).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+₦{c.amount.toLocaleString()}</p>
                    <Badge color={c.status === 'paid' ? 'green' : 'yellow'}>{c.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal open={showOnboard} onClose={() => setShowOnboard(false)} title="Onboard a Merchant" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Enter the Business ID of the merchant you want to onboard. They can find their Business ID in their business profile settings.</p>
          <Input label="Business ID" placeholder="e.g. 64a3f2b1c5d7e8f9a0b1c2d3" value={bizId} onChange={e => setBizId(e.target.value)} />
          <p className="text-xs text-orange-500">You will earn ₦500 commission for each successful onboarding.</p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowOnboard(false)}>Cancel</Button>
            <Button className="flex-1" loading={onboarding} onClick={() => onboard()}>Onboard & Earn</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
