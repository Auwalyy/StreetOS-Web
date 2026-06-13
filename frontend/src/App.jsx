import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import NewBusiness from './pages/auth/NewBusiness'
import Dashboard from './pages/dashboard/Dashboard'
import Transactions from './pages/transactions/Transactions'
import Inventory from './pages/inventory/Inventory'
import Customers from './pages/customers/Customers'
import Debts from './pages/debts/Debts'
import Analytics from './pages/analytics/Analytics'
import Savings from './pages/savings/Savings'
import Employees from './pages/employees/Employees'
import Suppliers from './pages/suppliers/Suppliers'
import AIAdvisor from './pages/ai/AIAdvisor'
import Adashe from './pages/adashe/Adashe'
import Community from './pages/community/Community'
import Admin from './pages/admin/Admin'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30 * 1000 },
    mutations: { retry: 0 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/businesses/new" element={<NewBusiness />} />

          {/* Protected */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/ai-advisor" element={<AIAdvisor />} />
            <Route path="/adashe" element={<Adashe />} />
            <Route path="/community" element={<Community />} />
            <Route path="/admin" element={<Admin />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' },
          success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
