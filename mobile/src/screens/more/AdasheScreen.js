import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { groupApi } from '../../api/services';
import { Badge, Card, Button, Spinner, EmptyState, ScreenHeader, BottomModal, Input, PickerRow, Avatar } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

function CreateGroupModal({ visible, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'adashe', contributionAmount: '', frequency: 'monthly', maxMembers: '10' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => groupApi.create({ ...form, contributionAmount: Number(form.contributionAmount), maxMembers: Number(form.maxMembers) }),
    onSuccess: () => { qc.invalidateQueries(['groups']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  return (
    <BottomModal visible={visible} onClose={onClose} title="Create Savings Group" height="85%">
      <View style={{ gap: 14 }}>
        <Input label="Group Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Market Women Adashe" />
        <PickerRow
          label="Type"
          value={form.type}
          options={[
            { value: 'adashe', label: '🤝 Adashe' },
            { value: 'esusu', label: '🏦 Esusu' },
            { value: 'ajo', label: '💰 Ajo' },
            { value: 'cooperative', label: '🏛️ Cooperative' },
          ]}
          onChange={v => set('type', v)}
        />
        <Input label="Contribution Amount (₦) *" value={form.contributionAmount} onChangeText={v => set('contributionAmount', v)} keyboardType="numeric" placeholder="e.g. 5000" />
        <PickerRow
          label="Frequency"
          value={form.frequency}
          options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]}
          onChange={v => set('frequency', v)}
        />
        <Input label="Max Members" value={form.maxMembers} onChangeText={v => set('maxMembers', v)} keyboardType="numeric" placeholder="10" />
        <Button title="Create Group" onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

function GroupDetailModal({ visible, group, onClose }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: detail } = useQuery({
    queryKey: ['group-detail', group?._id],
    queryFn: () => groupApi.get(group._id).then(r => r.data.data),
    enabled: !!group && visible,
  });

  const isCreator = detail?.creator?._id === user?._id || detail?.creator === user?._id;

  if (!group) return null;
  return (
    <BottomModal visible={visible} onClose={onClose} title={group.name} height="75%">
      {!detail ? <Spinner size="small" /> : (
        <View style={{ gap: 16 }}>
          <View style={styles.groupStats}>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatVal}>₦{detail.contributionAmount?.toLocaleString()}</Text>
              <Text style={styles.groupStatLabel}>Per {detail.frequency}</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatVal}>{detail.members?.length}/{detail.maxMembers}</Text>
              <Text style={styles.groupStatLabel}>Members</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatVal}>₦{detail.totalCollected?.toLocaleString() || 0}</Text>
              <Text style={styles.groupStatLabel}>Collected</Text>
            </View>
          </View>

          <Text style={styles.membersTitle}>Members ({detail.members?.length})</Text>
          {detail.members?.map((m, i) => (
            <View key={i} style={styles.memberRow}>
              <Avatar name={m.name || m.user?.firstName || 'Member'} size="sm" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.memberName}>{m.name || `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim()}</Text>
                <Text style={styles.memberContrib}>₦{m.totalContributed?.toLocaleString() || 0} contributed</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </BottomModal>
  );
}

export default function AdasheScreen({ navigation }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const { data: groups, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.getAll().then(r => r.data.data),
  });

  const { mutate: joinGroup } = useMutation({
    mutationFn: (id) => groupApi.join(id),
    onSuccess: () => { qc.invalidateQueries(['groups']); Alert.alert('✅', 'Joined group!'); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed to join'),
  });

  const renderItem = ({ item: g }) => {
    const isCreator = g.creator?._id === user?._id || g.creator === user?._id;
    const isMember = g.members?.some(m => m.user === user?._id || m.user?._id === user?._id);

    return (
      <TouchableOpacity onPress={() => setSelectedGroup(g)} activeOpacity={0.8}>
        <Card style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
            <View style={styles.groupIcon}>
              <Text style={{ fontSize: 22 }}>🤝</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.groupName}>{g.name}</Text>
              <Text style={styles.groupMeta}>{g.type} · {g.frequency}</Text>
            </View>
            <Badge label={g.status} color={g.status === 'active' ? 'green' : 'gray'} />
          </View>

          <View style={styles.groupRow}>
            <View style={styles.groupInfoItem}>
              <Text style={styles.groupInfoLabel}>Contribution</Text>
              <Text style={styles.groupInfoVal}>₦{g.contributionAmount?.toLocaleString()}</Text>
            </View>
            <View style={styles.groupInfoItem}>
              <Text style={styles.groupInfoLabel}>Members</Text>
              <Text style={styles.groupInfoVal}>{g.members?.length || 0}/{g.maxMembers}</Text>
            </View>
            <View style={styles.groupInfoItem}>
              <Text style={styles.groupInfoLabel}>Collected</Text>
              <Text style={styles.groupInfoVal}>₦{(g.totalCollected || 0).toLocaleString()}</Text>
            </View>
          </View>

          {isCreator ? (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>👑 You created this group</Text>
            </View>
          ) : isMember ? (
            <View style={[styles.creatorBadge, { backgroundColor: colors.successBg }]}>
              <Text style={[styles.creatorBadgeText, { color: colors.success }]}>✅ You are a member</Text>
            </View>
          ) : g.members?.length < g.maxMembers ? (
            <Button
              title="Join Group"
              size="sm"
              onPress={() => Alert.alert('Join Group', `Join "${g.name}"?`, [{ text: 'Cancel' }, { text: 'Join', onPress: () => joinGroup(g._id) }])}
              style={{ marginTop: 4 }}
            />
          ) : (
            <View style={[styles.creatorBadge, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.creatorBadgeText, { color: colors.textMuted }]}>🔒 Group is full</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Adashe / Esusu 🤝" subtitle="Collective savings groups" navigation={navigation} />

      {isLoading ? <Spinner /> : (
        <FlatList
          data={groups || []}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="🤝"
              title="No Groups Yet"
              description="Create or join a savings group with your community."
              action={<Button title="Create Group" onPress={() => setShowCreate(true)} size="sm" />}
            />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
        <Text style={{ fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 }}>+</Text>
      </TouchableOpacity>

      <CreateGroupModal visible={showCreate} onClose={() => setShowCreate(false)} />
      <GroupDetailModal visible={!!selectedGroup} group={selectedGroup} onClose={() => setSelectedGroup(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  groupIcon: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  groupMeta: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  groupRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  groupInfoItem: { flex: 1, backgroundColor: colors.gray50, borderRadius: radius.md, padding: 10, alignItems: 'center' },
  groupInfoLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  groupInfoVal: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  creatorBadge: { backgroundColor: colors.primaryBg, borderRadius: radius.md, padding: 8, alignItems: 'center' },
  creatorBadgeText: { fontSize: typography.xs, fontWeight: '600', color: colors.primary },
  groupStats: { flexDirection: 'row', gap: 10, backgroundColor: colors.gray50, borderRadius: radius.lg, padding: 16 },
  groupStatItem: { flex: 1, alignItems: 'center' },
  groupStatVal: { fontSize: typography.lg, fontWeight: '800', color: colors.primary },
  groupStatLabel: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  membersTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  memberName: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  memberContrib: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
