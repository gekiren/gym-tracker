import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, TextInput } from 'react-native';
import { MealLog, MealFavorite } from '../../src/db/types';
import { Ionicons } from '@expo/vector-icons';

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '🌅 朝食',
  lunch: '☀️ 昼食',
  dinner: '🌙 夕食',
  snack: '☕ 間食',
};

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: '#f59e0b',
  lunch: '#3b82f6',
  dinner: '#6366f1',
  snack: '#10b981',
};

const FILTER_TABS = [
  { key: 'all', label: 'すべて' },
  { key: 'breakfast', label: '🌅 朝食' },
  { key: 'lunch', label: '☀️ 昼食' },
  { key: 'dinner', label: '🌙 夕食' },
  { key: 'snack', label: '☕ 間食' },
  { key: 'photo', label: '📷 写真あり' },
] as const;

interface Props {
  mealLogs: MealLog[];
  favorites: MealFavorite[];
  onDeleteMeal: (id: number) => void;
  onEditMeal: (log: MealLog) => void;
  onToggleFavorite: (log: MealLog) => void;
  onPreviewPhoto?: (uri: string) => void;
}

export default function MealLogList({
  mealLogs,
  favorites,
  onDeleteMeal,
  onEditMeal,
  onToggleFavorite,
  onPreviewPhoto,
}: Props) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isFav = (name: string) => {
    const clean = (name || '').trim().toLowerCase();
    return favorites.some((f) => (f.name || '').trim().toLowerCase() === clean);
  };

  const filteredLogs = useMemo(() => {
    return mealLogs.filter((log) => {
      // 1. タイプ/写真フィルター
      if (selectedFilter === 'photo' && !log.photo_url) return false;
      if (
        selectedFilter !== 'all' &&
        selectedFilter !== 'photo' &&
        log.meal_type !== selectedFilter
      ) {
        return false;
      }
      // 2. 検索キーワードフィルター
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (log.name || '').toLowerCase().includes(q);
        const matchMemo = (log.memo || '').toLowerCase().includes(q);
        if (!matchName && !matchMemo) return false;
      }
      return true;
    });
  }, [mealLogs, selectedFilter, searchQuery]);

  if (mealLogs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>🍽️ 本日の食事記録はありません。</Text>
        <Text style={styles.emptySubText}>
          「📷 写真記録」「💬 チャット入力」「✏️ 手動入力」「⭐ 履歴から」ボタンから食事を追加してください。
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>📝 食事ログ一覧 ({filteredLogs.length}/{mealLogs.length}件)</Text>

      {/* 検索バー */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="食事名やメモで検索..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* フィルタータブバー */}
      <View style={styles.filterBar}>
        {FILTER_TABS.map((tab) => {
          const active = selectedFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setSelectedFilter(tab.key)}
            >
              <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filteredLogs.length === 0 ? (
        <View style={styles.noMatchContainer}>
          <Text style={styles.noMatchText}>条件に該当する食事ログがありません。</Text>
        </View>
      ) : (
        filteredLogs.map((log, idx) => {
          const typeLabel = MEAL_TYPE_LABELS[log.meal_type ?? ''] ?? '🍴 食事';
          const typeColor = MEAL_TYPE_COLORS[log.meal_type ?? ''] ?? '#3b82f6';
          const favorited = isFav(log.name);
          const displayTime =
            log.meal_time ||
            (log.created_at ? new Date(log.created_at).toTimeString().slice(0, 5) : '');

          return (
            <View key={`${log.id}-${idx}`} style={styles.logCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                  <Text style={styles.typeBadgeText}>{typeLabel}</Text>
                </View>
                {Boolean(displayTime) && (
                  <Text style={styles.timeText}>⏰ {displayTime}</Text>
                )}
                <Text style={styles.mealName} numberOfLines={1}>{log.name || '無題'}</Text>
                <Text style={styles.caloriesText}>{log.calories || 0} kcal</Text>
              </View>

              {/* 写真プレビュー */}
              {Boolean(log.photo_url) && (
                <TouchableOpacity onPress={() => onPreviewPhoto?.(log.photo_url!)}>
                  <Image
                    source={{ uri: log.photo_url! }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {/* PFC数値 */}
              <View style={styles.pfcRow}>
                <Text style={styles.pfcItem}>P: <Text style={styles.pfcVal}>{(log.protein || 0).toFixed(1)}g</Text></Text>
                <Text style={styles.pfcItem}>F: <Text style={styles.pfcVal}>{(log.fat || 0).toFixed(1)}g</Text></Text>
                <Text style={styles.pfcItem}>C: <Text style={styles.pfcVal}>{(log.carbs || 0).toFixed(1)}g</Text></Text>
                <Text style={styles.pfcItem}>塩: <Text style={styles.pfcVal}>{(log.sodium || 0).toFixed(1)}g</Text></Text>
                {log.fiber != null && (
                  <Text style={styles.pfcItem}>繊維: <Text style={styles.pfcVal}>{log.fiber.toFixed(1)}g</Text></Text>
                )}
              </View>

              {/* メモ */}
              {Boolean(log.memo) && (
                <Text style={styles.memoText} numberOfLines={2}>💡 {log.memo}</Text>
              )}

              {/* アクションボタン */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, favorited && styles.favActiveBtn]}
                  onPress={() => onToggleFavorite(log)}
                >
                  <Text style={[styles.actionBtnText, favorited && styles.favActiveText]}>
                    {favorited ? '★ お気に入り解除' : '☆ お気に入り追加'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => onEditMeal(log)}>
                  <Text style={styles.actionBtnText}>✏️ 編集</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => onDeleteMeal(log.id)}
                >
                  <Text style={styles.deleteBtnText}>🗑️ 削除</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    padding: 0,
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTabActive: {
    backgroundColor: '#38bdf822',
    borderColor: '#38bdf8',
  },
  filterTabText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  noMatchContainer: {
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 8,
  },
  noMatchText: {
    color: '#888888',
    fontSize: 13,
  },
  emptyContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#1c1c1c',
  },
  emptyText: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 6 },
  emptySubText: { fontSize: 12, color: '#888888', textAlign: 'center', lineHeight: 18 },
  logCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1c1c1c',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  timeText: { fontSize: 11, fontWeight: '600', color: '#888888', marginRight: 8 },
  mealName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#ffffff' },
  caloriesText: { fontSize: 15, fontWeight: '700', color: '#10b981' },
  photoThumb: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#0f172a',
  },
  pfcRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 8,
    marginVertical: 6,
  },
  pfcItem: { fontSize: 12, color: '#94a3b8' },
  pfcVal: { fontWeight: '700', color: '#f8fafc' },
  memoText: { fontSize: 12, color: '#cbd5e1', marginTop: 4, marginBottom: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  favActiveBtn: { backgroundColor: '#f59e0b22', borderColor: '#f59e0b' },
  favActiveText: { color: '#f59e0b', fontWeight: '700' },
  deleteBtn: { borderColor: '#ef444455' },
  deleteBtnText: { fontSize: 11, fontWeight: '600', color: '#f87171' },
});
