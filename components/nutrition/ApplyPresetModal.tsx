import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MealPresetWithItems, MealPresetItem } from '../../src/db/types';
import { useAppTheme } from '../../src/theme';
import { getDefaultMealType, getCurrentTimeStr } from '../../src/utils/nutritionUtils';
import TimeWheelPicker from './TimeWheelPicker';

const MEAL_TYPES = [
  { key: 'breakfast', label: '🌅 朝食' },
  { key: 'lunch',     label: '☀️ 昼食' },
  { key: 'dinner',   label: '🌙 夕食' },
  { key: 'snack',    label: '☕ 間食' },
] as const;

const MULTIPLIERS = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];

interface Props {
  visible: boolean;
  preset: MealPresetWithItems | null;
  selectedDate: string;
  onClose: () => void;
  onApply: (
    presetId: number,
    date: string,
    options?: {
      multiplier?: number;
      meal_time?: string;
      meal_type?: string;
      selectedItemIds?: number[];
    }
  ) => Promise<void>;
}

export default function ApplyPresetModal({
  visible,
  preset,
  selectedDate,
  onClose,
  onApply,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mealType, setMealType] = useState<string>(getDefaultMealType());
  const [mealTime, setMealTime] = useState<string>(getCurrentTimeStr());
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (preset) {
      setMealType(preset.meal_type || getDefaultMealType());
      setMealTime(preset.meal_time || getCurrentTimeStr());
      setMultiplier(1.0);
      setSelectedItemIds(new Set(preset.items.map((i) => i.id)));
    }
  }, [preset, visible]);

  const toggleItemSelection = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev; // 最低1品は選択
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 選択された食品群の計算（全フック宣言をトップレベルで無条件実行）
  const activeItems = useMemo(() => {
    if (!preset) return [];
    return preset.items.filter((item) => selectedItemIds.has(item.id));
  }, [preset, selectedItemIds]);

  const totals = useMemo(() => {
    let cal = 0;
    let p = 0;
    let f = 0;
    let c = 0;
    let na = 0;
    let fib = 0;

    for (const item of activeItems) {
      cal += (item.calories || 0) * multiplier;
      p += (item.protein || 0) * multiplier;
      f += (item.fat || 0) * multiplier;
      c += (item.carbs || 0) * multiplier;
      na += (item.sodium || 0) * multiplier;
      fib += (item.fiber || 0) * multiplier;
    }

    return {
      cal: Math.round(cal),
      p: parseFloat(p.toFixed(1)),
      f: parseFloat(f.toFixed(1)),
      c: parseFloat(c.toFixed(1)),
      na: parseFloat(na.toFixed(1)),
      fib: parseFloat(fib.toFixed(1)),
    };
  }, [activeItems, multiplier]);

  const handleConfirmApply = async () => {
    if (!preset || isApplying) return;
    try {
      setIsApplying(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await onApply(preset.id, selectedDate, {
        multiplier,
        meal_time: mealTime,
        meal_type: mealType,
        selectedItemIds: Array.from(selectedItemIds),
      });
      onClose();
    } catch (e) {
      console.warn('ApplyPresetModal: failed to apply', e);
    } finally {
      setIsApplying(false);
    }
  };

  // すべてのReactフック宣言が完了した後にガード
  if (!preset) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerSubtitle}>🍱 献立セット一括記録</Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {preset.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
            {/* 食事区分選択 */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>🍽️ 食事区分</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map((t) => {
                  const active = mealType === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.mealTypeBtn, active && styles.mealTypeBtnActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setMealType(t.key);
                      }}
                    >
                      <Text style={[styles.mealTypeBtnText, active && styles.mealTypeBtnTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 記録時間設定 */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>⏰ 記録時間</Text>
              <TimeWheelPicker
                value={mealTime}
                onChange={(newTime) => setMealTime(newTime)}
              />
            </View>

            {/* 倍率調整 */}
            <View style={styles.sectionBlock}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>⚖️ 全体倍率</Text>
                <Text style={styles.multiplierVal}>{multiplier}x</Text>
              </View>
              <View style={styles.multiplierRow}>
                {MULTIPLIERS.map((m) => {
                  const active = multiplier === m;
                  return (
                    <TouchableOpacity
                      key={`m-${m}`}
                      style={[styles.multiplierChip, active && styles.multiplierChipActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setMultiplier(m);
                      }}
                    >
                      <Text style={[styles.multiplierChipText, active && styles.multiplierChipTextActive]}>
                        {m}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 含まれる食品一覧 */}
            <View style={styles.sectionBlock}>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>🥗 構成食品 ({activeItems.length}/{preset.items.length}品)</Text>
                <Text style={styles.tapTipText}>タップで除外/含む</Text>
              </View>
              <View style={styles.itemsList}>
                {preset.items.map((item) => {
                  const isChecked = selectedItemIds.has(item.id);
                  const itemCal = Math.round((item.calories || 0) * multiplier);
                  const itemP = ((item.protein || 0) * multiplier).toFixed(1);
                  const itemF = ((item.fat || 0) * multiplier).toFixed(1);
                  const itemC = ((item.carbs || 0) * multiplier).toFixed(1);

                  return (
                    <TouchableOpacity
                      key={`item-${item.id}`}
                      style={[styles.itemRow, !isChecked && styles.itemRowDisabled]}
                      onPress={() => toggleItemSelection(item.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isChecked ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isChecked ? '#10b981' : colors.textMuted}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, !isChecked && styles.itemNameDisabled]}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemPfc}>
                          P: {itemP}g / F: {itemF}g / C: {itemC}g
                        </Text>
                      </View>
                      <Text style={[styles.itemCal, !isChecked && styles.itemCalDisabled]}>
                        {itemCal} kcal
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 合計栄養サマリー */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>📊 記録合計 (本日の栄養に加算)</Text>
                <Text style={styles.summaryCal}>{totals.cal} kcal</Text>
              </View>
              <View style={styles.summaryPfcRow}>
                <Text style={styles.summaryPfcItem}>P: <Text style={styles.pfcVal}>{totals.p}g</Text></Text>
                <Text style={styles.summaryPfcItem}>F: <Text style={styles.pfcVal}>{totals.f}g</Text></Text>
                <Text style={styles.summaryPfcItem}>C: <Text style={styles.pfcVal}>{totals.c}g</Text></Text>
                <Text style={styles.summaryPfcItem}>塩: <Text style={styles.pfcVal}>{totals.na}g</Text></Text>
                {totals.fib > 0 && (
                  <Text style={styles.summaryPfcItem}>繊維: <Text style={styles.pfcVal}>{totals.fib}g</Text></Text>
                )}
              </View>
            </View>
          </ScrollView>

          {/* フッターアクション */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isApplying}
            >
              <Text style={styles.cancelBtnText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, isApplying && styles.applyBtnDisabled]}
              onPress={handleConfirmApply}
              disabled={isApplying}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.applyBtnText}>
                {isApplying ? '記録中...' : `${selectedDate} に一括記録`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollBody: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingVertical: 12,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  multiplierVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  tapTipText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealTypeBtnActive: {
    backgroundColor: '#04785722',
    borderColor: '#10b981',
  },
  mealTypeBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  mealTypeBtnTextActive: {
    color: '#10b981',
    fontWeight: 'bold',
  },
  multiplierRow: {
    flexDirection: 'row',
    gap: 6,
  },
  multiplierChip: {
    flex: 1,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiplierChipActive: {
    backgroundColor: '#0284c722',
    borderColor: '#38bdf8',
  },
  multiplierChipText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  multiplierChipTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  itemsList: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemRowDisabled: {
    opacity: 0.45,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  itemNameDisabled: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  itemPfc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemCal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  itemCalDisabled: {
    color: colors.textMuted,
  },
  summaryBox: {
    backgroundColor: '#10b98114',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  summaryCal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  summaryPfcRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryPfcItem: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pfcVal: {
    fontWeight: 'bold',
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    minHeight: 48,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
