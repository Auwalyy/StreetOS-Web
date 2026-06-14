import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { supplierApi } from '../../api/services';
import { Card, Button, Spinner, EmptyState, ScreenHeader, BottomModal, Input } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

function SupplierModal({ visible, onClose, businessId, supplier }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(supplier || { name: '', phone: '', email: '', address: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const { mutate, isPending } = useMutation({
    mutationFn: () => supplier ? supplierApi.update(businessId, supplier._id, form) : supplierApi.create(businessId, form),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });
  return (
    <BottomModal visible={visible} onClose={onClose} title={supplier ? 'Edit Supplier' : 'Add Supplier'} height="80%">
      <View style={{ gap: 12 }}>
        <Input label="Supplier Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Alaba Electronics Ltd" />
        <Input label="Phone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" />
        <Input label="Email" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" />
        <Input label="Address" value={form.address} onChangeText={v => set('address', v)} />
        <Input label="Notes" value={form.notes} onChangeText={v => set('notes', v)} multiline numberOfLines={3} style={{ minHeight: 64, textAlignVertical: 'top' }} />
        <Button title={supplier ? 'Update Supplier' : 'Add Supplier'} onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

export default function SuppliersScreen({ navigation }) {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', currentBusiness?._id, search],
    queryFn: () => supplierApi.getAll(currentBusiness._id, { search }).then(r => r.data.data),
    enabled: !!currentBusiness,
  });

  const { mutate: deleteS } = useMutation({
    mutationFn: (id) => supplierApi.delete(currentBusiness._id, id),
    onSuccess: () => qc.invalidateQueries(['suppliers']),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Suppliers 🚚" subtitle={`${suppliers?.length || 0} suppliers`} navigation={navigation} />

      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 10 }}>
        <TextInput style={styles.search} placeholder="Search suppliers..." placeholderTextColor={colors.gray400} value={search} onChangeText={setSearch} />
      </View>

      {isLoading ? <Spinner /> : (
        <FlatList
          data={suppliers}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: 100 }}
          ListEmptyComponent={<EmptyState icon="🚚" title="No Suppliers Yet" description="Add your suppliers to track purchases and balances." action={<Button title="Add Supplier" onPress={() => { setEditSupplier(null); setShowModal(true); }} />} />}
          renderItem={({ item: s }) => (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.suppIcon}>
                  <Text style={styles.suppInitial}>{s.name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.suppName}>{s.name}</Text>
                  <Text style={styles.suppContact}>{s.phone || s.email || 'No contact info'}</Text>
                  {s.outstandingBalance > 0 ? <Text style={styles.suppBalance}>₦{s.outstandingBalance.toLocaleString()} owed</Text> : null}
                </View>
                <View style={{ alignItems: 'center' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Text key={i} style={{ fontSize: 12, color: i < (s.rating || 0) ? '#f59e0b' : colors.gray200 }}>★</Text>
                  ))}
                </View>
              </View>
              <View style={styles.suppActions}>
                <TouchableOpacity style={styles.suppBtn} onPress={() => { setEditSupplier(s); setShowModal(true); }}>
                  <Text style={styles.suppBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.suppBtn, { borderColor: colors.dangerBg, backgroundColor: colors.dangerBg }]} onPress={() => Alert.alert('Delete', 'Delete this supplier?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteS(s._id) }])}>
                  <Text style={[styles.suppBtnText, { color: colors.danger }]}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { setEditSupplier(null); setShowModal(true); }}>
        <Text style={{ fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 }}>+</Text>
      </TouchableOpacity>

      <SupplierModal visible={showModal} onClose={() => { setShowModal(false); setEditSupplier(null); }} businessId={currentBusiness?._id} supplier={editSupplier} />
    </View>
  );
}

const styles = StyleSheet.create({
  search: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: typography.sm, borderWidth: 1, borderColor: colors.gray200, color: colors.text },
  suppIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.infoBg, alignItems: 'center', justifyContent: 'center' },
  suppInitial: { fontSize: typography.xl, fontWeight: '800', color: colors.info },
  suppName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  suppContact: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  suppBalance: { fontSize: typography.xs, color: colors.danger, fontWeight: '600', marginTop: 2 },
  suppActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  suppBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' },
  suppBtnText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray600 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
