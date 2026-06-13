import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { authApi } from '../../api/services'
import { useAuthStore } from '../../store/authStore'
import { Button, Input } from '../../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.login(form),
    onSuccess: ({ data }) => {
      setAuth(data.data.user, data.data.token, data.data.refreshToken)
      toast.success(`Welcome back, ${data.data.user.firstName}!`)
      navigate('/dashboard')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Login failed'),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4 shadow-lg shadow-orange-200">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900">StreetOS AI</h1>
          <p className="text-gray-500 text-sm mt-1">Your Financial Operating System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-orange-500 hover:text-orange-600">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" size="lg" loading={isPending}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-500 hover:text-orange-600 font-medium">Sign up</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          The Financial OS for Africa's Informal Economy
        </p>
      </div>
    </div>
  )
}
