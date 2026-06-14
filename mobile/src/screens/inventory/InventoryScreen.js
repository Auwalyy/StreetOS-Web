import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { productApi } from '../../api/services';
import { Badge, EmptyState, Spinner, ScreenHeader, Button, BottomModal, Input, AmountInput } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

function AddProductModal({ visible, onClose, businessId, editProduct }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(editProduct || { name: '', category: '', sellingPrice: '', costPrice: '', quantity: '', unit: 'piece', lowStockThreshold: '5' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => editProduct
      ? productApi.update(businessId, editProduct._id, { ...form, sellingPrice: Number(form.sellingPrice), costPrice: Number(form.costPrice), quantity: Number(form.quantity) })
      : productApi.create(businessId, { ...form, sellingPrice: Number(form.sellingPrice), costPrice: Number(form.costPrice), quantity: Number(form.quantity) }),
    onSuccess: () => { qc.invalidateQueries(['products']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  return (
    <BottomModal visible={visible} onClose={onClose} title={editProduct ? 'Edit Product' : 'Add Product'} height="85%">
      <View style={{ gap: 12 }}>
        <Input label="Product Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Rice 50kg bag" />
        <Input label="Category" value={form.category} onChangeText={v => set('category', v)} placeholder="e.g. Grains, Electronics" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><AmountInput label="Selling Price *" value={form.sellingPrice} onChange={v => set('sellingPrice', v)} /></View>
          <View style={{ flex: 1 }}><AmountInput label="Cost Price" value={form.costPrice} onChange={v => set('costPrice', v)} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Input label="Quantity" value={form.quantity} onChangeText={v => set('quantity', v)} keyboardType="numeric" placeholder="0" /></View>
          <View style={{ flex: 1 }}><Input label="Unit" value={form.unit} onChangeText={v => set('unit', v)} placeholder="piece" /></View>
        </View>
        <Input label="Low Stock Alert" value={String(form.lowStockThreshold)} onChangeText={v => set('lowStockThreshold', v)} keyboardType="numeric" placeholder="5" />
        <Button title={editProduct ? 'Update Product' : 'Add Product'} onPress={() => mutate()} loading={isPending} style={{ marginTop: 8 }} />
      </View>
    </BottomModal>
  );
}

export default function InventoryScreen() {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [lowOnly, setLowOnly] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['products', currentBusiness?._id, search, lowOnly],
    queryFn: () => productApi.getAll(currentBusiness._id, { search, lowStock: lowOnly }).then(r => r.data),
    enabled: !!currentBusiness,
  });

  const { mutate: deleteP } = useMutation({
    mutationFn: (id) => productApi.delete(currentBusiness._id, id),
    onSuccess: () => qc.invalidateQueries(['products']),
  });

  const products = data?.data || [];
  const lowCount = products.filter(p => p.quantity <= p.lowStockThreshold).length;

  const renderItem = ({ item: p }) => {
    const isLow = p.quantity <= p.lowStockThreshold;
    return (
      <View style={[styles.productCard, isLow && styles.productCardLow]}>
        <View style={styles.productTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{p.name}</Text>
            {p.category && <Text style={styles.productCat}>{p.category}</Text>}
          </View>
          {isLow && <Badge label="Low Stock" color="yellow" />}
        </View>
        <View style={styles.productRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productMetaLabel}>Price</Text>
            <Text style={styles.productMeta}>₦{p.sellingPrice.toLocaleString()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.productMetaLabel}>Stock</Text>
            <Text style={[styles.productMeta, isLow && { color: colors.warning }]}>{p.quantity} {p.unit}s</Text>
          </View>
          {p.costPrice > 0 && (
            <View style={{ flex: 1 }}>
              <Text style={styles.productMetaLabel}>Margin</Text>
              <Text style={[styles.productMeta, { color: colors.success }]}>
                {p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100) : 0}%
              </Text>
            </View>
          )}
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditProduct(p); setShowModal(true); }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.dangerBg }]} onPress={() => Alert.alert('Delete', 'Remove this product?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteP(p._id) }])}>
            <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '600' }}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Inventory" subtitle={`${products.length} products · ${lowCount} low stock`} />

      <View style={styles.toolbar}>
        <TextInput style={styles.search} placeholder="Search products..." placeholderTextColor={colors.gray400} value={search} onChangeText={setSearch} />
        <TouchableOpacity onPress={() => setLowOnly(!lowOnly)} style={[styles.filterBtn, lowOnly && { backgroundColor: colors.warning }]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: lowOnly ? colors.white : colors.gray600 }}>⚠️ Low</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? <Spinner /> : (
        <FlatList
          data={products}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="📦" title="No Products Yet" description="Add your products to track inventory and sales." action={<Button title="Add Product" onPress={() => { setEditProduct(null); setShowModal(true); }} size="sm" />} />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { setEditProduct(null); setShowModal(true); }} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddProductModal visible={showModal} onClose={() => { setShowModal(false); setEditProduct(null); }} businessId={currentBusiness?._id} editProduct={editProduct} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  search: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: typography.sm, borderWidth: 1, borderColor: colors.gray200, color: colors.text },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  productCard: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.gray100 },
  productCardLow: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  productTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  productName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  productCat: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  productRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  productMetaLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  productMeta: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  productActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 7, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  fabText: { fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 },
});
