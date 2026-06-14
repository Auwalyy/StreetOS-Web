import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { transactionApi } from '../../api/services';
import { Card, Badge, EmptyState, Spinner, ScreenHeader, Button } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const TYPE_COLORS = { sale: 'green', expense: 'red', income: 'blue', refund: 'yellow', transfer: 'purple' };

export default function TransactionsScreen({ navigation }) {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions', currentBusiness?._id, search, typeFilter],
    queryFn: () => transactionApi.getAll(currentBusiness._id, { search, type: typeFilter }).then(r => r.data),
    enabled: !!currentBusiness,
  });

  const { mutate: deleteT } = useMutation({
    mutationFn: (id) => transactionApi.delete(currentBusiness._id, id),
    onSuccess: () => qc.invalidateQueries(['transactions']),
  });

  const transactions = data?.data || [];
  const total = data?.pagination?.total || 0;

  const totalRevenue = transactions.filter(t => t.type === 'sale').reduce((a, b) => a + b.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  const renderItem = ({ item: t }) => (
    <View style={styles.txItem}>
      <View style={[styles.txIconWrap, { backgroundColor: t.type === 'sale' ? colors.successBg : t.type === 'expense' ? colors.dangerBg : colors.infoBg }]}>
        <Text style={{ fontSize: 18 }}>{t.type === 'sale' ? '💰' : t.type === 'expense' ? '💸' : '💳'}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.txDesc} numberOfLines={1}>{t.description || t.type}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <Badge label={t.type} color={TYPE_COLORS[t.type] || 'gray'} />
          <Text style={styles.txDate}>{format(new Date(t.date), 'dd MMM yyyy')}</Text>
        </View>
      </View>
      <Text style={[styles.txAmount, { color: t.type === 'expense' ? colors.danger : colors.success }]}>
        {t.type === 'expense' ? '-' : '+'}₦{t.amount.toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Transactions" subtitle={`${total} records`} />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.successBg }]}>
          <Text style={styles.summaryLabel}>Revenue</Text>
          <Text style={[styles.summaryValue, { color: colors.success }]}>₦{totalRevenue.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.dangerBg }]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: colors.danger }]}>₦{totalExpense.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.primaryBg }]}>
          <Text style={styles.summaryLabel}>Profit</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>₦{(totalRevenue - totalExpense).toLocaleString()}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search transactions..."
          placeholderTextColor={colors.gray400}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type Filters */}
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['', 'sale', 'expense', 'income'].map(t => (
            <TouchableOpacity key={t} onPress={() => setTypeFilter(t)} style={[styles.filterChip, typeFilter === t && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, typeFilter === t && { color: colors.white }]}>
                {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? <Spinner /> : (
        <FlatList
          data={transactions}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.gray50 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="💳" title="No Transactions Yet" description="Add your first sale or expense to get started." action={<Button title="Add Transaction" onPress={() => navigation.navigate('AddTransaction')} size="sm" />} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddTransaction')} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  summaryCard: { flex: 1, borderRadius: radius.md, padding: 10, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '500', marginBottom: 2 },
  summaryValue: { fontSize: 13, fontWeight: '800' },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: 10 },
  search: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: typography.sm, borderWidth: 1, borderColor: colors.gray200, color: colors.text },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray600 },
  txItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, backgroundColor: colors.white },
  txIconWrap: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  txDate: { fontSize: typography.xs, color: colors.textMuted },
  txAmount: { fontSize: typography.base, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 },
});
