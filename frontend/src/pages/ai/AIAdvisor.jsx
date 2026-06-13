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
  const recognitionRef = useRef(null)

  const { data: advice, isLoading: adviceLoading } = useQuery({
    queryKey: ['ai-advice', currentBusiness?._id],
    queryFn: () => aiApi.getAdvice(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan-readiness', currentBusiness?._id],
    queryFn: () => aiApi.getLoanReadiness(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness && tab === 'loan',
  })

  const { mutate: parseVoice, isPending: parsing } = useMutation({
    mutationFn: () => aiApi.parseVoice(currentBusiness._id, { transcript }),
    onSuccess: ({ data }) => setParsed(data.data.parsed),
    onError: () => toast.error('Failed to parse'),
  })

  const { mutate: confirmTransaction, isPending: confirming } = useMutation({
    mutationFn: () => transactionApi.create(currentBusiness._id, { ...parsed, isVoiceEntry: true, voiceTranscript: transcript }),
    onSuccess: () => { toast.success('Transaction created from voice!'); setParsed(null); setTranscript('') },
    onError: () => toast.error('Failed to create transaction'),
  })

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser')
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = 'en-NG'
    recognition.onresult = (e) => setTranscript(e.results[0][0].transcript)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => { setListening(false); toast.error('Could not hear audio clearly') }
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🤖 AI Business Advisor</h1>
        <p className="text-gray-500 text-sm">Powered by StreetOS Intelligence</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {[['advisor', '💡 Advisor'], ['voice', '🎤 Voice Entry'], ['loan', '🏦 Loan Readiness'], ['passport', '📋 Business Passport']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>{l}</button>
        ))}
      </div>

      {/* Advisor Tab */}
      {tab === 'advisor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {adviceLoading ? <div className="flex justify-center py-12 lg:col-span-2"><Spinner size="lg" /></div> : advice && (
            <>
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">⚠️ <span>Warnings</span></h3>
                {advice.warnings?.length > 0 ? advice.warnings.map((w, i) => (
                  <div key={i} className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-800 mb-2">{w}</div>
                )) : <p className="text-green-600 text-sm">✅ No critical warnings</p>}
              </Card>
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">📊 <span>Summary</span></h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Revenue', value: `₦${advice.summary.revenue.toLocaleString()}` },
                    { label: 'Expenses', value: `₦${advice.summary.expenses.toLocaleString()}` },
                    { label: 'Profit', value: `₦${advice.summary.profit.toLocaleString()}` },
                    { label: 'Margin', value: `${advice.summary.margin}%` },
                  ].map((s, i) => (
                    <div key={i} className="bg-gray-50 p-3 rounded-xl"><p className="text-xs text-gray-400">{s.label}</p><p className="font-semibold text-gray-900">{s.value}</p></div>
                  ))}
                </div>
              </Card>
              <Card className="lg:col-span-2">
                <h3 className="font-semibold text-gray-900 mb-4">💡 Recommendations & Opportunities</h3>
                <div className="space-y-2">
                  {[...advice.recommendations, ...advice.opportunities].map((r, i) => (
                    <div key={i} className="p-3 bg-blue-50 rounded-xl text-sm text-blue-800">{r}</div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Voice Entry Tab */}
      {tab === 'voice' && (
        <Card className="max-w-2xl">
          <h3 className="font-semibold text-gray-900 mb-2">🎤 Voice Transaction Entry</h3>
          <p className="text-sm text-gray-400 mb-6">Say something like: "I sold 3 bags of rice for 45,000 naira"</p>

          <div className="flex flex-col items-center gap-6">
            <button
              onClick={startListening}
              disabled={listening}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-lg transition-all ${listening ? 'bg-red-500 animate-pulse scale-110' : 'bg-orange-500 hover:bg-orange-600 hover:scale-105'}`}
            >
              🎤
            </button>
            <p className="text-sm text-gray-400">{listening ? 'Listening...' : 'Tap to speak'}</p>
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Or type what happened:</label>
            <textarea
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              rows={3}
              placeholder="e.g. Musa bought 5 cartons of juice for 12,500 naira"
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
          </div>

          {transcript && (
            <Button onClick={() => parseVoice()} loading={parsing} className="w-full mt-3">
              Parse Transaction
            </Button>
          )}

          {parsed && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
              <p className="font-semibold text-green-800">✅ Transaction Parsed:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[['Type', parsed.type], ['Amount', `₦${parsed.amount?.toLocaleString()}`], ['Status', parsed.paymentStatus || 'paid']].map(([k, v]) => (
                  <div key={k} className="bg-white p-2 rounded-lg"><p className="text-xs text-gray-400">{k}</p><p className="font-medium text-gray-900">{v}</p></div>
                ))}
              </div>
              <p className="text-xs text-gray-500 italic">"{transcript}"</p>
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" onClick={() => { setParsed(null); setTranscript('') }}>Clear</Button>
                <Button size="sm" variant="success" onClick={() => confirmTransaction()} loading={confirming}>Confirm & Save</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Loan Readiness Tab */}
      {tab === 'loan' && (
        <div className="space-y-6">
          {loanLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : loan && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="flex flex-col items-center">
                <h3 className="font-semibold text-gray-900 mb-4">Loan Readiness Score</h3>
                <ScoreRing score={loan.loanReadinessScore} size={140} label="Loan Readiness" />
                <div className={`mt-4 px-4 py-2 rounded-full text-sm font-medium ${loan.riskLevel === 'low' ? 'bg-green-100 text-green-700' : loan.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {loan.riskLevel.toUpperCase()} RISK
                </div>
              </Card>
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">Credit Score</h3>
                <p className="text-4xl font-bold text-orange-500 mb-2">{loan.creditScore}</p>
                <p className="text-sm text-gray-400">out of 850</p>
                <div className="mt-4 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(loan.creditScore / 850) * 100}%`, transition: 'width 1s ease' }} />
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  Estimated loan eligibility: <strong className="text-green-600">₦{loan.maxLoanEstimate?.toLocaleString()}</strong>
                </p>
              </Card>
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">Key Factors</h3>
                <div className="space-y-3">
                  {loan.factors?.map((f, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{f.factor}</p>
                        <p className="text-xs text-gray-400">{f.note}</p>
                      </div>
                      <Badge color={f.status === 'good' || f.status === 'excellent' ? 'green' : 'yellow'}>{f.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Passport Tab */}
      {tab === 'passport' && (
        <Card className="max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">📋 Business Passport</h3>
              <p className="text-sm text-gray-400">Your verified business identity document</p>
            </div>
            <Badge color="orange">Coming Soon</Badge>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-medium text-gray-700">Business Passport</p>
            <p className="text-sm text-gray-400 mt-1">A comprehensive document showing your business health, credit score, and trust rating</p>
            <p className="text-xs text-orange-500 mt-4">PDF export coming soon</p>
          </div>
        </Card>
      )}
    </div>
  )
}
