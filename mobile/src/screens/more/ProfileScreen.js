import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/services';
import { Card, Button, Input, ScreenHeader, Avatar, Badge } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const TABS = [
  { key: 'profile', label: '👤 Profile' },
  { key: 'security', label: '🔒 Security' },
];

export default function ProfileScreen({ navigation }) {
  const { user, setUser, logout } = useAuthStore();
  const [tab, setTab] = useState('profile');
  const [form, setForm] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate: updateProfile, isPending: updating } = useMutation({
    mutationFn: () => authApi.updateProfile(form),
    onSuccess: ({ data }) => { setUser(data.data); Alert.alert('✅', 'Profile updated!'); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  const { mutate: changePassword, isPending: changingPw } = useMutation({
    mutationFn: () => authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
    onSuccess: () => { Alert.alert('✅', 'Password changed!'); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  const handlePwChange = () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    if (pwForm.newPassword.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    changePassword();
  };

  const roleColors = { trader: 'orange', artisan: 'blue', business_owner: 'green', admin: 'red', agent: 'yellow' };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="My Profile" navigation={navigation} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.profileCard}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Avatar name={`${user?.firstName} ${user?.lastName}`} size="lg" />
              <Text style={styles.profileName}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Badge label={user?.role?.replace('_', ' ')} color={roleColors[user?.role] || 'gray'} />
                {user?.isEmailVerified && <Badge label="✓ Verified" color="green" />}
              </View>
            </View>

            <View style={styles.tabRow}>
              {TABS.map(t => (
                <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}>
                  <Text style={[styles.tabBtnText, tab === t.key && { color: colors.white }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'profile' ? (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}><Input label="First Name" value={form.firstName} onChangeText={v => set('firstName', v)} /></View>
                  <View style={{ flex: 1 }}><Input label="Last Name" value={form.lastName} onChangeText={v => set('lastName', v)} /></View>
                </View>
                <Input label="Email" value={user?.email} editable={false} style={{ backgroundColor: colors.gray50, color: colors.textMuted }} />
                <Input label="Phone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
                <Button title="Save Changes" onPress={() => updateProfile()} loading={updating} />
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Input label="Current Password" value={pwForm.currentPassword} onChangeText={v => setPwForm(f => ({ ...f, currentPassword: v }))} secureTextEntry />
                <Input label="New Password" value={pwForm.newPassword} onChangeText={v => setPwForm(f => ({ ...f, newPassword: v }))} secureTextEntry placeholder="Min. 6 characters" />
                <Input label="Confirm New Password" value={pwForm.confirmPassword} onChangeText={v => setPwForm(f => ({ ...f, confirmPassword: v }))} secureTextEntry />
                <Button title="Change Password" onPress={handlePwChange} loading={changingPw} />
              </View>
            )}
          </Card>

          <Card style={{ marginTop: 16 }}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            {[
              { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-NG', { year: 'numeric', month: 'long' }) : '—' },
              { label: 'KYC Level', value: `Level ${user?.kycLevel || 0}` },
              { label: 'Account Status', value: user?.isActive ? '✅ Active' : '⛔ Inactive' },
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            ))}
          </Card>

          <TouchableOpacity style={styles.logoutBtn} onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Sign Out', style: 'destructive', onPress: logout }])}>
            <Text style={styles.logoutText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48 },
  profileCard: { padding: spacing.xl },
  profileName: { fontSize: typography.xl, fontWeight: '800', color: colors.text, marginTop: 12 },
  profileEmail: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 20, marginTop: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: colors.gray100, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray600 },
  sectionTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  infoLabel: { fontSize: typography.sm, color: colors.textSecondary },
  infoValue: { fontSize: typography.sm, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
  logoutBtn: { marginTop: 16, backgroundColor: '#fef2f2', borderRadius: radius.xl, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: typography.base, fontWeight: '700', color: colors.danger },
});
