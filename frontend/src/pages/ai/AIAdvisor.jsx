import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { aiApi, transactionApi } from '../../api/services'
import { Card, ScoreRing, Badge, Button, Spinner } from '../../components/ui'
import toast from 'react-hot-toast'

export default function AIAdvisor() {
  const { currentBusiness } = useAuthStore()

  const [tab, setTab] = useState('advisor')
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState(null)
  const [listening, setListening] = useState(false)
  const [language, setLanguage] = useState('en-NG')

  const recognitionRef = useRef(null)

  // ---------------- AI ADVICE ----------------
  const { data: advice, isLoading: adviceLoading } = useQuery({
    queryKey: ['ai-advice', currentBusiness?._id],
    queryFn: () => aiApi.getAdvice(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  // ---------------- LOAN READINESS ----------------
  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan-readiness', currentBusiness?._id],
    queryFn: () => aiApi.getLoanReadiness(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness && tab === 'loan',
  })

  // ---------------- VOICE PARSE ----------------
  const { mutate: parseVoice, isPending: parsing } = useMutation({
    mutationFn: () =>
      aiApi.parseVoice(currentBusiness._id, { transcript, language }),

    onSuccess: ({ data }) => setParsed(data.data.parsed),
    onError: () => toast.error('Failed to parse'),
  })

  // ---------------- CONFIRM TRANSACTION ----------------
  const { mutate: confirmTransaction, isPending: confirming } = useMutation({
    mutationFn: () =>
      transactionApi.create(currentBusiness._id, {
        ...parsed,
        isVoiceEntry: true,
        voiceTranscript: transcript,
      }),

    onSuccess: () => {
      toast.success('Transaction created from voice!')
      setParsed(null)
      setTranscript('')
    },
    onError: () => toast.error('Failed to create transaction'),
  })

  // ---------------- SPEECH RECOGNITION ----------------
  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SR) {
      toast.error('Speech recognition not supported in this browser')
      return
    }

    const recognition = new SR()
    recognition.lang = language

    recognition.onresult = (e) =>
      setTranscript(e.results[0][0].transcript)

    recognition.onend = () => setListening(false)

    recognition.onerror = () => {
      setListening(false)
      toast.error('Could not hear audio clearly')
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  if (!currentBusiness) {
    return (
      <div className="text-center py-20 text-gray-400">
        Select a business first
      </div>
    )
  }

  // ---------------- UI SECTIONS ----------------
  const renderAdvisor = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {adviceLoading ? (
        <div className="flex justify-center py-12 lg:col-span-2">
          <Spinner size="lg" />
        </div>
      ) : (
        advice && (
          <>
            <Card>
              <h3 className="font-semibold mb-4">⚠️ Warnings</h3>

              {advice.warnings?.length ? (
                advice.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-sm mb-2"
                  >
                    {w}
                  </div>
                ))
              ) : (
                <p className="text-green-600 text-sm">
                  ✅ No critical warnings
                </p>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold mb-4">📊 Summary</h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Revenue',
                    value: `₦${advice.summary.revenue.toLocaleString()}`,
                  },
                  {
                    label: 'Expenses',
                    value: `₦${advice.summary.expenses.toLocaleString()}`,
                  },
                  {
                    label: 'Profit',
                    value: `₦${advice.summary.profit.toLocaleString()}`,
                  },
                  {
                    label: 'Margin',
                    value: `${advice.summary.margin}%`,
                  },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <h3 className="font-semibold mb-4">
                💡 Recommendations & Opportunities
              </h3>

              <div className="space-y-2">
                {[...(advice.recommendations || []), ...(advice.opportunities || [])].map(
                  (r, i) => (
                    <div
                      key={i}
                      className="p-3 bg-blue-50 rounded-xl text-sm"
                    >
                      {r}
                    </div>
                  )
                )}
              </div>
            </Card>
          </>
        )
      )}
    </div>
  )

  const renderVoice = () => (
    <Card className="max-w-2xl">
      <h3 className="font-semibold mb-2">🎤 Voice Transaction Entry</h3>

      <p className="text-sm text-gray-400 mb-6">
        Say: "I sold 3 bags of rice for 45,000 naira"
      </p>

      {/* Language */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">
          Language
        </label>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-3 border rounded-xl text-sm"
        >
          <option value="en-NG">English (Nigeria)</option>
          <option value="ha-NG">Hausa (Nigeria)</option>
          <option value="yo-NG">Yoruba (Nigeria)</option>
          <option value="ig-NG">Igbo (Nigeria)</option>
        </select>
      </div>

      {/* Mic */}
      <div className="flex flex-col items-center">
        <button
          onClick={startListening}
          disabled={listening}
          className={`w-24 h-24 rounded-full text-4xl flex items-center justify-center shadow-lg transition-all ${
            listening
              ? 'bg-red-500 animate-pulse'
              : 'bg-orange-500 hover:scale-105'
          }`}
        >
          🎤
        </button>

        <p className="text-sm text-gray-400 mt-2">
          {listening ? 'Listening...' : 'Tap to speak'}
        </p>
      </div>

      {/* Text input */}
      <div className="mt-6">
        <label className="text-sm font-medium block mb-2">
          Or type:
        </label>

        <textarea
          rows={3}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="w-full p-3 border rounded-xl text-sm"
          placeholder="e.g. Musa bought 5 cartons of juice..."
        />
      </div>

      {transcript && (
        <Button onClick={() => parseVoice()} loading={parsing} className="w-full mt-3">
          Parse Transaction
        </Button>
      )}

      {parsed && (
        <div className="mt-6 p-4 bg-green-50 border rounded-xl">
          <p className="font-semibold mb-3">✅ Parsed Transaction</p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Type', parsed.type],
              ['Amount', `₦${parsed.amount?.toLocaleString()}`],
              ['Status', parsed.paymentStatus || 'paid'],
            ].map(([k, v]) => (
              <div key={k} className="bg-white p-2 rounded-lg">
                <p className="text-xs text-gray-400">{k}</p>
                <p className="font-medium">{v}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setParsed(null)
                setTranscript('')
              }}
            >
              Clear
            </Button>

            <Button
              size="sm"
              variant="success"
              onClick={() => confirmTransaction()}
              loading={confirming}
            >
              Confirm & Save
            </Button>
          </div>
        </div>
      )}
    </Card>
  )

  const renderLoan = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {loanLoading ? (
        <div className="flex justify-center py-12 lg:col-span-3">
          <Spinner size="lg" />
        </div>
      ) : (
        loan && (
          <>
            <Card className="flex flex-col items-center">
              <h3 className="font-semibold mb-4">Loan Readiness</h3>
              <ScoreRing score={loan.loanReadinessScore} size={140} />
              <Badge className="mt-4">{loan.riskLevel}</Badge>
            </Card>

            <Card>
              <h3 className="font-semibold mb-4">Credit Score</h3>
              <p className="text-4xl font-bold">{loan.creditScore}</p>
              <p className="text-sm text-gray-400">out of 850</p>
            </Card>

            <Card>
              <h3 className="font-semibold mb-4">Key Factors</h3>

              <div className="space-y-3">
                {loan.factors?.map((f, i) => (
                  <div key={i}>
                    <p className="text-sm font-medium">{f.factor}</p>
                    <p className="text-xs text-gray-400">{f.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">🤖 AI Business Advisor</h1>
        <p className="text-sm text-gray-500">
          Powered by StreetOS Intelligence
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          ['advisor', '💡 Advisor'],
          ['voice', '🎤 Voice'],
          ['loan', '🏦 Loan'],
          ['passport', '📋 Passport'],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm ${
              tab === k ? 'bg-white shadow text-orange-600' : 'text-gray-600'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'advisor' && renderAdvisor()}
      {tab === 'voice' && renderVoice()}
      {tab === 'loan' && renderLoan()}

      {tab === 'passport' && <PassportTab businessId={currentBusiness._id} business={currentBusiness} />}
    </div>
  )
}

function PassportTab({ businessId, business }) {
  const { data: passport, isLoading } = useQuery({
    queryKey: ['passport', businessId],
    queryFn: () => aiApi.getPassport(businessId).then(r => r.data.data),
  })

  const { data: loan } = useQuery({
    queryKey: ['loan-readiness', businessId],
    queryFn: () => aiApi.getLoanReadiness(businessId).then(r => r.data.data),
  })

  const { data: health } = useQuery({
    queryKey: ['health-score', businessId],
    queryFn: () =>
      fetch(`/api/businesses/${businessId}/analytics/health-score`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('streetos-auth') ? JSON.parse(localStorage.getItem('streetos-auth'))?.state?.token : ''}` },
      }).then(r => r.json()).then(r => r.data),
  })

  const handlePrint = () => window.print()

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const revenueData = passport?.monthlyRevenue || []
  const totalRevenue = revenueData.reduce((a, b) => a + b.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Your verified digital business identity document</p>
        <Button onClick={handlePrint} variant="secondary">🖨️ Print Passport</Button>
      </div>

      <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-white/20">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-bold">
              {business?.name?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{business?.name}</h2>
              <p className="text-white/70 capitalize">{business?.category?.replace('_', ' ')}</p>
              <p className="text-white/50 text-sm">📍 {business?.address?.city}, {business?.address?.state}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-orange-500 px-4 py-2 rounded-xl">
              <p className="text-xs opacity-80">BUSINESS PASSPORT</p>
              <p className="font-bold text-sm">StreetOS AI</p>
            </div>
            <p className="text-white/40 text-xs mt-2">{new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        {/* Score Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Health Score', value: health?.score ?? '—', suffix: '/100', color: 'text-green-400' },
            { label: 'Credit Score', value: loan?.creditScore ?? '—', suffix: '/850', color: 'text-blue-400' },
            { label: 'Loan Readiness', value: loan?.loanReadinessScore ?? '—', suffix: '%', color: 'text-orange-400' },
            { label: 'Risk Level', value: loan?.riskLevel ?? '—', suffix: '', color: loan?.riskLevel === 'low' ? 'text-green-400' : loan?.riskLevel === 'medium' ? 'text-yellow-400' : 'text-red-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color} capitalize`}>{s.value}{s.suffix}</p>
              <p className="text-white/60 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Revenue Summary */}
        <div className="bg-white/10 rounded-xl p-5 mb-6">
          <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Revenue History (12 months)</p>
          <div className="flex items-end gap-1 h-16">
            {revenueData.length > 0 ? (
              revenueData.map((d, i) => {
                const max = Math.max(...revenueData.map(x => x.total))
                const height = max > 0 ? Math.max((d.total / max) * 100, 5) : 5
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-orange-400 rounded-sm" style={{ height: `${height}%` }} />
                    <p className="text-white/40 text-[8px]">{months[(d._id?.month || 1) - 1]}</p>
                  </div>
                )
              })
            ) : (
              <p className="text-white/40 text-sm">No revenue data yet</p>
            )}
          </div>
          <p className="text-white/80 font-bold mt-2">Total: ₦{totalRevenue.toLocaleString()}</p>
        </div>

        {/* Business Info */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Owner', value: `${passport?.business?.owner?.firstName || ''} ${passport?.business?.owner?.lastName || ''}`.trim() || '—' },
            { label: 'Phone', value: passport?.business?.owner?.phone || business?.phone || '—' },
            { label: 'Max Loan Estimate', value: loan?.maxLoanEstimate ? `₦${loan.maxLoanEstimate.toLocaleString()}` : '—' },
            { label: 'Verified', value: business?.isVerified ? '✅ Yes' : '⚠️ Pending' },
          ].map((item, i) => (
            <div key={i}>
              <p className="text-white/40 text-xs">{item.label}</p>
              <p className="text-white/90 font-medium text-sm">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
          <p className="text-white/40 text-xs">Generated by StreetOS AI · The Financial OS for Africa's Informal Economy</p>
          <p className="text-white/40 text-xs">{new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Loan Factors */}
      {loan?.factors && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">📊 Credit Factors</h3>
          <div className="space-y-3">
            {loan.factors.map((f, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                f.status === 'good' || f.status === 'excellent' ? 'bg-green-50' : f.status === 'fair' ? 'bg-yellow-50' : 'bg-red-50'
              }`}>
                <span className="text-lg">{f.status === 'good' || f.status === 'excellent' ? '✅' : '⚠️'}</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{f.factor}</p>
                  <p className="text-gray-500 text-xs">{f.note}</p>
                </div>
                <Badge color={f.status === 'good' || f.status === 'excellent' ? 'green' : f.status === 'fair' ? 'yellow' : 'red'} className="ml-auto">{f.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}