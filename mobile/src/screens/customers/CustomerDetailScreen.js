import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { customerApi } from '../../api/services';
import { Avatar, ScoreRing, Card, Spinner, ScreenHeader } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';
import { format } from 'date-fns';

export default function CustomerDetailScreen({ navigation, route }) {
  const { customer, businessId } = route.params;

  const { data: detail, isLoading } = useQuery({
    queryKey: ['customer-detail', customer._id],
    queryFn: () => customerApi.get(businessId, customer._id).then(r => r.data.data),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Customer Profile" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <Avatar name={customer.name} size="lg" />
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerPhone}>{customer.phone || 'No phone'}</Text>
              {customer.email ? <Text style={styles.customerPhone}>{customer.email}</Text> : null}
            </View>
            <ScoreRing score={customer.trustScore || 0} size={64} label="Trust" />
          </View>
        </Card>

        <View style={styles.statsRow}>
          {[
            { label: 'Total Purchases', value: `₦${(customer.totalPurchases || 0).toLocaleString()}`, color: colors.success, bg: colors.successBg },
            { label: 'Total Debt', value: `₦${(customer.totalDebt || 0).toLocaleString()}`, color: colors.danger, bg: colors.dangerBg },
            { label: 'Total Paid', value: `₦${(customer.totalPaid || 0).toLocaleString()}`, color: colors.info, bg: colors.infoBg },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        {isLoading ? <Spinner /> : detail?.transactions?.length > 0 ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {detail.transactions.slice(0, 5).map((t, i) => (
              <View key={i} style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{t.description || t.type}</Text>
                  <Text style={styles.txDate}>{format(new Date(t.date), 'dd MMM yyyy')}</Text>
                </View>
                <Text style={[styles.txAmt, { color: t.type === 'expense' ? colors.danger : colors.success }]}>
                  {t.type === 'expense' ? '-' : '+'}₦{t.amount.toLocaleString()}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {customer.notes ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{customer.notes}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48 },
  profileCard: { padding: spacing.xl, marginBottom: 12 },
  profileTop: { flexDirection: 'row', alignItems: 'center' },
  customerName: { fontSize: typography.xl, fontWeight: '800', color: colors.text },
  customerPhone: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, borderRadius: radius.md, padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  sectionTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text, marginBottom: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  txDesc: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  txDate: { fontSize: typography.xs, color: colors.textMuted, marginTop: 2 },
  txAmt: { fontSize: typography.base, fontWeight: '700' },
  notes: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },
});
