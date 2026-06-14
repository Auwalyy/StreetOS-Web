import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { customerApi } from '../../api/services';
import { Avatar, EmptyState, Spinner, ScreenHeader, Button, BottomModal, Input } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

function CustomerFormModal({ visible, onClose, businessId, customer }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(customer || { name: '', phone: '', email: '', address: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => customer ? customerApi.update(businessId, customer._id, form) : customerApi.create(businessId, form),
    onSuccess: () => { qc.invalidateQueries(['customers']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  return (
    <BottomModal visible={visible} onClose={onClose} title={customer ? 'Edit Customer' : 'Add Customer'} height="80%">
      <View style={{ gap: 12 }}>
        <Input label="Full Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Musa Ibrahim" />
        <Input label="Phone" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" placeholder="+234 800 000 0000" />
        <Input label="Email" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" placeholder="customer@email.com" />
        <Input label="Address" value={form.address} onChangeText={v => set('address', v)} placeholder="Street, City" />
        <Input label="Notes" value={form.notes} onChangeText={v => set('notes', v)} placeholder="Any notes about this customer" multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <Button title={customer ? 'Update Customer' : 'Add Customer'} onPress={() => mutate()} loading={isPending} style={{ marginTop: 8 }} />
      </View>
    </BottomModal>
  );
}

export default function CustomersScreen({ navigation }) {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers', currentBusiness?._id, search],
    queryFn: () => customerApi.getAll(currentBusiness._id, { search }).then(r => r.data),
    enabled: !!currentBusiness,
  });

  const { mutate: deleteC } = useMutation({
    mutationFn: (id) => customerApi.delete(currentBusiness._id, id),
    onSuccess: () => qc.invalidateQueries(['customers']),
  });

  const customers = data?.data || [];

  const renderItem = ({ item: c }) => (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('CustomerDetail', { customer: c, businessId: currentBusiness._id })} activeOpacity={0.7}>
      <Avatar name={c.name} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.name}>{c.name}</Text>
        <Text style={styles.phone}>{c.phone || 'No phone'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.purchases}>₦{c.totalPurchases?.toLocaleString()}</Text>
        {c.totalDebt > 0 && <Text style={styles.debt}>₦{c.totalDebt?.toLocaleString()} owed</Text>}
      </View>
      <TouchableOpacity onPress={() => { setEditCustomer(c); setShowModal(true); }} style={{ marginLeft: 8, padding: 4 }}>
        <Text>✏️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customers" subtitle={`${data?.pagination?.total || 0} customers`} />

      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 10 }}>
        <TextInput style={styles.search} placeholder="Search by name or phone..." placeholderTextColor={colors.gray400} value={search} onChangeText={setSearch} />
      </View>

      {isLoading ? <Spinner /> : (
        <FlatList
          data={customers}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.gray50, marginLeft: 70 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="👥" title="No Customers Yet" description="Add your customers to track purchases and debts." action={<Button title="Add Customer" onPress={() => { setEditCustomer(null); setShowModal(true); }} size="sm" />} />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { setEditCustomer(null); setShowModal(true); }} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <CustomerFormModal visible={showModal} onClose={() => { setShowModal(false); setEditCustomer(null); }} businessId={currentBusiness?._id} customer={editCustomer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: typography.sm, borderWidth: 1, borderColor: colors.gray200, color: colors.text },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.lg, backgroundColor: colors.white },
  name: { fontSize: typography.base, fontWeight: '600', color: colors.text },
  phone: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  purchases: { fontSize: typography.sm, fontWeight: '700', color: colors.success },
  debt: { fontSize: typography.xs, color: colors.danger, marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 },
});
