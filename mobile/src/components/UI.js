import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, Modal, ScrollView, Pressable,
} from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../theme';

// ─── BUTTON ───────────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style, icon }) {
  const bg = {
    primary: colors.primary,
    secondary: colors.white,
    danger: colors.danger,
    success: colors.success,
    ghost: 'transparent',
    outline: 'transparent',
  };
  const textCol = {
    primary: colors.white,
    secondary: colors.gray700,
    danger: colors.white,
    success: colors.white,
    ghost: colors.primary,
    outline: colors.primary,
  };
  const pd = { sm: { paddingVertical: 8, paddingHorizontal: 14 }, md: { paddingVertical: 12, paddingHorizontal: 20 }, lg: { paddingVertical: 16, paddingHorizontal: 28 } };
  const fs = { sm: typography.sm, md: typography.base, lg: typography.lg };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bg[variant] },
        (variant === 'secondary' || variant === 'outline') && { borderWidth: 1, borderColor: variant === 'outline' ? colors.primary : colors.gray200 },
        pd[size],
        (loading || disabled) && { opacity: 0.6 },
        ...shadows.sm,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textCol[variant]} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon}
          <Text style={[styles.btnText, { color: textCol[variant], fontSize: fs[size] }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
export function Input({ label, error, style, containerStyle, ...props }) {
  return (
    <View style={[{ marginBottom: 4 }, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.gray400}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, padding = true }) {
  return (
    <View style={[styles.card, padding && { padding: spacing.lg }, ...shadows.sm, style]}>
      {children}
    </View>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
export function Badge({ label, color = 'gray' }) {
  const map = {
    gray: { bg: colors.gray100, text: colors.gray600 },
    green: { bg: '#dcfce7', text: '#16a34a' },
    red: { bg: '#fee2e2', text: '#dc2626' },
    orange: { bg: '#ffedd5', text: '#ea580c' },
    blue: { bg: '#dbeafe', text: '#2563eb' },
    yellow: { bg: '#fef9c3', text: '#ca8a04' },
    purple: { bg: '#f3e8ff', text: '#9333ea' },
  };
  const c = map[color] || map.gray;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
export function StatCard({ title, value, change, icon, bgColor = '#fff7ed', textColor = colors.primary, prefix = '' }) {
  return (
    <Card style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={[styles.statIcon, { backgroundColor: bgColor }]}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={styles.statTitle} numberOfLines={1}>{title}</Text>
      {change !== undefined && (
        <Text style={[styles.statChange, { color: Number(change) >= 0 ? colors.success : colors.danger }]}>
          {Number(change) >= 0 ? '↑' : '↓'} {Math.abs(change)}%
        </Text>
      )}
    </Card>
  );
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'large', color = colors.primary }) {
  return (
    <View style={styles.spinnerWrap}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDesc}>{description}</Text>}
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
export function Avatar({ name = '', src, size = 'md' }) {
  const sizes = { sm: 32, md: 40, lg: 52 };
  const fontSize = { sm: 12, md: 15, lg: 20 };
  const dim = sizes[size];
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  return (
    <View style={[styles.avatar, { width: dim, height: dim, borderRadius: dim / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: fontSize[size] }]}>{initials}</Text>
    </View>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
export function ScoreRing({ score = 0, size = 100, label }) {
  const color = score >= 70 ? colors.success : score >= 40 ? colors.primary : colors.danger;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View style={[{ width: size, height: size, borderRadius: size / 2, borderWidth: 8, borderColor: colors.gray100, alignItems: 'center', justifyContent: 'center' }]}>
        <View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 8, borderColor: color, borderTopColor: 'transparent', transform: [{ rotate: `${(score / 100) * 360 - 90}deg` }] }]} />
        <Text style={{ fontSize: size * 0.22, fontWeight: '800', color }}>{score}</Text>
      </View>
      {label && <Text style={{ fontSize: typography.sm, color: colors.textSecondary }}>{label}</Text>}
    </View>
  );
}

// ─── BOTTOM SHEET MODAL ───────────────────────────────────────────────────────
export function BottomModal({ visible, onClose, title, children, height = '70%' }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.bottomSheet, { height }]}>
          <View style={styles.bottomHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 20, color: colors.gray400 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
export function SectionHeader({ title, action, actionLabel }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action}>
          <Text style={styles.sectionAction}>{actionLabel || 'See all'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── SCREEN HEADER ────────────────────────────────────────────────────────────
export function ScreenHeader({ title, subtitle, right, onBack, navigation }) {
  return (
    <View style={styles.screenHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {(onBack || navigation) && (
          <TouchableOpacity onPress={() => { onBack ? onBack() : navigation?.goBack() }} style={styles.backBtn}>
            <Text style={{ fontSize: 18, color: colors.gray700 }}>←</Text>
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.screenTitle}>{title}</Text>
          {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

// ─── PICKER ROW ───────────────────────────────────────────────────────────────
export function PickerRow({ label, value, options, onChange }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.pickerWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.pickerChip, value === opt.value && styles.pickerChipActive]}
            >
              <Text style={[styles.pickerChipText, value === opt.value && { color: colors.white }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── AMOUNT INPUT ─────────────────────────────────────────────────────────────
export function AmountInput({ label, value, onChange, error }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.amountWrap}>
        <Text style={styles.amountPrefix}>₦</Text>
        <TextInput
          style={styles.amountInput}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor={colors.gray400}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ─── LIST ITEM ────────────────────────────────────────────────────────────────
export function ListItem({ left, title, subtitle, right, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={[styles.listItem, style]}>
      {left}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.listItemTitle} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.listItemSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </TouchableOpacity>
  );
}

// ─── DIVIDER ──────────────────────────────────────────────────────────────────
export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.gray100, marginVertical: 2 }} />;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn: { borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '600', textAlign: 'center' },
  label: { fontSize: typography.sm, fontWeight: '500', color: colors.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: typography.base,
    color: colors.text, backgroundColor: colors.white,
  },
  inputError: { borderColor: colors.danger, backgroundColor: '#fef2f2' },
  errorText: { fontSize: typography.xs, color: colors.danger, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gray100 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  statIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: typography.xl, fontWeight: '800', color: colors.text, marginBottom: 2 },
  statTitle: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: '500' },
  statChange: { fontSize: typography.xs, marginTop: 4, fontWeight: '600' },
  spinnerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: typography.sm, color: colors.textSecondary, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  avatar: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl },
  bottomHandle: { width: 36, height: 4, backgroundColor: colors.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  sectionAction: { fontSize: typography.sm, color: colors.primary, fontWeight: '600' },
  screenHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  screenTitle: { fontSize: typography.lg, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  pickerWrap: { paddingVertical: 4 },
  pickerChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  pickerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerChipText: { fontSize: typography.sm, fontWeight: '500', color: colors.gray600 },
  amountWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, backgroundColor: colors.white, overflow: 'hidden' },
  amountPrefix: { paddingHorizontal: 14, fontSize: typography.lg, fontWeight: '700', color: colors.primary, borderRightWidth: 1, borderRightColor: colors.gray200, paddingVertical: 12 },
  amountInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: typography.lg, color: colors.text, fontWeight: '600' },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.lg },
  listItemTitle: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  listItemSubtitle: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
});
