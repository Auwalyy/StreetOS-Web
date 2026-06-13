import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../../api/services'
import { useAuthStore } from '../../store/authStore'
import { Button, Input, Select } from '../../components/ui'

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'trader' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: ({ data }) => {
      setAuth(data.data.user, data.data.token, data.data.refreshToken)
      toast.success('Account created! Welcome to StreetOS 🎉')
      navigate('/businesses/new')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Registration failed'),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4 shadow-lg shadow-orange-200">S</div>
          <h1 className="text-2xl font-bold text-gray-900">StreetOS AI</h1>
          <p className="text-gray-500 text-sm mt-1">Start managing your business smarter</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h2>
          <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" placeholder="John" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
              <Input label="Last Name" placeholder="Doe" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
            </div>
            <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            <Input label="Phone Number" type="tel" placeholder="+234 800 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
            <Select label="Business Type" value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="trader">Trader / Market Seller</option>
              <option value="artisan">Artisan / Craftsman</option>
              <option value="business_owner">Business Owner</option>
              <option value="association_leader">Association Leader</option>
              <option value="agent">Agent</option>
            </Select>
            <Input label="Password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
            <Button type="submit" className="w-full" size="lg" loading={isPending}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
