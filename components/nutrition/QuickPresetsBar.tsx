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
import { MealPresetWithItems } from '../../src/db/types';

interface Props {
  presets: MealPresetWithItems[];
  selectedDate: string;
  onSelectPreset: (preset: MealPresetWithItems) => void;
  onOpenManage: () => void;
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

const MEAL_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  breakfast: { label: '朝', color: '#f59e0b' },
  lunch: { label: '昼', color: '#3b82f6' },
  dinner: { label: '夕', color: '#6366f1' },
  snack: { label: '間', color: '#10b981' },
};

export default function QuickPresetsBar({
  presets,
  selectedDate,
  onSelectPreset,
  onOpenManage,
}: Props) {
  // 選択日の曜日 (0:日, 1:月, ... 6:土)
  const currentDayOfWeek = (() => {
    try {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.getDay();
      }
    } catch {}
    return new Date().getDay();
  })();

  if (!presets || presets.length === 0) {
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
          <Ionicons name="restaurant-outline" size={16} color="#10b981" />
          <Text style={styles.emptyText}>
            献立セットを登録すると、複数の食品を一括で記録できます
          </Text>
          <Text style={styles.emptyActionText}>＋ セット登録</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // プリセットをソート：当日の曜日に該当するものを優先的に前に
  const sortedPresets = [...presets].sort((a, b) => {
    const aScheduled = isScheduledForDay(a.scheduled_days, currentDayOfWeek);
    const bScheduled = isScheduledForDay(b.scheduled_days, currentDayOfWeek);
    if (aScheduled && !bScheduled) return -1;
    if (!aScheduled && bScheduled) return 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  function isScheduledForDay(scheduledDaysStr: string | undefined, day: number): boolean {
    if (!scheduledDaysStr || scheduledDaysStr.trim() === '') return false;
    const days = scheduledDaysStr.split(',').map((s) => parseInt(s.trim(), 10));
    return days.includes(day);
  }

  const handlePress = (preset: MealPresetWithItems) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectPreset(preset);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onOpenManage();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Text style={styles.sectionTitle}>🍱 献立セット一括記録</Text>
          <Text style={styles.subCount}>({presets.length}件)</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenManage();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={13} color="#10b981" />
          <Text style={styles.editBtnText}>セット管理</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedPresets.map((preset, index) => {
          const isTodayMatch = isScheduledForDay(preset.scheduled_days, currentDayOfWeek);
          const totalCal = Math.round(
            preset.items.reduce((sum, item) => sum + (item.calories || 0), 0)
          );
          const badge = preset.meal_type ? MEAL_TYPE_BADGES[preset.meal_type] : null;

          return (
            <TouchableOpacity
              key={`preset-${preset.id ?? index}`}
              style={[styles.chip, isTodayMatch && styles.chipTodayHighlight]}
              onPress={() => handlePress(preset)}
              onLongPress={handleLongPress}
              delayLongPress={400}
              activeOpacity={0.75}
            >
              <View style={styles.chipTopRow}>
                {isTodayMatch && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>🔥 今日</Text>
                  </View>
                )}
                {badge && (
                  <View style={[styles.typeBadge, { backgroundColor: badge.color }]}>
                    <Text style={styles.typeBadgeText}>{badge.label}</Text>
                  </View>
                )}
                {Boolean(preset.meal_time) && (
                  <Text style={styles.timeTag}>⏰ {preset.meal_time}</Text>
                )}
              </View>

              <Text style={styles.chipName} numberOfLines={1}>
                {preset.name}
              </Text>

              <View style={styles.chipBottomRow}>
                <Text style={styles.itemCountText}>{preset.items.length}品</Text>
                {totalCal > 0 && (
                  <Text style={styles.chipCal}>{totalCal}kcal</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* 末尾の追加ボタン */}
        <TouchableOpacity
          style={styles.addChip}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onOpenManage();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={16} color="#10b981" />
          <Text style={styles.addChipText}>セット作成</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
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
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  subCount: {
    fontSize: 11,
    color: '#64748b',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#0478571a',
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyContainer: {
    marginVertical: 6,
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
  emptyText: {
    fontSize: 12,
    color: '#888888',
  },
  emptyActionText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: 'bold',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: '#10b98114',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
    justifyContent: 'space-between',
  },
  chipTodayMatch: {
    borderColor: '#10b981',
  },
  chipTodayHighlight: {
    backgroundColor: '#10b98124',
    borderColor: '#34d399',
    borderWidth: 1.5,
  },
  chipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  todayBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  todayBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  timeTag: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  chipName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
    maxWidth: 140,
  },
  chipBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemCountText: {
    fontSize: 11,
    color: '#6ee7b7',
    fontWeight: '600',
  },
  chipCal: {
    fontSize: 11,
    color: '#a7f3d0',
    fontWeight: 'bold',
  },
  addChip: {
    backgroundColor: '#10b9810a',
    borderColor: '#10b98188',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    gap: 4,
  },
  addChipText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
});
