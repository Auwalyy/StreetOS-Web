import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { savingsApi, goalApi } from '../../api/services';
import { Card, Button, Spinner, EmptyState, BottomModal, Input, AmountInput, PickerRow, ScreenHeader, SectionHeader } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

function SavingsModal({ visible, onClose, businessId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'business', targetAmount: '', frequency: 'monthly' });
  const { mutate, isPending } = useMutation({
    mutationFn: () => savingsApi.create(businessId, { ...form, targetAmount: Number(form.targetAmount) }),
    onSuccess: () => { qc.invalidateQueries(['savings']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });
  return (
    <BottomModal visible={visible} onClose={onClose} title="New Savings Plan" height="75%">
      <View style={{ gap: 14 }}>
        <Input label="Plan Name *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Business Emergency Fund" />
        <PickerRow label="Type" value={form.type} options={[{ value: 'personal', label: '👤 Personal' }, { value: 'business', label: '🏪 Business' }, { value: 'emergency', label: '🆘 Emergency' }]} onChange={v => setForm(f => ({ ...f, type: v }))} />
        <AmountInput label="Target Amount *" value={form.targetAmount} onChange={v => setForm(f => ({ ...f, targetAmount: v }))} />
        <PickerRow label="Frequency" value={form.frequency} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'manual', label: 'Manual' }]} onChange={v => setForm(f => ({ ...f, frequency: v }))} />
        <Button title="Create Savings Plan" onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

function GoalModal({ visible, onClose, businessId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', type: 'revenue', targetAmount: '', period: 'monthly' });
  const { mutate, isPending } = useMutation({
    mutationFn: () => goalApi.create(businessId, { ...form, targetAmount: Number(form.targetAmount) }),
    onSuccess: () => { qc.invalidateQueries(['goals']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });
  return (
    <BottomModal visible={visible} onClose={onClose} title="Set a Goal" height="70%">
      <View style={{ gap: 14 }}>
        <Input label="Goal Title *" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. Hit ₦500k this month" />
        <PickerRow label="Goal Type" value={form.type} options={[{ value: 'revenue', label: '💰 Revenue' }, { value: 'profit', label: '📈 Profit' }, { value: 'savings', label: '🏦 Savings' }, { value: 'customer', label: '👥 Customers' }]} onChange={v => setForm(f => ({ ...f, type: v }))} />
        <AmountInput label="Target Amount *" value={form.targetAmount} onChange={v => setForm(f => ({ ...f, targetAmount: v }))} />
        <PickerRow label="Period" value={form.period} options={[{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }]} onChange={v => setForm(f => ({ ...f, period: v }))} />
        <Button title="Set Goal 🎯" onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

function DepositModal({ visible, saving, onClose, businessId }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  const { mutate, isPending } = useMutation({
    mutationFn: () => savingsApi.addTransaction(businessId, saving._id, { amount: Number(amount), type }),
    onSuccess: () => { qc.invalidateQueries(['savings']); onClose(); setAmount(''); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });
  if (!saving) return null;
  return (
    <BottomModal visible={visible} onClose={onClose} title={saving.name} height="55%">
      <View style={{ gap: 14 }}>
        <PickerRow label="Type" value={type} options={[{ value: 'deposit', label: '+ Deposit' }, { value: 'withdrawal', label: '- Withdraw' }]} onChange={setType} />
        <AmountInput label="Amount" value={amount} onChange={setAmount} />
        <Button title="Confirm" onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

export default function SavingsScreen({ navigation }) {
  const { currentBusiness } = useAuthStore();
  const [showSavings, setShowSavings] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [depositSaving, setDepositSaving] = useState(null);

  const { data: savings, isLoading: savingsLoading, refetch, isRefetching } = useQuery({
    queryKey: ['savings', currentBusiness?._id],
    queryFn: () => savingsApi.getAll(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals', currentBusiness?._id],
    queryFn: () => goalApi.getAll(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="Savings & Goals 🏦"
        navigation={navigation}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowGoal(true)}>
              <Text style={styles.headerBtnText}>🎯 Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.primary }]} onPress={() => setShowSavings(true)}>
              <Text style={[styles.headerBtnText, { color: colors.white }]}>+ Plan</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}>
        {/* Savings Plans */}
        <SectionHeader title="Savings Plans" action={() => setShowSavings(true)} actionLabel="+ New" />
        {savingsLoading ? <Spinner size="small" /> : savings?.length === 0 ? (
          <EmptyState icon="🏦" title="No Savings Plans" description="Create a plan to grow your business." action={<Button title="Create Plan" onPress={() => setShowSavings(true)} size="sm" />} />
        ) : savings?.map(s => {
          const pct = s.targetAmount > 0 ? Math.min((s.currentAmount / s.targetAmount) * 100, 100) : 0;
          return (
            <Card key={s._id} style={{ marginBottom: 10 }}>
              <View style={styles.savingsTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.savingsName}>{s.name}</Text>
                  <Text style={styles.savingsType}>{s.type} · {s.frequency}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: s.status === 'completed' ? colors.successBg : colors.primaryBg }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: s.status === 'completed' ? colors.success : colors.primary }}>{s.status}</Text>
                </View>
              </View>
              <Text style={styles.savingsAmount}>₦{s.currentAmount.toLocaleString()}</Text>
              <Text style={styles.savingsTarget}>of ₦{s.targetAmount.toLocaleString()} target</Text>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressPct}>{pct.toFixed(0)}% achieved</Text>
              <TouchableOpacity style={styles.addMoneyBtn} onPress={() => setDepositSaving(s)}>
                <Text style={styles.addMoneyText}>+ Add Money</Text>
              </TouchableOpacity>
            </Card>
          );
        })}

        {/* Goals */}
        <SectionHeader title="Business Goals 🎯" action={() => setShowGoal(true)} actionLabel="+ New" style={{ marginTop: 24 }} />
        {goalsLoading ? <Spinner size="small" /> : goals?.length === 0 ? (
          <EmptyState icon="🎯" title="No Goals Set" description="Set revenue or savings goals to stay on track." action={<Button title="Set Goal" onPress={() => setShowGoal(true)} size="sm" />} />
        ) : goals?.map(g => {
          const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
          return (
            <Card key={g._id} style={{ marginBottom: 10 }}>
              <Text style={styles.savingsName}>{g.title}</Text>
              <Text style={styles.savingsType}>{g.type?.replace('_', ' ')} · {g.period}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 }}>
                <Text style={{ fontSize: typography.sm, color: colors.textSecondary }}>₦{g.currentAmount.toLocaleString()}</Text>
                <Text style={{ fontSize: typography.sm, fontWeight: '700', color: colors.text }}>₦{g.targetAmount.toLocaleString()}</Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? colors.success : colors.primary }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={styles.progressPct}>{pct.toFixed(0)}% complete</Text>
                <View style={[styles.statusBadge, { backgroundColor: g.status === 'completed' ? colors.successBg : colors.primaryBg }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: g.status === 'completed' ? colors.success : colors.primary }}>{g.status}</Text>
                </View>
              </View>
            </Card>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SavingsModal visible={showSavings} onClose={() => setShowSavings(false)} businessId={currentBusiness?._id} />
      <GoalModal visible={showGoal} onClose={() => setShowGoal(false)} businessId={currentBusiness?._id} />
      <DepositModal visible={!!depositSaving} saving={depositSaving} onClose={() => setDepositSaving(null)} businessId={currentBusiness?._id} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  headerBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray700 },
  savingsTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  savingsName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  savingsType: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  savingsAmount: { fontSize: 24, fontWeight: '900', color: colors.text },
  savingsTarget: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: 10 },
  progressBg: { height: 8, backgroundColor: colors.gray100, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  progressPct: { fontSize: typography.xs, color: colors.textMuted, marginTop: 4 },
  addMoneyBtn: { marginTop: 12, backgroundColor: colors.primaryBg, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  addMoneyText: { fontSize: typography.sm, fontWeight: '700', color: colors.primary },
});
