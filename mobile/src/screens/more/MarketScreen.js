import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { marketApi } from '../../api/services';
import { Badge, Card, Spinner, EmptyState, ScreenHeader } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const TREND_COLORS = { rising: 'red', falling: 'green', stable: 'blue' };
const TREND_ICONS = { rising: '📈', falling: '📉', stable: '➡️' };
const DEMAND_COLORS = { high: 'green', medium: 'yellow', low: 'gray' };
const CATEGORIES = ['', 'grains', 'vegetables', 'oil', 'food', 'fashion', 'building', 'fuel', 'electronics'];

export default function MarketScreen({ navigation }) {
  const [tab, setTab] = useState('prices');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { data: prices, isLoading: pricesLoading, refetch, isRefetching } = useQuery({
    queryKey: ['market-prices', search, category],
    queryFn: () => marketApi.getPrices({ search, category }).then(r => r.data.data),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['market-trends'],
    queryFn: () => marketApi.getTrends().then(r => r.data.data),
    enabled: tab === 'trends',
  });

  const renderPriceCard = ({ item: p }) => (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{p.product}</Text>
          <Text style={styles.productMeta}>per {p.unit} · {p.category}</Text>
        </View>
        <Text style={{ fontSize: 22 }}>{TREND_ICONS[p.trend]}</Text>
      </View>
      <Text style={styles.price}>₦{p.currentPrice?.toLocaleString()}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Badge label={`${p.trend} ${p.trendPercentage > 0 ? `+${p.trendPercentage}%` : ''}`} color={TREND_COLORS[p.trend]} />
        <Badge label={`${p.demand} demand`} color={DEMAND_COLORS[p.demand]} />
      </View>
      {p.location?.city ? <Text style={styles.location}>📍 {p.location.city}, {p.location.state}</Text> : null}
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Market Intelligence 📊" subtitle="Live prices & trends" navigation={navigation} />

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['prices', '💰 Prices'], ['trends', '📈 Trends']].map(([k, l]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={[styles.tabBtn, tab === k && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === k && { color: colors.white }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'prices' && (
        <>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: 10 }}>
            <TextInput
              style={styles.search}
              placeholder="Search products..."
              placeholderTextColor={colors.gray400}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 8 }}>
            <FlatList
              horizontal
              data={CATEGORIES}
              keyExtractor={item => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  onPress={() => setCategory(cat)}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                >
                  <Text style={[styles.catText, category === cat && { color: colors.white }]}>
                    {cat === '' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
          {pricesLoading ? <Spinner /> : (
            <FlatList
              data={prices || []}
              keyExtractor={item => item._id}
              renderItem={renderPriceCard}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
              ListEmptyComponent={<EmptyState icon="📊" title="No Market Data" description="Market price data will appear here." />}
            />
          )}
        </>
      )}

      {tab === 'trends' && (
        trendsLoading ? <Spinner /> : (
          <FlatList
            data={[
              { title: '📈 Rising Prices', items: trends?.rising || [], key: 'rising' },
              { title: '🔥 High Demand', items: trends?.highDemand || [], key: 'demand' },
              { title: '📉 Falling Prices', items: trends?.falling || [], key: 'falling' },
            ]}
            keyExtractor={item => item.key}
            contentContainerStyle={{ padding: spacing.lg, gap: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
            renderItem={({ item: section }) => (
              <Card>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.length === 0 ? (
                  <Text style={{ fontSize: typography.sm, color: colors.textMuted, textAlign: 'center', paddingVertical: 8 }}>No data</Text>
                ) : section.items.map((p, i) => (
                  <View key={i} style={styles.trendRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trendName}>{p.product}</Text>
                      <Text style={styles.trendCat}>{p.category}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.trendPct, { color: section.key === 'rising' ? colors.danger : section.key === 'falling' ? colors.success : colors.primary }]}>
                        {section.key === 'rising' ? `+${p.trendPercentage}%` : section.key === 'falling' ? `-${Math.abs(p.trendPercentage)}%` : 'High'}
                      </Text>
                      <Text style={styles.trendPrice}>₦{p.currentPrice?.toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: colors.gray100, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: typography.sm, fontWeight: '700', color: colors.gray600 },
  search: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: typography.sm, borderWidth: 1, borderColor: colors.gray200, color: colors.text, marginBottom: 2 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray600 },
  productName: { fontSize: typography.base, fontWeight: '700', color: colors.text },
  productMeta: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  price: { fontSize: 24, fontWeight: '900', color: colors.text },
  location: { fontSize: typography.xs, color: colors.textMuted, marginTop: 6 },
  sectionTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text, marginBottom: 12 },
  trendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  trendName: { fontSize: typography.sm, fontWeight: '600', color: colors.text },
  trendCat: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  trendPct: { fontSize: typography.sm, fontWeight: '800' },
  trendPrice: { fontSize: typography.xs, color: colors.textMuted, marginTop: 2 },
});
