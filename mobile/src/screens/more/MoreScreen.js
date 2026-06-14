import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Avatar, Card } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const MENU_ITEMS = [
  { icon: '👷', label: 'Employees', screen: 'Employees', color: '#dbeafe', desc: 'Manage staff & payroll' },
  { icon: '🚚', label: 'Suppliers', screen: 'Suppliers', color: '#f0fdf4', desc: 'Track supplier balances' },
  { icon: '🏦', label: 'Savings', screen: 'Savings', color: '#fff7ed', desc: 'Savings plans & goals' },
  { icon: '🤝', label: 'Adashe/Esusu', screen: 'Adashe', color: '#fdf4ff', desc: 'Collective savings groups' },
  { icon: '💬', label: 'Community', screen: 'Community', color: '#eff6ff', desc: 'Connect & grow together' },
  { icon: '📊', label: 'Market Intel', screen: 'Market', color: '#fefce8', desc: 'Prices & market trends' },
  { icon: '🔔', label: 'Notifications', screen: 'Notifications', color: '#fff7ed', desc: 'Alerts & reminders' },
  { icon: '👤', label: 'Profile', screen: 'Profile', color: '#f0fdf4', desc: 'Account settings' },
];

export default function MoreScreen({ navigation }) {
  const { user, currentBusiness, logout } = useAuthStore();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={`${user?.firstName} ${user?.lastName}`} size="lg" />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.profileName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileRole}>{user?.role?.replace('_', ' ')}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.editBtn}>
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </TouchableOpacity>
          </View>
          {currentBusiness && (
            <View style={styles.bizRow}>
              <View style={styles.bizIcon}>
                <Text style={{ fontSize: 18 }}>🏪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizName}>{currentBusiness.name}</Text>
                <Text style={styles.bizCat}>{currentBusiness.category?.replace('_', ' ')} · {currentBusiness.address?.city}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Menu Grid */}
        <View style={styles.menuGrid}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity
              key={item.screen}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Text style={{ fontSize: 24 }}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>StreetOS AI v1.0.0</Text>
          <Text style={styles.appInfoSub}>The Financial OS for Africa's Informal Economy</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => logout()} activeOpacity={0.8}>
          <Text style={styles.logoutText}>🚪 Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 54, paddingHorizontal: spacing.xl, paddingBottom: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  headerTitle: { fontSize: typography['2xl'], fontWeight: '800', color: colors.text },
  content: { padding: spacing.lg },
  profileCard: { padding: spacing.xl, marginBottom: 20 },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  profileName: { fontSize: typography.lg, fontWeight: '800', color: colors.text },
  profileEmail: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  profileRole: { fontSize: typography.xs, color: colors.primary, fontWeight: '600', textTransform: 'capitalize', marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  bizRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.gray50, borderRadius: radius.lg, padding: 12 },
  bizIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bizName: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  bizCat: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuItem: { width: '47%', backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.gray100, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  menuIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  menuLabel: { fontSize: typography.sm, fontWeight: '700', color: colors.text, marginBottom: 3 },
  menuDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  appInfo: { alignItems: 'center', marginTop: 28, marginBottom: 16 },
  appInfoTitle: { fontSize: typography.sm, fontWeight: '700', color: colors.textSecondary },
  appInfoSub: { fontSize: typography.xs, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  logoutBtn: { backgroundColor: '#fef2f2', borderRadius: radius.xl, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: typography.base, fontWeight: '700', color: colors.danger },
});
