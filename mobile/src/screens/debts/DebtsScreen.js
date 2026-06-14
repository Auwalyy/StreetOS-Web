import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { debtApi, customerApi } from '../../api/services';
import { Badge, EmptyState, Spinner, ScreenHeader, Button, BottomModal, Input, AmountInput, PickerRow } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const STATUS_COLORS = { active: 'orange', partial: 'yellow', paid: 'green', overdue: 'red', written_off: 'gray' };

function AddDebtModal({ visible, onClose, businessId }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ customer: '', originalAmount: '', description: '', dueDate: '', type: 'owed_to_me' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: customers } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: () => customerApi.getAll(businessId).then(r => r.data.data),
    enabled: visible,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => debtApi.create(businessId, { ...form, originalAmount: Number(form.originalAmount) }),
    onSuccess: () => { qc.invalidateQueries(['debts']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  return (
    <BottomModal visible={visible} onClose={onClose} title="Record Debt" height="85%">
      <View style={{ gap: 14 }}>
        <PickerRow
          label="Debt Type"
          value={form.type}
          options={[{ value: 'owed_to_me', label: '💰 Customer owes me' }, { value: 'i_owe', label: '💸 I owe supplier' }]}
          onChange={v => set('type', v)}
        />
        <View>
          <Text style={styles.label}>Customer *</Text>
          <View style={styles.customerList}>
            {customers?.map(c => (
              <TouchableOpacity
                key={c._id}
                onPress={() => set('customer', c._id)}
                style={[styles.customerChip, form.customer === c._id && styles.customerChipActive]}
              >
                <Text style={[styles.customerChipText, form.customer === c._id && { color: colors.white }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <AmountInput label="Amount *" value={form.originalAmount} onChange={v => set('originalAmount', v)} />
        <Input label="Description" value={form.description} onChangeText={v => set('description', v)} placeholder="e.g. Goods on credit" />
        <Input label="Due Date (YYYY-MM-DD)" value={form.dueDate} onChangeText={v => set('dueDate', v)} placeholder="2024-12-31" />
        <Button title="Record Debt" onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

function PaymentModal({ visible, debt, businessId, onClose }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const { mutate, isPending } = useMutation({
    mutationFn: () => debtApi.recordPayment(businessId, debt._id, { amount: Number(amount), method }),
    onSuccess: () => { qc.invalidateQueries(['debts']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  if (!debt) return null;
  return (
    <BottomModal visible={visible} onClose={onClose} title="Record Payment" height="55%">
      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Outstanding Balance</Text>
        <Text style={styles.balanceValue}>₦{debt.balance?.toLocaleString()}</Text>
      </View>
      <View style={{ gap: 14, marginTop: 8 }}>
        <AmountInput label="Payment Amount" value={amount} onChange={setAmount} />
        <PickerRow
          label="Payment Method"
          value={method}
          options={[
            { value: 'cash', label: '💵 Cash' },
            { value: 'transfer', label: '🏦 Transfer' },
            { value: 'pos', label: '💳 POS' },
            { value: 'opay', label: '📱 OPay' },
          ]}
          onChange={setMethod}
        />
        <Button title="Record Payment" variant="success" onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

export default function DebtsScreen() {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [payDebt, setPayDebt] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['debts', currentBusiness?._id, statusFilter],
    queryFn: () => debtApi.getAll(currentBusiness._id, { status: statusFilter }).then(r => r.data),
    enabled: !!currentBusiness,
  });

  const { mutate: remind } = useMutation({
    mutationFn: (id) => debtApi.sendReminder(currentBusiness._id, id),
    onSuccess: () => Alert.alert('✅', 'Reminder sent!'),
    onError: () => Alert.alert('Error', 'Failed to send reminder'),
  });

  const debts = data?.data || [];
  const totalOwed = debts.filter(d => d.type === 'owed_to_me').reduce((a, b) => a + b.balance, 0);
  const totalIOwe = debts.filter(d => d.type === 'i_owe').reduce((a, b) => a + b.balance, 0);

  const renderItem = ({ item: d }) => (
    <View style={styles.debtCard}>
      <View style={styles.debtTop}>
        <View style={[styles.debtIcon, { backgroundColor: d.type === 'owed_to_me' ? colors.successBg : colors.dangerBg }]}>
          <Text style={{ fontSize: 18 }}>{d.type === 'owed_to_me' ? '💰' : '💸'}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.debtName}>{d.customer?.name || 'Unknown'}</Text>
          <Text style={styles.debtDesc} numberOfLines={1}>{d.description || 'No description'}</Text>
          {d.dueDate ? <Text style={styles.debtDue}>Due: {format(new Date(d.dueDate), 'dd MMM yyyy')}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[styles.debtAmount, { color: d.type === 'owed_to_me' ? colors.success : colors.danger }]}>
            ₦{d.balance?.toLocaleString()}
          </Text>
          <Badge label={d.status} color={STATUS_COLORS[d.status]} />
        </View>
      </View>
      {d.status !== 'paid' ? (
        <View style={styles.debtActions}>
          <TouchableOpacity style={styles.debtBtn} onPress={() => setPayDebt(d)}>
            <Text style={styles.debtBtnText}>💳 Record Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.debtBtn, { backgroundColor: colors.infoBg }]} onPress={() => remind(d._id)}>
            <Text style={[styles.debtBtnText, { color: colors.info }]}>📤 Remind</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Debt Book 📒" subtitle={`${debts.length} records`} />

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.successBg }]}>
          <Text style={styles.summaryLabel}>Owed to Me</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>₦{totalOwed.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.dangerBg }]}>
          <Text style={styles.summaryLabel}>I Owe</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>₦{totalIOwe.toLocaleString()}</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['', 'active', 'partial', 'paid', 'overdue'].map(s => (
            <TouchableOpacity key={s} onPress={() => setStatusFilter(s)} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, statusFilter === s && { color: colors.white }]}>
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? <Spinner /> : (
        <FlatList
          data={debts}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="📒" title="No Debts Recorded" description="Record customer debts and track payments easily." action={<Button title="Record Debt" onPress={() => setShowAdd(true)} size="sm" />} />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddDebtModal visible={showAdd} onClose={() => setShowAdd(false)} businessId={currentBusiness?._id} />
      <PaymentModal visible={!!payDebt} debt={payDebt} businessId={currentBusiness?._id} onClose={() => setPayDebt(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  summaryCard: { flex: 1, borderRadius: radius.lg, padding: 14, alignItems: 'center' },
  summaryLabel: { fontSize: typography.xs, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: typography.xl, fontWeight: '800' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  debtCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.gray100 },
  debtTop: { flexDirection: 'row', alignItems: 'flex-start' },
  debtIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  debtName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  debtDesc: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  debtDue: { fontSize: typography.xs, color: colors.warning, marginTop: 2, fontWeight: '600' },
  debtAmount: { fontSize: typography.lg, fontWeight: '800' },
  debtActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  debtBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.successBg, alignItems: 'center' },
  debtBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.success },
  label: { fontSize: typography.sm, fontWeight: '500', color: colors.gray700, marginBottom: 8 },
  customerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customerChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  customerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  customerChipText: { fontSize: typography.sm, fontWeight: '500', color: colors.gray700 },
  balanceBox: { backgroundColor: colors.dangerBg, borderRadius: radius.lg, padding: 16, alignItems: 'center', marginBottom: 8 },
  balanceLabel: { fontSize: typography.sm, color: colors.textSecondary },
  balanceValue: { fontSize: 28, fontWeight: '900', color: colors.danger },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 },
});
