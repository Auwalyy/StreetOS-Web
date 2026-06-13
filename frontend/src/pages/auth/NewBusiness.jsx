import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { businessApi } from '../../api/services'
import { useAuthStore } from '../../store/authStore'
import { Button, Input, Select, Textarea } from '../../components/ui'

const categories = [
  ['retail', 'Retail / General Trade'],
  ['food_vendor', 'Food Vendor / Restaurant'],
  ['artisan', 'Artisan / Craftsman'],
  ['transport', 'Transport / Logistics'],
  ['agriculture', 'Agriculture / Farming'],
  ['fashion', 'Fashion / Tailoring'],
  ['electronics', 'Electronics / Gadgets'],
  ['healthcare', 'Healthcare / Pharmacy'],
  ['services', 'Services / Consulting'],
  ['other', 'Other'],
]

export default function NewBusiness() {
  const navigate = useNavigate()
  const { setCurrentBusiness } = useAuthStore()
  const [form, setForm] = useState({ name: '', category: 'retail', description: '', phone: '', email: '', address: { city: '', state: '' } })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => businessApi.create(form),
    onSuccess: ({ data }) => {
      setCurrentBusiness(data.data)
      toast.success('Business created! Let\'s get started 🚀')
      navigate('/dashboard')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create business'),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Business</h1>
          <p className="text-gray-500 mt-1">Tell us about your business to get started</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-5">
            <Input label="Business Name *" placeholder="e.g. Mama Ngozi Store" value={form.name} onChange={e => set('name', e.target.value)} required />
            <Select label="Business Category *" value={form.category} onChange={e => set('category', e.target.value)}>
              {categories.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Textarea label="Description" placeholder="What do you sell or offer?" value={form.description} onChange={e => set('description', e.target.value)} />
            <Input label="Business Phone" type="tel" placeholder="+234 800 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" placeholder="Lagos" value={form.address.city} onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} />
              <Input label="State" placeholder="Lagos State" value={form.address.state} onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))} />
            </div>
            <Button type="submit" className="w-full" size="lg" loading={isPending}>
              Create Business 🚀
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
