import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { analyticsApi, aiApi, businessApi } from '../../api/services';
import { Card, StatCard, ScoreRing, Badge, Spinner, SectionHeader } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const QUICK_ACTIONS = [
  { icon: '💳', label: 'Add Sale', screen: 'AddTransaction', params: { type: 'sale' } },
  { icon: '💸', label: 'Add Expense', screen: 'AddTransaction', params: { type: 'expense' } },
  { icon: '📒', label: 'Record Debt', screen: 'Debts' },
  { icon: '📦', label: 'Add Product', screen: 'Inventory' },
  { icon: '👤', label: 'Add Customer', screen: 'Customers', params: { openAdd: true } },
  { icon: '🤖', label: 'AI Advisor', screen: 'AI' },
];

export default function DashboardScreen({ navigation }) {
  const { user, currentBusiness, setCurrentBusiness } = useAuthStore();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessApi.getAll().then(r => r.data.data),
    enabled: showSwitcher,
  });

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['analytics-dashboard', currentBusiness?._id],
    queryFn: () => analyticsApi.getDashboard(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  const { data: health } = useQuery({
    queryKey: ['health-score', currentBusiness?._id],
    queryFn: () => analyticsApi.getHealthScore(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
    staleTime: 5 * 60 * 1000,
  });

  const { data: advice } = useQuery({
    queryKey: ['ai-advice', currentBusiness?._id],
    queryFn: () => aiApi.getAdvice(currentBusiness._id).then(r => r.data.data),
    enabled: !!currentBusiness,
    staleTime: 5 * 60 * 1000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.header}>
        <View style={styles.headerTop}>
          {/* Business name — tap to switch */}
          <TouchableOpacity onPress={() => setShowSwitcher(true)} activeOpacity={0.8}>
            <Text style={styles.greeting}>{greeting}, {user?.firstName} 👋</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.bizName}>{currentBusiness?.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>⌄</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <View style={styles.notifBtn}>
              <Text style={{ fontSize: 20 }}>🔔</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.balanceLabel}>Revenue This Month</Text>
            <Text style={styles.balanceValue}>₦{(stats?.revenue || 0).toLocaleString()}</Text>
            {stats?.revenueGrowth !== undefined && (
              <View style={styles.growthRow}>
                <Text style={[styles.growthText, { color: Number(stats.revenueGrowth) >= 0 ? '#4ade80' : '#f87171' }]}>
                  {Number(stats.revenueGrowth) >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueGrowth)}% vs last month
                </Text>
              </View>
            )}
          </View>
          {health && (
            <View style={{ alignItems: 'center' }}>
              <ScoreRing score={health.score} size={70} />
              <Text style={styles.scoreLabel}>Health Score</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, marginTop: -20 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={{ flex: 1 }}>
            <StatCard title="Expenses" value={stats?.expenses || 0} prefix="₦" icon="💸" bgColor={colors.dangerBg} />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard title="Net Profit" value={stats?.profit || 0} prefix="₦" icon="📈" bgColor={colors.successBg} />
          </View>
        </View>
        <View style={[styles.statsGrid, { marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <StatCard title="Customers" value={stats?.customers || 0} icon="👥" bgColor={colors.infoBg} />
          </View>
          <View style={{ flex: 1 }}>
            <StatCard title="Active Debts" value={`₦${(stats?.activeDebtBalance || 0).toLocaleString()}`} icon="📒" bgColor={colors.warningBg} />
          </View>
        </View>

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" style={{ marginTop: 24 }} />
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.quickItem}
              onPress={() => navigation.navigate(a.screen, a.params)}
              activeOpacity={0.7}
            >
              <View style={styles.quickIcon}><Text style={{ fontSize: 22 }}>{a.icon}</Text></View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Advisor */}
        {advice && (
          <View style={{ marginTop: 24 }}>
            <SectionHeader title="🤖 AI Advisor" action={() => navigation.navigate('AI')} />
            <Card>
              {advice.warnings?.slice(0, 2).map((w, i) => (
                <View key={i} style={styles.adviceItem}>
                  <Text style={{ fontSize: 14 }}>⚠️</Text>
                  <Text style={[styles.adviceText, { color: '#92400e' }]}>{w}</Text>
                </View>
              ))}
              {advice.recommendations?.slice(0, 2).map((r, i) => (
                <View key={i} style={[styles.adviceItem, { backgroundColor: colors.infoBg }]}>
                  <Text style={{ fontSize: 14 }}>💡</Text>
                  <Text style={[styles.adviceText, { color: '#1e40af' }]}>{r}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Alerts */}
        {stats?.lowStockCount > 0 && (
          <TouchableOpacity style={styles.alert} onPress={() => navigation.navigate('Inventory')}>
            <Text style={{ fontSize: 20 }}>📦</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.alertTitle}>{stats.lowStockCount} Low Stock Alert{stats.lowStockCount > 1 ? 's' : ''}</Text>
              <Text style={styles.alertSub}>Tap to view products</Text>
            </View>
            <Text style={{ color: colors.warning }}>→</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Business Switcher Modal */}
      <Modal visible={showSwitcher} transparent animationType="fade" onRequestClose={() => setShowSwitcher(false)}>
        <Pressable style={styles.switcherOverlay} onPress={() => setShowSwitcher(false)}>
          <Pressable style={styles.switcherSheet}>
            <View style={styles.switcherHandle} />
            <Text style={styles.switcherTitle}>Switch Business</Text>
            {(businesses || []).map(biz => (
              <TouchableOpacity
                key={biz._id}
                style={[styles.switcherItem, currentBusiness?._id === biz._id && styles.switcherItemActive]}
                onPress={() => { setCurrentBusiness(biz); setShowSwitcher(false); }}
                activeOpacity={0.7}
              >
                <View style={styles.switcherBizIcon}>
                  <Text style={{ fontSize: 20 }}>🏪</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.switcherBizName}>{biz.name}</Text>
                  <Text style={styles.switcherBizCat}>{biz.category?.replace('_', ' ')} · {biz.address?.city}</Text>
                </View>
                {currentBusiness?._id === biz._id && (
                  <View style={styles.switcherCheck}>
                    <Text style={{ color: colors.white, fontSize: 13, fontWeight: '800' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addBizBtn}
              onPress={() => setShowSwitcher(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.addBizText}>+ Create New Business</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 54, paddingHorizontal: spacing.xl, paddingBottom: 40 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { fontSize: typography.sm, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  bizName: { fontSize: typography.xl, fontWeight: '800', color: colors.white },
  notifBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  balanceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.xl, padding: spacing.lg },
  balanceLabel: { fontSize: typography.sm, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  balanceValue: { fontSize: 28, fontWeight: '900', color: colors.white },
  growthRow: { marginTop: 4 },
  growthText: { fontSize: typography.xs, fontWeight: '600' },
  scoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { paddingHorizontal: spacing.lg, paddingTop: 28 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem: { width: '30%', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.gray100 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 11, fontWeight: '600', color: colors.gray700, textAlign: 'center' },
  adviceItem: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: '#fffbeb', borderRadius: radius.md, marginBottom: 8, alignItems: 'flex-start' },
  adviceText: { flex: 1, fontSize: typography.sm, lineHeight: 18 },
  alert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: radius.lg, padding: spacing.lg, marginTop: 12, borderWidth: 1, borderColor: '#fde68a' },
  alertTitle: { fontSize: typography.base, fontWeight: '700', color: '#92400e' },
  alertSub: { fontSize: typography.xs, color: '#a16207', marginTop: 2 },
  // Business Switcher
  switcherOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  switcherSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 },
  switcherHandle: { width: 36, height: 4, backgroundColor: colors.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  switcherTitle: { fontSize: typography.xl, fontWeight: '800', color: colors.text, marginBottom: 16 },
  switcherItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  switcherItemActive: { backgroundColor: colors.primaryBg, borderRadius: radius.lg, paddingHorizontal: 10 },
  switcherBizIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  switcherBizName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  switcherBizCat: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  switcherCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addBizBtn: { marginTop: 12, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.primaryBg, alignItems: 'center', borderWidth: 1, borderColor: colors.primaryLight },
  addBizText: { fontSize: typography.base, fontWeight: '700', color: colors.primary },
});
