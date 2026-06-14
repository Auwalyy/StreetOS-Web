import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { communityApi } from '../../api/services';
import { Avatar, Badge, Card, Button, Spinner, EmptyState, ScreenHeader, BottomModal, Input } from '../../components/UI';
import { colors, typography, spacing, radius } from '../../theme';

const TYPE_COLORS = { discussion: 'blue', question: 'purple', success_story: 'green', tip: 'yellow', announcement: 'orange' };
const FILTERS = [['', 'All'], ['discussion', '💬'], ['question', '❓'], ['success_story', '🏆'], ['tip', '💡']];
const POST_TYPES = [
  { value: 'discussion', label: '💬 Discussion' },
  { value: 'question', label: '❓ Question' },
  { value: 'success_story', label: '🏆 Success Story' },
  { value: 'tip', label: '💡 Tip' },
];

function PostModal({ visible, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', content: '', type: 'discussion' });

  const { mutate, isPending } = useMutation({
    mutationFn: () => communityApi.createPost(form),
    onSuccess: () => {
      qc.invalidateQueries(['community-posts']);
      onClose();
      setForm({ title: '', content: '', type: 'discussion' });
    },
    onError: (e) => Alert.alert('Error', e.response?.data?.message || 'Failed'),
  });

  return (
    <BottomModal visible={visible} onClose={onClose} title="Create Post" height="80%">
      <View style={{ gap: 14 }}>
        <View>
          <Text style={styles.label}>Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {POST_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setForm(f => ({ ...f, type: t.value }))}
                style={[styles.typeChip, form.type === t.value && styles.typeChipActive]}
              >
                <Text style={[styles.typeChipText, form.type === t.value && { color: colors.white }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <Input label="Title (optional)" value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))} placeholder="What's this about?" />
        <View>
          <Text style={styles.label}>Content *</Text>
          <TextInput
            style={styles.contentInput}
            value={form.content}
            onChangeText={v => setForm(f => ({ ...f, content: v }))}
            placeholder="Share your thoughts, ask a question..."
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>
        <Button title="Post" onPress={() => mutate()} loading={isPending} />
      </View>
    </BottomModal>
  );
}

export default function CommunityScreen({ navigation }) {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [showPost, setShowPost] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['community-posts', typeFilter],
    queryFn: () => communityApi.getPosts({ type: typeFilter }).then(r => r.data),
  });

  const { mutate: likePost } = useMutation({
    mutationFn: (id) => communityApi.likePost(id),
    onSuccess: () => qc.invalidateQueries(['community-posts']),
  });

  const renderItem = ({ item: post }) => (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Avatar name={`${post.author?.firstName || ''} ${post.author?.lastName || ''}`} size="sm" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.authorName}>{post.author?.firstName} {post.author?.lastName}</Text>
          <Text style={styles.postDate}>{format(new Date(post.createdAt), 'dd MMM yyyy')}</Text>
        </View>
        <Badge label={post.type?.replace('_', ' ')} color={TYPE_COLORS[post.type] || 'gray'} />
      </View>
      {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
      <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>
      <View style={styles.postFooter}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => likePost(post._id)}>
          <Text style={styles.actionText}>❤️ {post.likes?.length || 0}</Text>
        </TouchableOpacity>
        <View style={styles.actionBtn}>
          <Text style={styles.actionText}>💬 {post.comments?.length || 0}</Text>
        </View>
        <View style={styles.actionBtn}>
          <Text style={styles.actionText}>👁️ {post.views || 0}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Community 💬" subtitle="Connect & grow together" navigation={navigation} />

      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {FILTERS.map(([v, l]) => (
            <TouchableOpacity
              key={v}
              onPress={() => setTypeFilter(v)}
              style={[styles.filterChip, typeFilter === v && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, typeFilter === v && { color: colors.white }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? <Spinner /> : (
        <FlatList
          data={data?.data || []}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="💬"
              title="No Posts Yet"
              description="Be the first to start a conversation!"
              action={<Button title="Create Post" onPress={() => setShowPost(true)} size="sm" />}
            />
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowPost(true)} activeOpacity={0.85}>
        <Text style={{ fontSize: 28, color: colors.white, fontWeight: '300', lineHeight: 32 }}>+</Text>
      </TouchableOpacity>

      <PostModal visible={showPost} onClose={() => setShowPost(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: typography.sm, fontWeight: '500', color: colors.gray700, marginBottom: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: typography.sm, fontWeight: '500', color: colors.gray600 },
  contentInput: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg, padding: 12, fontSize: typography.sm, color: colors.text, minHeight: 100 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: typography.sm, fontWeight: '600', color: colors.gray600 },
  authorName: { fontSize: typography.sm, fontWeight: '700', color: colors.text },
  postDate: { fontSize: typography.xs, color: colors.textMuted },
  postTitle: { fontSize: typography.base, fontWeight: '700', color: colors.text, marginBottom: 6 },
  postContent: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },
  postFooter: { flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.gray100 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: typography.sm, color: colors.textSecondary },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
