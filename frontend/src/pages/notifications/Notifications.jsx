import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { notificationApi } from '../../api/services'
import { Card, Button, Badge, Spinner, EmptyState } from '../../components/ui'
import toast from 'react-hot-toast'

const typeIcons = { debt_reminder: '💰', low_stock: '📦', goal_alert: '🎯', payment: '💳', weekly_report: '📊', system: '🔔', loan: '🏦' }
const typeColors = { debt_reminder: 'red', low_stock: 'yellow', goal_alert: 'orange', payment: 'green', weekly_report: 'blue', system: 'gray', loan: 'purple' }

export default function Notifications() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll().then(r => r.data.data),
  })

  const { mutate: markRead } = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const { mutate: markAll, isPending: markingAll } = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries(['notifications']); toast.success('All marked as read') },
  })

  const notifications = data?.notifications || []
  const unread = data?.unread || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔔 Notifications</h1>
          <p className="text-gray-500 text-sm">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={() => markAll()} loading={markingAll}>Mark All Read</Button>
        )}
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No Notifications" description="You're all caught up!" />
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map(n => (
              <div
                key={n._id}
                onClick={() => !n.isRead && markRead(n._id)}
                className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${!n.isRead ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${!n.isRead ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  {typeIcons[n.type] || '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className={`font-medium text-sm ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                    <Badge color={typeColors[n.type] || 'gray'}>{n.type?.replace('_', ' ')}</Badge>
                    {!n.isRead && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-gray-500">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(n.createdAt), 'dd MMM yyyy · HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
