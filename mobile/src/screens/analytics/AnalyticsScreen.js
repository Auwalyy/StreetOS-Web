import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { analyticsApi } from '../../api/services';
import { Card, ScoreRing, Spinner, ScreenHeader, SectionHeader } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const W = Dimensions.get('window').width;

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function SimpleBarChart({ data, height = 140 }) {
  if (!data?.length) return <View style={{ height, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.textMuted, fontSize: typography.sm }}>No data yet</Text></View>;
  const max = Math.max(...data.map(d => Math.max(d.revenue || 0, d.expenses || 0)), 1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height, paddingBottom: 20 }}>
        {data.map((d, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', gap: 3, alignItems: 'flex-end' }}>
              <View style={{ width: 14, height: Math.max(((d.revenue || 0) / max) * (height - 24), 2), backgroundColor: colors.primary, borderRadius: 3 }} />
              <View style={{ width: 14, height: Math.max(((d.expenses || 0) / max) * (height - 24), 2), backgroundColor: colors.danger, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 9, color: colors.textMuted }}>{d.name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export default function AnalyticsScreen() {
  const { currentBusiness } = useAuthStore();
  const [period, setPeriod] = useState('monthly');

  const { data: dashboard, isLoading: dashLoading, refetch, isRefetching } = useQuery({
    queryKey: ['analytics-dashboard', currentBusiness?._id],
    queryFn: () => analyticsApi.getDashboard(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  const { data: chart, isLoading: chartLoading } = useQuery({
    queryKey: ['revenue-chart', currentBusiness?._id, period],
    queryFn: () => analyticsApi.getRevenueChart(currentBusiness._id, { period }).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', currentBusiness?._id],
    queryFn: () => analyticsApi.getTopProducts(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  const { data: health } = useQuery({
    queryKey: ['health-score', currentBusiness?._id],
    queryFn: () => analyticsApi.getHealthScore(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  // Build chart data
  const chartData = [];
  if (chart) {
    const map = {};
    chart.forEach(d => {
      const key = period === 'yearly' ? String(d._id?.year) : MONTHS[(d._id?.month || 1) - 1];
      if (!map[key]) map[key] = { name: key, revenue: 0, expenses: 0 };
      if (d._id?.type === 'sale') map[key].revenue = d.total;
      if (d._id?.type === 'expense') map[key].expenses = d.total;
    });
    Object.values(map).forEach(v => chartData.push(v));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Analytics" subtitle="Business performance insights" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {[
            { label: 'Revenue', value: dashboard?.revenue || 0, color: colors.success, bg: colors.successBg, icon: '💰' },
            { label: 'Expenses', value: dashboard?.expenses || 0, color: colors.danger, bg: colors.dangerBg, icon: '💸' },
            { label: 'Net Profit', value: dashboard?.profit || 0, color: colors.primary, bg: colors.primaryBg, icon: '📈' },
            { label: 'Customers', value: dashboard?.customers || 0, color: colors.info, bg: colors.infoBg, icon: '👥', isCount: true },
          ].map((k, i) => (
            <View key={i} style={[styles.kpiCard, { backgroundColor: k.bg }]}>
              <Text style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={[styles.kpiValue, { color: k.color }]}>
                {k.isCount ? k.value : `₦${k.value.toLocaleString()}`}
              </Text>
            </View>
          ))}
        </View>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p.value} onPress={() => setPeriod(p.value)} style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}>
              <Text style={[styles.periodText, period === p.value && { color: colors.white }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <Card style={{ marginBottom: 16 }}>
          <SectionHeader title="Revenue vs Expenses" />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.primary }} />
              <Text style={{ fontSize: typography.xs, color: colors.textSecondary }}>Revenue</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: colors.danger }} />
              <Text style={{ fontSize: typography.xs, color: colors.textSecondary }}>Expenses</Text>
            </View>
          </View>
          {chartLoading ? <Spinner size="small" /> : <SimpleBarChart data={chartData} />}
        </Card>

        {/* Health Score */}
        <Card style={{ marginBottom: 16 }}>
          <SectionHeader title="Business Health Score" />
          {health ? (
            <View style={styles.healthWrap}>
              <ScoreRing score={health.score} size={110} label="Overall Score" />
              <View style={{ flex: 1, gap: 8, marginLeft: 20 }}>
                {health.strengths?.slice(0, 2).map((s, i) => (
                  <View key={i} style={[styles.healthItem, { backgroundColor: colors.successBg }]}>
                    <Text style={{ fontSize: 11 }}>✅</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: '#166534', lineHeight: 15 }}>{s}</Text>
                  </View>
                ))}
                {health.weaknesses?.slice(0, 1).map((w, i) => (
                  <View key={i} style={[styles.healthItem, { backgroundColor: colors.dangerBg }]}>
                    <Text style={{ fontSize: 11 }}>⚠️</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: '#991b1b', lineHeight: 15 }}>{w}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : <Spinner size="small" />}
        </Card>

        {/* Top Products */}
        {topProducts?.length > 0 ? (
          <Card style={{ marginBottom: 16 }}>
            <SectionHeader title="Top Selling Products" />
            {topProducts.slice(0, 5).map((p, i) => {
              const max = topProducts[0].totalRevenue || 1;
              const pct = (p.totalRevenue / max) * 100;
              return (
                <View key={i} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: typography.sm, fontWeight: '600', color: colors.text }} numberOfLines={1}>#{i + 1} {p._id || 'Unknown'}</Text>
                    <Text style={{ fontSize: typography.sm, fontWeight: '700', color: colors.primary }}>₦{p.totalRevenue?.toLocaleString()}</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: colors.gray100, borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${pct}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </Card>
        ) : null}

        {/* Recommendations */}
        {health?.recommendations?.length > 0 ? (
          <Card style={{ marginBottom: 24 }}>
            <SectionHeader title="💡 Recommendations" />
            {health.recommendations.map((r, i) => (
              <View key={i} style={styles.recItem}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>•</Text>
                <Text style={{ flex: 1, fontSize: typography.sm, color: colors.text, lineHeight: 20 }}>{r}</Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { width: (W - spacing.lg * 2 - 10) / 2, borderRadius: radius.xl, padding: 16, alignItems: 'center' },
  kpiLabel: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: '500', marginBottom: 4 },
  kpiValue: { fontSize: typography.lg, fontWeight: '800' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.lg, backgroundColor: colors.white, alignItems: 'center', borderWidth: 1, borderColor: colors.gray200 },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { fontSize: typography.xs, fontWeight: '700', color: colors.gray600 },
  healthWrap: { flexDirection: 'row', alignItems: 'center' },
  healthItem: { flexDirection: 'row', gap: 6, padding: 8, borderRadius: radius.md, alignItems: 'flex-start' },
  recItem: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray50, alignItems: 'flex-start' },
});
