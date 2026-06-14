import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { businessApi } from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import { Button, Input, PickerRow } from '../../components/UI';
import { colors, typography, spacing } from '../../theme';

const CATEGORIES = [
  { value: 'retail', label: '🛒 Retail' },
  { value: 'food_vendor', label: '🍲 Food Vendor' },
  { value: 'artisan', label: '🔨 Artisan' },
  { value: 'transport', label: '🚌 Transport' },
  { value: 'agriculture', label: '🌾 Agriculture' },
  { value: 'fashion', label: '👗 Fashion' },
  { value: 'electronics', label: '📱 Electronics' },
  { value: 'healthcare', label: '💊 Healthcare' },
  { value: 'services', label: '⚙️ Services' },
  { value: 'other', label: '📦 Other' },
];

export default function NewBusinessScreen() {
  const { setCurrentBusiness, logout } = useAuthStore();
  const [form, setForm] = useState({ name: '', category: 'retail', phone: '', address: { city: '', state: '' } });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => businessApi.create(form),
    onSuccess: ({ data }) => {
      setCurrentBusiness(data.data);
    },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed to create business'),
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <LinearGradient colors={['#f97316', '#ea580c']} style={styles.hero}>
        <Text style={styles.heroEmoji}>🏪</Text>
        <Text style={styles.heroTitle}>Set Up Your Business</Text>
        <Text style={styles.heroSub}>Tell us about your business to get started</Text>
      </LinearGradient>

      <ScrollView style={styles.sheet} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Business Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Mama Ngozi Store" />

        <View style={{ marginTop: 16 }}>
          <PickerRow label="Business Category" value={form.category} options={CATEGORIES} onChange={v => set('category', v)} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Input label="Business Phone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" placeholder="+234 800 000 0000" />
        </View>

        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Input label="City" value={form.address.city} onChangeText={v => setForm(f => ({ ...f, address: { ...f.address, city: v } }))} placeholder="Lagos" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="State" value={form.address.state} onChangeText={v => setForm(f => ({ ...f, address: { ...f.address, state: v } }))} placeholder="Lagos State" />
          </View>
        </View>

        <Button title="Create Business 🚀" onPress={() => mutate()} loading={isPending} style={{ marginTop: 28 }} size="lg" />

        <TouchableOpacity onPress={() => logout()} style={styles.logoutLink}>
          <Text style={styles.logoutText}>← Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 220, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 6 },
  heroEmoji: { fontSize: 48 },
  heroTitle: { fontSize: typography['2xl'], fontWeight: '900', color: colors.white },
  heroSub: { fontSize: typography.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24 },
  content: { padding: spacing.xl, paddingTop: 28, paddingBottom: 48 },
  row: { flexDirection: 'row', gap: 12 },
  logoutLink: { marginTop: 24, alignItems: 'center' },
  logoutText: { color: colors.textSecondary, fontSize: typography.sm },
});
