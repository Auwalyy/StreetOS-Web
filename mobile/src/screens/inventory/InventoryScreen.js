import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, TextInput, Alert, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { inventoryApi, supplierApi } from '../../api/services';
import { Badge, EmptyState, Spinner, ScreenHeader, Button, BottomModal, Input, AmountInput, Select } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const UNITS = ['piece', 'bag', 'carton', 'kg', 'litre', 'pack', 'bottle', 'tin', 'roll', 'yard', 'box', 'pair', 'dozen'];

function ProductForm({ visible, onClose, businessId, editProduct, suppliers = [] }) {
  const qc = useQueryClient();
  const init = editProduct || {
    name: '', brand: '', category: '', sku: '', barcode: '',
    sellingPrice: '', costPrice: '', wholesalePrice: '', minimumPrice: '',
    quantity: '', unit: 'piece', lowStockThreshold: '5', location: '',
  };
  const [form, setForm] = useState(init);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const profit = Number(form.sellingPrice) - Number(form.costPrice);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        sellingPrice: Number(form.sellingPrice),
        costPrice: Number(form.costPrice) || 0,
        wholesalePrice: Number(form.wholesalePrice) || 0,
        minimumPrice: Number(form.minimumPrice) || 0,
        quantity: Number(form.quantity) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
      };
      return editProduct
        ? inventoryApi.updateProduct(businessId, editProduct._id, payload)
        : inventoryApi.createProduct(businessId, payload);
    },
    onSuccess: () => { qc.invalidateQueries(['inventory']); onClose(); },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  return (
    <BottomModal visible={visible} onClose={onClose} title={editProduct ? 'Edit Product' : 'Add Product'} height="92%">
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}><Input label="Product Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Rice 50kg bag" /></View>
          <View style={{ flex: 1 }}><Input label="Brand" value={form.brand} onChangeText={v => set('brand', v)} placeholder="Brand" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Input label="SKU" value={form.sku} onChangeText={v => set('sku', v)} placeholder="Optional" /></View>
          <View style={{ flex: 1 }}><Input label="Barcode" value={form.barcode} onChangeText={v => set('barcode', v)} placeholder="Scan or type" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><AmountInput label="Selling Price *" value={form.sellingPrice} onChange={v => set('sellingPrice', v)} /></View>
          <View style={{ flex: 1 }}><AmountInput label="Cost Price" value={form.costPrice} onChange={v => set('costPrice', v)} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><AmountInput label="Wholesale Price" value={form.wholesalePrice} onChange={v => set('wholesalePrice', v)} /></View>
          <View style={{ flex: 1 }}><AmountInput label="Min Price" value={form.minimumPrice} onChange={v => set('minimumPrice', v)} /></View>
        </View>
        {form.sellingPrice && form.costPrice ? (
          <View style={styles.profitRow}>
            <Text style={{ color: '#15803d', fontWeight: '700' }}>
              Profit per unit: ₦{profit.toLocaleString()} ({form.costPrice > 0 ? ((profit / Number(form.sellingPrice)) * 100).toFixed(1) : 100}% margin)
            </Text>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Input label="Quantity" value={form.quantity} onChangeText={v => set('quantity', v)} keyboardType="numeric" placeholder="0" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {UNITS.map(u => (
                <TouchableOpacity key={u} onPress={() => set('unit', u)}
                  style={[styles.unitChip, form.unit === u && styles.unitChipActive]}>
                  <Text style={[styles.unitChipText, form.unit === u && { color: colors.white }]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Input label="Low Stock Alert" value={String(form.lowStockThreshold)} onChangeText={v => set('lowStockThreshold', v)} keyboardType="numeric" /></View>
          <View style={{ flex: 1 }}><Input label="Location / Shelf" value={form.location} onChangeText={v => set('location', v)} placeholder="e.g. Shelf A3" /></View>
        </View>
        <Button title={editProduct ? 'Update Product' : 'Add Product'} onPress={() => mutate()} loading={isPending} style={{ marginTop: 8 }} />
      </View>
    </BottomModal>
  );
}

function StockAdjustModal({ visible, onClose, product, businessId }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState('');
  const [type, setType] = useState('stock_in');
  const [reason, setReason] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => inventoryApi.adjustStock(businessId, product._id, {
      quantity: type === 'stock_out' || type === 'damage' ? -Math.abs(Number(qty)) : Math.abs(Number(qty)),
      reason, type,
    }),
    onSuccess: () => { qc.invalidateQueries(['inventory']); onClose(); },
    onError: e => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  return (
    <BottomModal visible={visible} onClose={onClose} title="Adjust Stock" height="60%">
      <View style={{ gap: 12 }}>
        <View style={styles.stockInfo}>
          <Text style={{ fontWeight: '700', color: colors.text }}>{product?.name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>Current: <Text style={{ fontWeight: '700' }}>{product?.quantity} {product?.unit}s</Text></Text>
        </View>
        <View>
          <Text style={styles.label}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {[
              { val: 'stock_in', label: 'Stock In +' },
              { val: 'stock_out', label: 'Stock Out -' },
              { val: 'damage', label: 'Damage' },
              { val: 'adjustment', label: 'Adjustment' },
            ].map(t => (
              <TouchableOpacity key={t.val} onPress={() => setType(t.val)}
                style={[styles.unitChip, type === t.val && styles.unitChipActive]}>
                <Text style={[styles.unitChipText, type === t.val && { color: colors.white }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <Input label="Quantity" value={qty} onChangeText={setQty} keyboardType="numeric" placeholder="Enter quantity" />
        <Input label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. New delivery, spoilage..." />
        <Button title="Adjust Stock" onPress={() => mutate()} loading={isPending} disabled={!qty} />
      </View>
    </BottomModal>
  );
}

export default function InventoryScreen({ navigation }) {
  const { currentBusiness } = useAuthStore();
  const qc = useQueryClient();
  const bid = currentBusiness?._id;

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [tab, setTab] = useState('products');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inventory', bid, search, lowOnly],
    queryFn: () => inventoryApi.getProducts(bid, { search, lowStock: lowOnly }).then(r => r.data),
    enabled: !!bid,
  });

  const { data: reportData } = useQuery({
    queryKey: ['inventory-report', bid],
    queryFn: () => inventoryApi.getReport(bid).then(r => r.data.data),
    enabled: !!bid && tab === 'report',
  });

  const { data: forecastData } = useQuery({
    queryKey: ['inventory-forecast', bid],
    queryFn: () => inventoryApi.getForecast(bid).then(r => r.data.data),
    enabled: !!bid && tab === 'forecast',
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', bid],
    queryFn: () => supplierApi.getAll(bid).then(r => r.data.data),
    enabled: !!bid,
  });

  const { mutate: archiveP } = useMutation({
    mutationFn: (id) => inventoryApi.archiveProduct(bid, id),
    onSuccess: () => qc.invalidateQueries(['inventory']),
  });

  const products = data?.data || [];
  const lowCount = products.filter(p => p.quantity <= p.lowStockThreshold).length;

  const renderProduct = ({ item: p }) => {
    const isLow = p.quantity <= p.lowStockThreshold;
    const profit = p.sellingPrice - (p.costPrice || 0);
    return (
      <View style={[styles.card, isLow && styles.cardLow]}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{p.name}</Text>
            {p.brand && <Text style={styles.productSub}>{p.brand}</Text>}
            {p.category && <Text style={styles.productSub}>{p.category}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {p.quantity === 0
              ? <Badge label="Out of Stock" color="red" />
              : isLow ? <Badge label="Low Stock" color="yellow" />
                : <Badge label="In Stock" color="green" />}
          </View>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Price</Text>
            <Text style={styles.metaVal}>₦{p.sellingPrice.toLocaleString()}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Stock</Text>
            <Text style={[styles.metaVal, isLow && { color: colors.danger }]}>{p.quantity} {p.unit}s</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Profit</Text>
            <Text style={[styles.metaVal, { color: profit > 0 ? colors.success : colors.danger }]}>₦{profit.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setStockProduct(p)}>
            <Text style={{ fontSize: 12, color: colors.info, fontWeight: '600' }}>📦 Stock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditProduct(p); setShowModal(true); }}>
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: '#fde68a' }]}
            onPress={() => Alert.alert('Archive', 'Archive this product?', [
              { text: 'Cancel' },
              { text: 'Archive', onPress: () => archiveP(p._id) },
            ])}>
            <Text style={{ fontSize: 12, color: '#d97706', fontWeight: '600' }}>📁 Archive</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const TABS = [
    { key: 'products', label: '📦 Products' },
    { key: 'forecast', label: '📈 Forecast' },
    { key: 'report', label: '📊 Report' },
  ];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Smart Inventory"
        subtitle={`${data?.pagination?.total || 0} products · ${lowCount} low`}
        right={
          <TouchableOpacity onPress={() => navigation?.navigate('POS')} style={styles.posBtn}>
            <Text style={{ fontSize: 12, color: colors.white, fontWeight: '700' }}>⚡ POS</Text>
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 10 }}
        style={{ backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}>
            <Text style={[styles.tabChipText, tab === t.key && { color: colors.white }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'products' && (
        <>
          <View style={styles.toolbar}>
            <TextInput
              style={styles.search}
              placeholder="Search products..."
              placeholderTextColor={colors.gray400}
              value={search}
              onChangeText={setSearch}
            />
            <TouchableOpacity onPress={() => setLowOnly(!lowOnly)}
              style={[styles.filterBtn, lowOnly && { backgroundColor: colors.warning, borderColor: colors.warning }]}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: lowOnly ? colors.white : colors.gray600 }}>⚠️ Low</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? <Spinner /> : (
            <FlatList
              data={products}
              keyExtractor={item => item._id}
              renderItem={renderProduct}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100, gap: 10 }}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
              ListEmptyComponent={
                <EmptyState icon="📦" title="No Products Yet" description="Add your products to track inventory."
                  action={<Button title="Add Product" onPress={() => { setEditProduct(null); setShowModal(true); }} size="sm" />} />
              }
            />
          )}
        </>
      )}

      {tab === 'forecast' && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12 }}>
          <View style={[styles.card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <Text style={{ color: '#1d4ed8', fontSize: typography.sm }}>📈 AI predicts which products need restocking within 14 days based on sales velocity.</Text>
          </View>
          {!forecastData ? <Spinner /> : forecastData.length === 0 ? (
            <EmptyState icon="🎉" title="Stock Levels Good" description="No urgent restocking needed right now." />
          ) : forecastData.map(item => (
            <View key={item._id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: item.daysRemaining < 3 ? colors.danger : colors.warning }]}>
              <Text style={styles.productName}>{item.name}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                <View><Text style={styles.metaLabel}>Daily Sales</Text><Text style={styles.metaVal}>{item.dailyVelocity?.toFixed(1)}/day</Text></View>
                <View><Text style={styles.metaLabel}>Stock Left</Text><Text style={styles.metaVal}>{item.currentStock}</Text></View>
                <View><Text style={styles.metaLabel}>Days Left</Text><Text style={[styles.metaVal, { color: item.daysRemaining < 3 ? colors.danger : colors.warning }]}>{Math.floor(item.daysRemaining)}d</Text></View>
              </View>
              <Text style={{ marginTop: 8, fontSize: typography.sm, color: colors.danger, fontWeight: '600' }}>
                ⚠️ Restock in {item.daysRemaining < 3 ? 'TODAY' : `${Math.floor(item.daysRemaining)} days`}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {tab === 'report' && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 12 }}>
          {!reportData ? <Spinner /> : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { label: 'Products', value: reportData.totalProducts, icon: '📦' },
                  { label: 'Stock Value', value: `₦${(reportData.totalStockValue || 0).toLocaleString()}`, icon: '💰' },
                  { label: 'Retail Value', value: `₦${(reportData.totalRetailValue || 0).toLocaleString()}`, icon: '🏷️' },
                  { label: 'Pot. Profit', value: `₦${(reportData.potentialProfit || 0).toLocaleString()}`, icon: '📈' },
                ].map(s => (
                  <View key={s.label} style={[styles.card, { width: '47%', alignItems: 'center', paddingVertical: 16 }]}>
                    <Text style={{ fontSize: 28 }}>{s.icon}</Text>
                    <Text style={{ fontSize: typography.lg, fontWeight: '800', color: colors.text, marginTop: 4 }}>{s.value}</Text>
                    <Text style={{ fontSize: typography.xs, color: colors.textSecondary }}>{s.label}</Text>
                  </View>
                ))}
              </View>
              {reportData.lowStockProducts?.length > 0 && (
                <View style={styles.card}>
                  <Text style={{ fontWeight: '700', color: colors.danger, marginBottom: 10 }}>⚠️ Low Stock ({reportData.lowStockCount})</Text>
                  {reportData.lowStockProducts.slice(0, 5).map(p => (
                    <View key={p._id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.gray100 }}>
                      <Text style={{ fontSize: typography.sm, color: colors.text }}>{p.name}</Text>
                      <Text style={{ fontSize: typography.sm, fontWeight: '700', color: colors.danger }}>{p.quantity} left</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => { setEditProduct(null); setShowModal(true); }} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <ProductForm
        visible={showModal}
        onClose={() => { setShowModal(false); setEditProduct(null); }}
        businessId={bid}
        editProduct={editProduct}
        suppliers={suppliersData || []}
      />

      {stockProduct && (
        <StockAdjustModal
          visible={!!stockProduct}
          onClose={() => setStockProduct(null)}
          product={stockProduct}
          businessId={bid}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  search: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: typography.sm,
    borderWidth: 1, borderColor: colors.gray200, color: colors.text,
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.lg,
    backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200,
  },
  tabChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200,
  },
  tabChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray600 },
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.gray100,
  },
  cardLow: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  productName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  productSub: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 1 },
  cardMeta: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  metaVal: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, paddingVertical: 7, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.gray200, alignItems: 'center',
  },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 },
  posBtn: {
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  label: { fontSize: typography.sm, fontWeight: '500', color: colors.gray700, marginBottom: 6 },
  unitChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200,
  },
  unitChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitChipText: { fontSize: typography.xs, fontWeight: '600', color: colors.gray600 },
  profitRow: {
    backgroundColor: '#f0fdf4', borderRadius: radius.md,
    padding: 10, borderWidth: 1, borderColor: '#bbf7d0',
  },
  stockInfo: {
    backgroundColor: colors.gray50, borderRadius: radius.lg,
    padding: 12, marginBottom: 4,
  },
});
