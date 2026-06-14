import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import { Button, Input } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => authApi.login(form),
    onSuccess: ({ data }) => {
      setAuth(data.data.user, data.data.token, data.data.refreshToken);
    },
    onError: (e) => Alert.alert('Login Failed', e.response?.data?.message || 'Invalid email or password'),
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#f97316', '#ea580c', '#c2410c']} style={styles.hero}>
        <View style={styles.brandWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>S</Text>
          </View>
          <Text style={styles.brand}>StreetOS AI</Text>
          <Text style={styles.tagline}>The Financial OS for Africa's Informal Economy</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Welcome back 👋</Text>
        <Text style={styles.subtitle}>Sign in to manage your business</Text>

        <View style={styles.form}>
          <Input
            label="Email Address"
            value={form.email}
            onChangeText={v => set('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <View style={{ marginTop: 12 }}>
            <Input
              label="Password"
              value={form.password}
              onChangeText={v => set('password', v)}
              secureTextEntry={!showPw}
              placeholder="••••••••"
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.showPw}>
              <Text style={styles.showPwText}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Sign In"
            onPress={() => mutate()}
            loading={isPending}
            style={{ marginTop: 20 }}
            size="lg"
          />
        </View>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign up free</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  brandWrap: { alignItems: 'center', gap: 8 },
  logo: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoText: { fontSize: 28, fontWeight: '900', color: colors.white },
  brand: { fontSize: 26, fontWeight: '900', color: colors.white },
  tagline: { fontSize: typography.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center', paddingHorizontal: 40 },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24 },
  sheetContent: { padding: spacing.xl, paddingTop: 28 },
  title: { fontSize: typography['2xl'], fontWeight: '800', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: typography.base, color: colors.textSecondary, marginBottom: 24 },
  form: { gap: 0 },
  showPw: { position: 'absolute', right: 14, bottom: 13 },
  showPwText: { fontSize: typography.sm, color: colors.primary, fontWeight: '600' },
  link: { marginTop: 28, alignItems: 'center' },
  linkText: { fontSize: typography.sm, color: colors.textSecondary },
});
