import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealLog } from '../../src/db/types';
import { ConfirmModal } from '../ui/ConfirmModal';

interface Props {
  visible: boolean;
  historyLogs: MealLog[];
  onClose: () => void;
  onPreviewPhoto: (log: MealLog) => void;
  onDeletePhoto: (id: number) => Promise<void>;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 36) / 2;

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
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch', label: '昼食' },
  { key: 'dinner', label: '夕食' },
  { key: 'snack', label: '間食' },
] as const;

export default function PhotoGalleryModal({
  visible,
  historyLogs,
  onClose,
  onPreviewPhoto,
  onDeletePhoto,
}: Props) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);

  // 写真が存在するログをフィルタリング＆ソート
  const photoLogs = useMemo(() => {
    let result = historyLogs.filter((log) => Boolean(log.photo_url));

    // 1. タイプフィルター
    if (selectedFilter !== 'all') {
      result = result.filter((log) => log.meal_type === selectedFilter);
    }

    // 2. 検索キーワード
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (log) =>
          (log.name || '').toLowerCase().includes(q) ||
          (log.memo || '').toLowerCase().includes(q) ||
          (log.date || '').includes(q)
      );
    }

    // 3. ソート (日付/作成日時)
    result.sort((a, b) => {
      const timeA = a.created_at || new Date(a.date).getTime();
      const timeB = b.created_at || new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [historyLogs, selectedFilter, searchQuery, sortOrder]);

  const handleConfirmDelete = async () => {
    if (deletingLogId !== null) {
      await onDeletePhoto(deletingLogId);
      setDeletingLogId(null);
    }
  };

  const renderItem = ({ item }: { item: MealLog }) => {
    const typeLabel = MEAL_TYPE_LABELS[item.meal_type ?? ''] ?? '🍴 食事';
    const typeColor = MEAL_TYPE_COLORS[item.meal_type ?? ''] ?? '#3b82f6';

    return (
      <View style={styles.card}>
        {/* 写真サムネイル (タップで拡大) */}
        <TouchableOpacity
          onPress={() => onPreviewPhoto(item)}
          activeOpacity={0.85}
          style={styles.imageContainer}
        >
          <Image
            source={{ uri: item.photo_url! }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.zoomOverlayBadge}>
            <Ionicons name="scan-outline" size={14} color="#ffffff" />
            <Text style={styles.zoomOverlayText}>タップで拡大</Text>
          </View>
        </TouchableOpacity>

        {/* カード内情報 */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
            </View>
            <Text style={styles.dateText}>{item.date}</Text>
          </View>

          <Text style={styles.mealName} numberOfLines={1}>
            {item.name || '無題の食事'}
          </Text>

          <View style={styles.caloriesRow}>
            <Text style={styles.caloriesVal}>{Math.round(item.calories || 0)} kcal</Text>
            <Text style={styles.pfcBriefText}>
              P:{Math.round(item.protein || 0)} F:{Math.round(item.fat || 0)} C:{Math.round(item.carbs || 0)}
            </Text>
          </View>

          {/* 写真削除ボタン */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setDeletingLogId(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color="#f87171" />
            <Text style={styles.deleteBtnText}>写真のみ削除</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
    >
      <SafeAreaView style={styles.container}>
        {/* モーダルヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="images-outline" size={22} color="#38bdf8" style={{ marginRight: 8 }} />
            <Text style={styles.title}>📷 過去の写真ギャラリー</Text>
            <Text style={styles.countBadge}>({photoLogs.length}枚)</Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* 検索・ソートコントロールバー */}
        <View style={styles.controlSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="日付・料理名・メモで検索..."
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

          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
          >
            <Ionicons
              name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
              size={14}
              color="#38bdf8"
            />
            <Text style={styles.sortBtnText}>
              {sortOrder === 'desc' ? '新しい順' : '古い順'}
            </Text>
          </TouchableOpacity>
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

        {/* 写真一覧グリッド */}
        {photoLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="image-outline" size={48} color="#475569" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>該当する食事写真が見つかりません。</Text>
            <Text style={styles.emptySubText}>
              写真解析や写真記録から食事を追加すると、ここに自動的に写真が集約・保管されます。
            </Text>
          </View>
        ) : (
          <FlatList
            data={photoLogs}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.columnWrapper}
          />
        )}

        {/* 写真削除確認モーダル */}
        <ConfirmModal
          visible={deletingLogId !== null}
          title="写真のみ削除"
          message="この食事ログの写真（画像データ）のみを削除しますか？\n（食事のカロリーや栄養価の記録自体は削除されません）"
          confirmText="写真のみ削除"
          type="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingLogId(null)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#f8fafc',
  },
  countBadge: {
    fontSize: 13,
    color: '#94a3b8',
    marginLeft: 6,
  },
  closeBtn: {
    padding: 4,
  },
  controlSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    padding: 0,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38bdf8',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTabActive: {
    backgroundColor: '#38bdf822',
    borderColor: '#38bdf8',
  },
  filterTabText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    width: COLUMN_WIDTH,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#1e293b',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  zoomOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  zoomOverlayText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
  },
  cardContent: {
    padding: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  mealName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  caloriesVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  pfcBriefText: {
    fontSize: 10,
    color: '#64748b',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444444',
    borderRadius: 6,
    paddingVertical: 4,
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f87171',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
