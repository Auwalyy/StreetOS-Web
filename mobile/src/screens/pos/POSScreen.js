import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { inventoryApi, customerApi, salesApi } from '../../api/services';
import { Button, Badge, Spinner, BottomModal, Input, AmountInput, ScreenHeader } from '../../components/UI';
import { colors, typography, spacing, radius, shadows } from '../../theme';

const fmt = (n) => `₦${Number(n || 0).toLocaleString()}`;

function CartItem({ item, onInc, onDec, onRemove }) {
  return (
    <View style={styles.cartItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={{ fontSize: typography.xs, color: colors.success }}>profit: {fmt(item.profit)}</Text>
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity onPress={onDec} style={styles.qtyBtn}>
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qtyVal}>{item.quantity}</Text>
        <TouchableOpacity onPress={onInc} style={styles.qtyBtn} disabled={item.quantity >= item.availableStock}>
          <Text style={[styles.qtyBtnText, item.quantity >= item.availableStock && { opacity: 0.3 }]}>+</Text>
        </TouchableOpacity>
      </View>
      <View style={{ alignItems: 'flex-end', marginLeft: 8, minWidth: 70 }}>
        <Text style={{ fontSize: typography.base, fontWeight: '700', color: colors.text }}>{fmt(item.total)}</Text>
        <Text style={{ fontSize: typography.xs, color: colors.textMuted }}>{fmt(item.unitPrice)}/ea</Text>
      </View>
      <TouchableOpacity onPress={onRemove} style={{ marginLeft: 8 }}>
        <Text style={{ fontSize: 22, color: colors.danger, lineHeight: 26 }}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function POSScreen({ navigation }) {
  const { currentBusiness } = useAuthStore();
  const bid = currentBusiness?._id;

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState('0');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [completedSale, setCompletedSale] = useState(null);

  const { data: products, isLoading: prodLoading } = useQuery({
    queryKey: ['inventory', bid, search],
    queryFn: () => inventoryApi.getProducts(bid, { search, limit: 12 }).then(r => r.data.data),
    enabled: !!bid && search.length > 1,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-search', bid, customerSearch],
    queryFn: () => customerApi.getAll(bid, { search: customerSearch, limit: 8 }).then(r => r.data.data),
    enabled: !!bid && customerSearch.length > 1,
  });

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const pid = product._id?.toString();
      const existing = prev.find(i => i.product === pid);
      if (existing) {
        const qty = existing.quantity + 1;
        return prev.map(i => i.product === pid
          ? { ...i, quantity: qty, total: i.unitPrice * qty, profit: (i.unitPrice - i.costPrice) * qty }
          : i);
      }
      return [...prev, {
        product: pid,
        name: product.name,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice || 0,
        quantity: 1,
        total: product.sellingPrice,
        profit: product.sellingPrice - (product.costPrice || 0),
        availableStock: product.quantity,
        unit: product.unit || 'piece',
      }];
    });
    setSearch('');
  }, []);

  const updateQty = (pid, qty) => {
    if (qty <= 0) { setCart(p => p.filter(i => i.product !== pid)); return; }
    setCart(p => p.map(i => i.product === pid
      ? { ...i, quantity: qty, total: i.unitPrice * qty, profit: (i.unitPrice - i.costPrice) * qty }
      : i));
  };

  const subtotal = cart.reduce((s, i) => s + i.total, 0);
  const discountAmt = Number(discount) || 0;
  const total = subtotal - discountAmt;
  const totalProfit = cart.reduce((s, i) => s + i.profit, 0);
  const change = Number(amountPaid) > total ? Number(amountPaid) - total : 0;

  const { mutate: completeSale, isPending: checkingOut } = useMutation({
    mutationFn: () => salesApi.createSale(bid, {
      items: cart.map(i => ({ product: i.product, name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
      customerId: customer?._id,
      customerName: customer?.name || 'Walk-in Customer',
      paymentMethod: payMethod,
      paymentStatus: 'paid',
      amountPaid: Number(amountPaid) || total,
      discount: discountAmt,
    }).then(r => r.data.data),
    onSuccess: (sale) => {
      setCompletedSale(sale);
      setCart([]);
      setCustomer(null);
      setAmountPaid('');
      setDiscount('0');
      setShowPayModal(false);
    },
    onError: e => Alert.alert('Error', e.response?.data?.message || 'Sale failed'),
  });

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (completedSale) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: spacing['3xl'] }]}>
        <Text style={{ fontSize: 72 }}>✅</Text>
        <Text style={styles.successTitle}>Sale Complete!</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 24 }}>{completedSale.invoiceNumber}</Text>
        <View style={styles.successCard}>
          {[
            ['Customer', completedSale.customerName],
            ['Items', String(completedSale.items?.length)],
            ['Total', fmt(completedSale.total)],
            ['Profit', fmt(completedSale.totalProfit)],
            ['Payment', completedSale.paymentMethod],
          ].map(([label, val]) => (
            <View key={label} style={styles.successRow}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>{label}</Text>
              <Text style={{ fontWeight: '700', fontSize: typography.sm, color: label === 'Total' ? colors.primary : colors.text }}>{val}</Text>
            </View>
          ))}
        </View>
        <Button title="⚡ New Sale" onPress={() => setCompletedSale(null)} style={{ marginTop: 24, width: '100%' }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="⚡ POS Checkout"
        subtitle={cart.length > 0 ? `${cart.length} items · ${fmt(total)}` : 'Search to add products'}
        right={
          <TouchableOpacity onPress={() => setShowCustomerModal(true)} style={styles.customerBtn}>
            <Text style={{ fontSize: 13, color: customer ? colors.primary : colors.gray500, fontWeight: '600' }}>
              {customer ? `👤 ${customer.name.split(' ')[0]}` : '+ Customer'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search product name or barcode..."
          placeholderTextColor={colors.gray400}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
      </View>

      {/* Product Results */}
      {search.length > 1 && (
        <View style={styles.productsSection}>
          {prodLoading
            ? <Spinner size="small" />
            : (
              <FlatList
                data={products || []}
                keyExtractor={i => i._id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ padding: spacing.md, gap: 10 }}
                ListEmptyComponent={<Text style={{ color: colors.textMuted, padding: 16 }}>No products found</Text>}
                renderItem={({ item: p }) => {
                  const isOut = p.quantity === 0;
                  return (
                    <TouchableOpacity
                      onPress={() => !isOut && addToCart(p)}
                      disabled={isOut}
                      style={[styles.productChip, isOut && { opacity: 0.4 }]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.productChipName} numberOfLines={2}>{p.name}</Text>
                      <Text style={styles.productChipPrice}>{fmt(p.sellingPrice)}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: p.quantity <= p.lowStockThreshold ? colors.danger : colors.textMuted }}>
                          {p.quantity} left
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.success }}>+{fmt(p.sellingPrice - p.costPrice)}</Text>
                      </View>
                      {isOut && <Text style={{ fontSize: 10, color: colors.danger, fontWeight: '600', marginTop: 2 }}>Out of stock</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
        </View>
      )}

      {/* Cart */}
      <View style={styles.cartSection}>
        <View style={styles.cartHeader}>
          <Text style={styles.cartTitle}>Cart ({cart.length})</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [
              { text: 'Cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => setCart([]) },
            ])}>
              <Text style={{ fontSize: 13, color: colors.danger }}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {cart.length === 0
          ? (
            <View style={styles.emptyCart}>
              <Text style={{ fontSize: 48 }}>🛒</Text>
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>Search and tap products to add</Text>
            </View>
          )
          : (
            <FlatList
              data={cart}
              keyExtractor={i => i.product}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <CartItem
                  item={item}
                  onInc={() => updateQty(item.product, item.quantity + 1)}
                  onDec={() => updateQty(item.product, item.quantity - 1)}
                  onRemove={() => setCart(p => p.filter(i => i.product !== item.product))}
                />
              )}
            />
          )}
      </View>

      {/* Bottom Checkout Bar */}
      {cart.length > 0 && (
        <View style={styles.summaryBar}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>Total</Text>
              <Text style={{ fontSize: typography.xl, fontWeight: '800', color: colors.primary }}>{fmt(total)}</Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.success }}>Profit: {fmt(totalProfit - discountAmt)}</Text>
          </View>
          <Button
            title={`✅ Pay ${fmt(total)}`}
            onPress={() => setShowPayModal(true)}
            style={{ marginLeft: 16, minWidth: 140 }}
          />
        </View>
      )}

      {/* Payment Modal */}
      <BottomModal visible={showPayModal} onClose={() => setShowPayModal(false)} title="Complete Payment" height="82%">
        <View style={{ gap: 14 }}>
          <View style={styles.payTotal}>
            <Text style={styles.payTotalLabel}>Total Amount</Text>
            <Text style={styles.payTotalValue}>{fmt(total)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>Subtotal</Text>
            <Text style={{ fontWeight: '600' }}>{fmt(subtotal)}</Text>
          </View>
          <Input label="Discount (₦)" value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder="0" />
          <View>
            <Text style={{ fontSize: typography.sm, fontWeight: '500', color: colors.gray700, marginBottom: 8 }}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {['cash', 'transfer', 'pos', 'opay', 'moniepoint', 'palmpay', 'credit'].map(m => (
                <TouchableOpacity key={m} onPress={() => setPayMethod(m)}
                  style={[styles.payChip, payMethod === m && styles.payChipActive]}>
                  <Text style={[styles.payChipText, payMethod === m && { color: colors.white }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <AmountInput label="Amount Paid" value={amountPaid} onChange={setAmountPaid} />
          {change > 0 && (
            <View style={styles.changeRow}>
              <Text style={styles.changeLabel}>Change</Text>
              <Text style={styles.changeValue}>{fmt(change)}</Text>
            </View>
          )}
          <View style={{ backgroundColor: colors.successBg, borderRadius: radius.lg, padding: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.success, fontWeight: '600' }}>Profit on this sale</Text>
            <Text style={{ color: colors.success, fontWeight: '800' }}>{fmt(totalProfit - discountAmt)}</Text>
          </View>
          <Button
            title={`✅ Complete Sale · ${fmt(total)}`}
            onPress={() => completeSale()}
            loading={checkingOut}
            size="lg"
            style={{ marginTop: 4 }}
          />
        </View>
      </BottomModal>

      {/* Customer Picker Modal */}
      <BottomModal visible={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Select Customer" height="72%">
        <View style={{ gap: 12 }}>
          <Input placeholder="Search customer name..." value={customerSearch} onChangeText={setCustomerSearch} />
          <FlatList
            data={customers || []}
            keyExtractor={c => c._id}
            style={{ maxHeight: 320 }}
            renderItem={({ item: c }) => (
              <TouchableOpacity style={styles.customerRow}
                onPress={() => { setCustomer(c); setShowCustomerModal(false); setCustomerSearch(''); }}>
                <View style={styles.customerAvatar}>
                  <Text style={{ color: colors.white, fontWeight: '700' }}>{c.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>{c.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 2 }}>
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{c.phone}</Text>
                    {c.totalDebt > 0 && <Text style={{ fontSize: 12, color: colors.danger }}>Debt: {fmt(c.totalDebt)}</Text>}
                  </View>
                </View>
                <Badge label={`${c.trustScore}/100`} color={c.trustScore >= 70 ? 'green' : c.trustScore >= 40 ? 'yellow' : 'red'} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>
                {customerSearch.length > 1 ? 'No customers found' : 'Type to search'}
              </Text>
            }
          />
        </View>
      </BottomModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrap: {
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  searchInput: {
    backgroundColor: '#fff7ed', borderWidth: 2, borderColor: '#fed7aa',
    borderRadius: radius.xl, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: typography.base, color: colors.text,
  },
  productsSection: {
    maxHeight: 160, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  productChip: {
    width: 130, backgroundColor: colors.white, borderRadius: radius.xl,
    padding: 12, borderWidth: 2, borderColor: colors.gray200,
  },
  productChipName: { fontSize: typography.sm, fontWeight: '700', color: colors.text, lineHeight: 18 },
  productChipPrice: { fontSize: typography.lg, fontWeight: '800', color: colors.primary, marginTop: 4 },
  cartSection: { flex: 1, backgroundColor: colors.white, marginTop: 8 },
  cartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  cartTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.gray50,
  },
  cartItemName: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.gray200,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray50,
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: colors.text, lineHeight: 22 },
  qtyVal: { width: 28, textAlign: 'center', fontSize: typography.base, fontWeight: '700', color: colors.text },
  summaryBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray100,
    padding: spacing.lg, paddingBottom: spacing.xl,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  customerBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primaryBg, borderRadius: radius.full },
  payTotal: { backgroundColor: colors.primaryBg, borderRadius: radius.xl, padding: 16, alignItems: 'center' },
  payTotalLabel: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: 4 },
  payTotalValue: { fontSize: 36, fontWeight: '900', color: colors.primary },
  payChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200,
  },
  payChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payChipText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray600, textTransform: 'capitalize' },
  changeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#dbeafe', borderRadius: radius.lg, padding: 12,
  },
  changeLabel: { color: '#1d4ed8', fontWeight: '600' },
  changeValue: { fontSize: typography.xl, fontWeight: '800', color: '#1d4ed8' },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray50,
  },
  customerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: typography['2xl'], fontWeight: '900', color: colors.success, marginTop: 12, marginBottom: 4 },
  successCard: {
    width: '100%', backgroundColor: colors.white, borderRadius: radius.xl,
    padding: spacing.xl, gap: 12, borderWidth: 1, borderColor: colors.gray100,
  },
  successRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
