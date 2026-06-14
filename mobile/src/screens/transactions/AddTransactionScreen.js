import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { transactionApi } from '../../api/services';
import { Button, Input, AmountInput, PickerRow, ScreenHeader } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const TYPES = [
  { value: 'sale', label: '💰 Sale' },
  { value: 'expense', label: '💸 Expense' },
  { value: 'income', label: '📥 Income' },
  { value: 'refund', label: '↩️ Refund' },
];

const METHODS = [
  { value: 'cash', label: '💵 Cash' },
  { value: 'transfer', label: '🏦 Transfer' },
  { value: 'pos', label: '💳 POS' },
  { value: 'opay', label: '📱 OPay' },
  { value: 'moniepoint', label: '📱 Moniepoint' },
  { value: 'palmpay', label: '📱 PalmPay' },
];

export default function AddTransactionScreen({ navigation, route }) {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const initialType = route?.params?.type || 'sale';

  const [form, setForm] = useState({
    type: initialType,
    amount: '',
    description: '',
    category: '',
    paymentMethod: 'cash',
    date: new Date().toISOString().split('T')[0],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => transactionApi.create(currentBusiness._id, { ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      qc.invalidateQueries(['transactions']);
      qc.invalidateQueries(['analytics-dashboard']);
      navigation.goBack();
    },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed to save'),
  });

  const typeColor = form.type === 'sale' ? colors.success : form.type === 'expense' ? colors.danger : colors.primary;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenHeader
        title="Add Transaction"
        subtitle={form.type.charAt(0).toUpperCase() + form.type.slice(1)}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type Selector */}
        <PickerRow label="Transaction Type" value={form.type} options={TYPES} onChange={v => set('type', v)} />

        {/* Amount */}
        <View style={{ marginTop: 16 }}>
          <AmountInput label="Amount" value={form.amount} onChange={v => set('amount', v)} />
        </View>

        {/* Description */}
        <View style={{ marginTop: 14 }}>
          <Input
            label="Description"
            value={form.description}
            onChangeText={v => set('description', v)}
            placeholder="What was this for?"
          />
        </View>

        {/* Category */}
        <View style={{ marginTop: 14 }}>
          <Input
            label="Category"
            value={form.category}
            onChangeText={v => set('category', v)}
            placeholder="e.g. Food, Rent, Sales"
          />
        </View>

        {/* Payment Method */}
        <View style={{ marginTop: 16 }}>
          <PickerRow label="Payment Method" value={form.paymentMethod} options={METHODS} onChange={v => set('paymentMethod', v)} />
        </View>

        {/* Date */}
        <View style={{ marginTop: 14 }}>
          <Input
            label="Date"
            value={form.date}
            onChangeText={v => set('date', v)}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Preview */}
        <View style={[styles.preview, { borderColor: typeColor + '40', backgroundColor: typeColor + '10' }]}>
          <Text style={{ fontSize: typography.sm, color: typeColor, fontWeight: '600' }}>
            {form.type === 'expense' ? '- ' : '+ '}₦{Number(form.amount || 0).toLocaleString()}
          </Text>
          <Text style={{ fontSize: typography.xs, color: colors.textSecondary }}>{form.description || 'No description'}</Text>
        </View>

        <Button
          title={`Save ${form.type.charAt(0).toUpperCase() + form.type.slice(1)}`}
          onPress={() => mutate()}
          loading={isPending}
          style={{ marginTop: 8 }}
          size="lg"
        />

        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 8 }}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, paddingBottom: 48 },
  preview: { borderRadius: radius.lg, borderWidth: 1, padding: 16, marginTop: 16, alignItems: 'center', gap: 4 },
});
