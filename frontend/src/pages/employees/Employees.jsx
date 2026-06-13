import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'
import { employeeApi } from '../../api/services'
import { Button, Card, Modal, Input, Select, Avatar, EmptyState, Spinner } from '../../components/ui'

function EmployeeForm({ onClose, businessId, employee }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(employee || { firstName: '', lastName: '', role: '', phone: '', salary: '', salaryFrequency: 'monthly' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => employee
      ? employeeApi.update(businessId, employee._id, form)
      : employeeApi.create(businessId, { ...form, salary: Number(form.salary) }),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success(employee ? 'Updated' : 'Employee added'); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate() }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="First Name" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
        <Input label="Last Name" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
      </div>
      <Input label="Role / Position" placeholder="e.g. Cashier, Driver" value={form.role} onChange={e => set('role', e.target.value)} />
      <Input label="Phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Salary (₦)" type="number" value={form.salary} onChange={e => set('salary', e.target.value)} min="0" />
        <Select label="Frequency" value={form.salaryFrequency} onChange={e => set('salaryFrequency', e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </Select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button type="submit" className="flex-1" loading={isPending}>{employee ? 'Update' : 'Add'} Employee</Button>
      </div>
    </form>
  )
}

export default function Employees() {
  const { currentBusiness } = useAuthStore()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editEmployee, setEditEmployee] = useState(null)

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', currentBusiness?._id],
    queryFn: () => employeeApi.getAll(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  })

  const { mutate: deleteE } = useMutation({
    mutationFn: (id) => employeeApi.delete(currentBusiness._id, id),
    onSuccess: () => { qc.invalidateQueries(['employees']); toast.success('Employee removed') },
  })

  if (!currentBusiness) return <div className="text-center py-20 text-gray-400">Select a business first</div>

  const totalSalary = employees?.reduce((a, e) => a + e.salary, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees 👷</h1>
          <p className="text-gray-500 text-sm">{employees?.length || 0} staff · ₦{totalSalary.toLocaleString()} monthly payroll</p>
        </div>
        <Button onClick={() => { setEditEmployee(null); setShowModal(true) }}>+ Add Employee</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : employees?.length === 0 ? (
        <EmptyState icon="👷" title="No Employees Yet" description="Add your staff to track salaries and attendance." action={<Button onClick={() => setShowModal(true)}>Add Employee</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees?.map(e => (
            <Card key={e._id}>
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={`${e.firstName} ${e.lastName}`} />
                <div>
                  <p className="font-semibold text-gray-900">{e.firstName} {e.lastName}</p>
                  <p className="text-sm text-gray-400">{e.role || 'Staff'}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm mb-4">
                {e.phone && <p className="text-gray-500">📞 {e.phone}</p>}
                <p className="text-gray-700 font-medium">₦{e.salary.toLocaleString()} / {e.salaryFrequency}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditEmployee(e); setShowModal(true) }} className="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">Edit</button>
                <button onClick={() => { if (confirm('Remove employee?')) deleteE(e._id) }} className="flex-1 text-xs py-1.5 border border-red-100 rounded-lg hover:bg-red-50 text-red-500">Remove</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditEmployee(null) }} title={editEmployee ? 'Edit Employee' : 'Add Employee'}>
        <EmployeeForm onClose={() => { setShowModal(false); setEditEmployee(null) }} businessId={currentBusiness._id} employee={editEmployee} />
      </Modal>
    </div>
  )
}
