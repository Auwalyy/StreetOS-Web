import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, PickerRow } from '../../components/UI';
import { colors, typography, spacing } from '../../theme';

const ROLES = [
  { value: 'trader', label: '🛒 Trader' },
  { value: 'artisan', label: '🔨 Artisan' },
  { value: 'business_owner', label: '🏪 Business Owner' },
  { value: 'agent', label: '🤝 Agent' },
];

export default function RegisterScreen({ navigation }) {
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'trader' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: ({ data }) => {
      setAuth(data.data.user, data.data.token, data.data.refreshToken);
    },
    onError: (e) => Alert.alert('Registration Failed', e.response?.data?.message || 'Something went wrong'),
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.hero}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={{ color: colors.white, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.brandWrap}>
          <View style={styles.logo}><Text style={styles.logoText}>S</Text></View>
          <Text style={styles.brand}>Create Account</Text>
          <Text style={styles.tagline}>Join millions of African business owners</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input label="First Name" value={form.firstName} onChangeText={v => set('firstName', v)} placeholder="John" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Last Name" value={form.lastName} onChangeText={v => set('lastName', v)} placeholder="Doe" />
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Input label="Email" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="you@email.com" />
        </View>
        <View style={{ marginTop: 12 }}>
          <Input label="Phone Number" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" placeholder="+234 800 000 0000" />
        </View>
        <View style={{ marginTop: 12 }}>
          <Input label="Password" value={form.password} onChangeText={v => set('password', v)} secureTextEntry placeholder="Min. 6 characters" />
        </View>
        <View style={{ marginTop: 16 }}>
          <PickerRow label="I am a..." value={form.role} options={ROLES} onChange={v => set('role', v)} />
        </View>

        <Button title="Create Account 🚀" onPress={() => mutate()} loading={isPending} style={{ marginTop: 24 }} size="lg" />

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 200, paddingTop: 50, paddingHorizontal: spacing.xl },
  back: { marginBottom: 12 },
  brandWrap: { alignItems: 'center', gap: 6 },
  logo: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 22, fontWeight: '900', color: colors.white },
  brand: { fontSize: typography['2xl'], fontWeight: '900', color: colors.white },
  tagline: { fontSize: typography.sm, color: 'rgba(255,255,255,0.85)' },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24 },
  sheetContent: { padding: spacing.xl, paddingTop: 28, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: 12 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { fontSize: typography.sm, color: colors.textSecondary },
});
