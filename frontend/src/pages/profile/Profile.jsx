import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/services'
import { Card, Button, Input, Select, Avatar, Badge } from '../../components/ui'

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    preferences: { language: user?.preferences?.language || 'en' },
  })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate: updateProfile, isPending: updating } = useMutation({
    mutationFn: () => authApi.updateProfile(form),
    onSuccess: ({ data }) => { setUser(data.data); toast.success('Profile updated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const { mutate: changePassword, isPending: changingPw } = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => { toast.success('Password changed'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  const handlePasswordChange = (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match')
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    changePassword()
  }

  const roleColors = { trader: 'orange', artisan: 'blue', business_owner: 'green', admin: 'red', super_admin: 'purple', agent: 'yellow', association_leader: 'purple' }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">👤 My Profile</h1>
        <p className="text-gray-500 text-sm">Manage your account settings</p>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <Avatar name={`${user?.firstName} ${user?.lastName}`} src={user?.avatar} size="lg" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge color={roleColors[user?.role] || 'gray'}>{user?.role?.replace('_', ' ')}</Badge>
              {user?.isEmailVerified && <Badge color="green">✓ Verified</Badge>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          {[['profile', '👤 Profile'], ['security', '🔒 Security'], ['preferences', '⚙️ Preferences']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === k ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>{l}</button>
          ))}
        </div>

        {tab === 'profile' && (
          <form onSubmit={(e) => { e.preventDefault(); updateProfile() }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
              <Input label="Last Name" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
            </div>
            <Input label="Email Address" value={user?.email} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
            <Input label="Phone Number" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            <Button type="submit" loading={updating}>Save Changes</Button>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input label="Current Password" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
            <Input label="New Password" type="password" placeholder="Min. 6 characters" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} />
            <Input label="Confirm New Password" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
            <Button type="submit" loading={changingPw}>Change Password</Button>
          </form>
        )}

        {tab === 'preferences' && (
          <form onSubmit={(e) => { e.preventDefault(); updateProfile() }} className="space-y-4">
            <Select
              label="Preferred Language"
              value={form.preferences.language}
              onChange={e => setForm(f => ({ ...f, preferences: { ...f.preferences, language: e.target.value } }))}
            >
              <option value="en">English</option>
              <option value="ha">Hausa</option>
              <option value="yo">Yoruba</option>
              <option value="ig">Igbo</option>
            </Select>
            <Button type="submit" loading={updating}>Save Preferences</Button>
          </form>
        )}
      </Card>

      {/* Account Stats */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long' }) : '—' },
            { label: 'Account Role', value: user?.role?.replace('_', ' ') || '—' },
            { label: 'Email Status', value: user?.isEmailVerified ? '✅ Verified' : '⚠️ Unverified' },
            { label: 'KYC Level', value: `Level ${user?.kycLevel || 0}` },
          ].map((item, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="font-medium text-gray-800 capitalize">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
