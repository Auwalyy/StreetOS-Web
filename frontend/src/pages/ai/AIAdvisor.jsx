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

      {tab === 'passport' && (
        <Card className="max-w-2xl">
          <h3 className="font-semibold mb-2">📋 Business Passport</h3>
          <p className="text-sm text-gray-400">
            Coming soon — verified business identity document
          </p>
        </Card>
      )}
    </div>
  )
}