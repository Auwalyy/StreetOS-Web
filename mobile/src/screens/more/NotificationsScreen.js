import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { notificationApi } from '../../api/services';
import { Badge, EmptyState, Spinner, ScreenHeader, Button } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const TYPE_ICONS = { debt_reminder: '💰', low_stock: '📦', goal_alert: '🎯', payment: '💳', weekly_report: '📊', system: '🔔', loan: '🏦' };
const TYPE_COLORS = { debt_reminder: 'red', low_stock: 'yellow', goal_alert: 'orange', payment: 'green', weekly_report: 'blue', system: 'gray', loan: 'purple' };

export default function NotificationsScreen({ navigation }) {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll().then(r => r.data.data),
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const { mutate: markAll, isPending: markingAll } = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  const notifications = data?.notifications || [];
  const unread = data?.unread || 0;

  const renderItem = ({ item: n }) => (
    <TouchableOpacity
      style={[styles.item, !n.isRead && styles.itemUnread]}
      onPress={() => !n.isRead && markRead(n._id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, !n.isRead && { backgroundColor: colors.primaryBg }]}>
        <Text style={{ fontSize: 20 }}>{TYPE_ICONS[n.type] || '🔔'}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <Text style={[styles.title, !n.isRead && { color: colors.text }]} numberOfLines={1}>{n.title}</Text>
          {!n.isRead && <View style={styles.dot} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>{n.message}</Text>
        <Text style={styles.time}>{format(new Date(n.createdAt), 'dd MMM · HH:mm')}</Text>
      </View>
      <Badge label={n.type?.replace('_', ' ')} color={TYPE_COLORS[n.type] || 'gray'} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Notifications"
        subtitle={`${unread} unread`}
        navigation={navigation}
        right={unread > 0 ? (
          <TouchableOpacity style={styles.markAllBtn} onPress={() => markAll()}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      />

      {isLoading ? <Spinner /> : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.gray50 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="🔔" title="No Notifications" description="You're all caught up! Alerts will appear here." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.lg, backgroundColor: colors.white },
  itemUnread: { backgroundColor: '#fff7ed' },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: typography.sm, fontWeight: '600', color: colors.gray700, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, flexShrink: 0 },
  message: { fontSize: typography.xs, color: colors.textSecondary, lineHeight: 16, marginBottom: 4 },
  time: { fontSize: 10, color: colors.textMuted },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.primaryBg },
  markAllText: { fontSize: typography.xs, fontWeight: '700', color: colors.primary },
});
