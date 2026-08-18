import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MealFavorite } from '../../src/db/types';

interface Props {
  favorites: MealFavorite[];
  onSelectFavorite: (item: MealFavorite) => void;
  onOpenManage: () => void;
}

export default function QuickFavoritesBar({
  favorites,
  onSelectFavorite,
  onOpenManage,
}: Props) {
  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenManage();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="star-outline" size={16} color="#38bdf8" />
          <Text style={styles.emptyText}>
            お気に入りを登録すると、1タップで即座に記録できます
          </Text>
          <Text style={styles.emptyActionText}>＋ 登録</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePress = (item: MealFavorite) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectFavorite(item);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onOpenManage();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>⭐ クイックお気に入り記録</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenManage();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={13} color="#38bdf8" />
          <Text style={styles.editBtnText}>編集・並び替え</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {favorites.map((item, index) => (
          <TouchableOpacity
            key={`fav-${item.id ?? index}`}
            style={styles.chip}
            onPress={() => handlePress(item)}
            onLongPress={handleLongPress}
            delayLongPress={400}
            activeOpacity={0.7}
          >
            <Text style={styles.chipName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.calories > 0 && (
              <Text style={styles.chipCal}>{Math.round(item.calories)}kcal</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* 末尾の追加・編集ボタン */}
        <TouchableOpacity
          style={styles.addChip}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenManage();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#38bdf8" />
          <Text style={styles.addChipText}>編集</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1c1c1c',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#888888',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#0284c71a',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
  emptyContainer: {
    marginVertical: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1c1c1c',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  emptyText: { fontSize: 12, color: '#888888' },
  emptyActionText: { fontSize: 12, color: '#38bdf8', fontWeight: 'bold' },
  scrollContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    backgroundColor: '#3b82f61a',
    borderColor: '#3b82f6',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipName: { fontSize: 13, fontWeight: '600', color: '#e2e8f0', maxWidth: 120 },
  chipCal: { fontSize: 11, color: '#93c5fd', fontWeight: 'bold' },
  addChip: {
    backgroundColor: '#0284c711',
    borderColor: '#0284c7',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addChipText: { fontSize: 12, color: '#38bdf8', fontWeight: '600' },
});
