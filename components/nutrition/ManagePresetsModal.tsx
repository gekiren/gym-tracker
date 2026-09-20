import React, { useState, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  MealPresetWithItems,
  MealPreset,
  MealPresetItem,
  MealFavorite,
  MealLog,
} from '../../src/db/types';
import { useAppTheme } from '../../src/theme';
import { ConfirmModal } from '../ui/ConfirmModal';
import { getDefaultMealType, getCurrentTimeStr } from '../../src/utils/nutritionUtils';
import TimeWheelPicker from './TimeWheelPicker';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MEAL_TYPES = [
  { key: 'breakfast', label: '🌅 朝食' },
  { key: 'lunch',     label: '☀️ 昼食' },
  { key: 'dinner',   label: '🌙 夕食' },
  { key: 'snack',    label: '☕ 間食' },
] as const;

const DAY_LABELS = [
  { day: 0, label: '日' },
  { day: 1, label: '月' },
  { day: 2, label: '火' },
  { day: 3, label: '水' },
  { day: 4, label: '木' },
  { day: 5, label: '金' },
  { day: 6, label: '土' },
];

interface Props {
  visible: boolean;
  presets: MealPresetWithItems[];
  favorites: MealFavorite[];
  historyLogs: MealLog[];
  initialNewPresetData?: {
    name: string;
    meal_type?: string;
    meal_time?: string;
    items: Omit<MealPresetItem, 'id' | 'preset_id'>[];
  } | null;
  onClose: () => void;
  onAddPreset: (
    preset: Omit<MealPreset, 'id'>,
    items: Omit<MealPresetItem, 'id' | 'preset_id'>[]
  ) => Promise<void>;
  onUpdatePreset: (
    id: number,
    preset: Partial<Omit<MealPreset, 'id'>>,
    items?: Omit<MealPresetItem, 'id' | 'preset_id'>[]
  ) => Promise<void>;
  onDeletePreset: (id: number) => Promise<void>;
  onUpdateOrder: (orders: { id: number; sort_order: number }[]) => Promise<void>;
}

export default function ManagePresetsModal({
  visible,
  presets,
  favorites,
  historyLogs,
  initialNewPresetData,
  onClose,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  onUpdateOrder,
}: Props) {
  const { backgroundTheme, colors } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';

  // 編集モード (null: 一覧, 'new': 新規作成, MealPresetWithItems: 編集)
  const [editingPreset, setEditingPreset] = useState<MealPresetWithItems | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // フォーム用ステート
  const [formName, setFormName] = useState('');
  const [formMealType, setFormMealType] = useState<string>(getDefaultMealType());
  const [formEnableTime, setFormEnableTime] = useState(false);
  const [formMealTime, setFormMealTime] = useState(getCurrentTimeStr());
  const [formScheduledDays, setFormScheduledDays] = useState<number[]>([]);
  const [formMemo, setFormMemo] = useState('');
  const [formItems, setFormItems] = useState<Omit<MealPresetItem, 'id' | 'preset_id'>[]>([]);

  // サブダイアログステート ('manual_item' | 'favorite_select' | 'history_select' | null)
  const [subDialog, setSubDialog] = useState<'manual_item' | 'favorite_select' | 'history_select' | null>(null);

  // 手動アイテム入力フォーム
  const [itemFormName, setItemFormName] = useState('');
  const [itemFormCal, setItemFormCal] = useState('');
  const [itemFormP, setItemFormP] = useState('');
  const [itemFormF, setItemFormF] = useState('');
  const [itemFormC, setItemFormC] = useState('');
  const [itemFormNa, setItemFormNa] = useState('');
  const [itemFormFib, setItemFormFib] = useState('');
  const [itemFormMemo, setItemFormMemo] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  // 外部からの初期データで新規作成を開く
  React.useEffect(() => {
    if (visible && initialNewPresetData) {
      setFormName(initialNewPresetData.name || '');
      setFormMealType(initialNewPresetData.meal_type || getDefaultMealType());
      if (initialNewPresetData.meal_time) {
        setFormEnableTime(true);
        setFormMealTime(initialNewPresetData.meal_time);
      } else {
        setFormEnableTime(false);
        setFormMealTime(getCurrentTimeStr());
      }
      setFormScheduledDays([]);
      setFormMemo('');
      setFormItems(initialNewPresetData.items || []);
      setEditingPreset('new');
    }
  }, [visible, initialNewPresetData]);

  // 新規作成開始
  const handleStartAdd = () => {
    setFormName('');
    setFormMealType(getDefaultMealType());
    setFormEnableTime(false);
    setFormMealTime(getCurrentTimeStr());
    setFormScheduledDays([]);
    setFormMemo('');
    setFormItems([]);
    setEditingPreset('new');
  };

  // 編集開始
  const handleStartEdit = (preset: MealPresetWithItems) => {
    setFormName(preset.name || '');
    setFormMealType(preset.meal_type || getDefaultMealType());
    if (preset.meal_time) {
      setFormEnableTime(true);
      setFormMealTime(preset.meal_time);
    } else {
      setFormEnableTime(false);
      setFormMealTime(getCurrentTimeStr());
    }

    if (preset.scheduled_days) {
      const days = preset.scheduled_days.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      setFormScheduledDays(days);
    } else {
      setFormScheduledDays([]);
    }

    setFormMemo(preset.memo || '');
    setFormItems(preset.items.map((i) => ({ ...i })));
    setEditingPreset(preset);
  };

  // 曜日トグル
  const toggleDay = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFormScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const setDaysEveryday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFormScheduledDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const setDaysWeekdays = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFormScheduledDays([1, 2, 3, 4, 5]);
  };

  const setDaysWeekends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFormScheduledDays([0, 6]);
  };

  const clearDays = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFormScheduledDays([]);
  };

  // 手動アイテム追加
  const handleAddManualItem = () => {
    if (!itemFormName.trim()) {
      Alert.alert('入力エラー', '食品名を入力してください。');
      return;
    }
    const newItem: Omit<MealPresetItem, 'id' | 'preset_id'> = {
      name: itemFormName.trim(),
      calories: parseFloat(itemFormCal) || 0,
      protein: parseFloat(itemFormP) || 0,
      fat: parseFloat(itemFormF) || 0,
      carbs: parseFloat(itemFormC) || 0,
      sodium: parseFloat(itemFormNa) || 0,
      fiber: parseFloat(itemFormFib) || 0,
      memo: itemFormMemo.trim() || undefined,
      sort_order: formItems.length,
    };
    setFormItems((prev) => [...prev, newItem]);
    setItemFormName('');
    setItemFormCal('');
    setItemFormP('');
    setItemFormF('');
    setItemFormC('');
    setItemFormNa('');
    setItemFormFib('');
    setItemFormMemo('');
    setSubDialog(null);
  };

  // お気に入りからアイテム追加
  const handleSelectFavoriteItem = (fav: MealFavorite) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newItem: Omit<MealPresetItem, 'id' | 'preset_id'> = {
      name: fav.name,
      calories: fav.calories || 0,
      protein: fav.protein || 0,
      fat: fav.fat || 0,
      carbs: fav.carbs || 0,
      sodium: fav.sodium || 0,
      fiber: fav.fiber || 0,
      memo: fav.memo,
      sort_order: formItems.length,
    };
    setFormItems((prev) => [...prev, newItem]);
  };

  // 履歴からアイテム追加
  const handleSelectHistoryItem = (log: MealLog) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newItem: Omit<MealPresetItem, 'id' | 'preset_id'> = {
      name: log.name,
      calories: log.calories || 0,
      protein: log.protein || 0,
      fat: log.fat || 0,
      carbs: log.carbs || 0,
      sodium: log.sodium || 0,
      fiber: log.fiber || 0,
      memo: log.memo,
      sort_order: formItems.length,
    };
    setFormItems((prev) => [...prev, newItem]);
  };

  // アイテム削除
  const handleRemoveItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFormItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // フォーム全体の保存
  const handleSaveForm = async () => {
    if (!formName.trim()) {
      Alert.alert('入力エラー', '献立セット名を入力してください。');
      return;
    }
    if (formItems.length === 0) {
      Alert.alert('入力エラー', '食品を1品以上追加してください。');
      return;
    }

    setIsSaving(true);
    try {
      const scheduledDaysStr = formScheduledDays.length > 0 ? formScheduledDays.join(',') : undefined;
      const mealTimeStr = formEnableTime ? formMealTime : undefined;

      const presetData: Omit<MealPreset, 'id'> = {
        name: formName.trim(),
        meal_type: formMealType,
        meal_time: mealTimeStr,
        scheduled_days: scheduledDaysStr,
        memo: formMemo.trim() || undefined,
        created_at: Date.now(),
      };

      if (editingPreset === 'new') {
        await onAddPreset(presetData, formItems);
      } else if (editingPreset && typeof editingPreset === 'object') {
        await onUpdatePreset(editingPreset.id, presetData, formItems);
      }
      setEditingPreset(null);
    } catch (e) {
      console.warn('ManagePresetsModal: save error', e);
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  // プリセット並び替え（上へ）
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newPresets = [...presets];
    const temp = newPresets[index];
    newPresets[index] = newPresets[index - 1];
    newPresets[index - 1] = temp;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const orders = newPresets.map((item, idx) => ({ id: item.id, sort_order: idx }));
    await onUpdateOrder(orders);
  };

  // プリセット並び替え（下へ）
  const handleMoveDown = async (index: number) => {
    if (index === presets.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newPresets = [...presets];
    const temp = newPresets[index];
    newPresets[index] = newPresets[index + 1];
    newPresets[index + 1] = temp;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const orders = newPresets.map((item, idx) => ({ id: item.id, sort_order: idx }));
    await onUpdateOrder(orders);
  };

  // フォーム内合計集計
  const formTotals = useMemo(() => {
    let cal = 0;
    let p = 0;
    let f = 0;
    let c = 0;
    for (const item of formItems) {
      cal += item.calories || 0;
      p += item.protein || 0;
      f += item.fat || 0;
      c += item.carbs || 0;
    }
    return {
      cal: Math.round(cal),
      p: parseFloat(p.toFixed(1)),
      f: parseFloat(f.toFixed(1)),
      c: parseFloat(c.toFixed(1)),
    };
  }, [formItems]);

  const handleModalClose = () => {
    setEditingPreset(null);
    setSubDialog(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleModalClose} transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheet,
            isPureBlack && { backgroundColor: '#000000', borderWidth: 1, borderColor: '#1f1f1f' },
          ]}
        >
          {/* ヘッダー */}
          <View style={[styles.header, isPureBlack && { borderBottomColor: '#1f1f1f' }]}>
            <View style={styles.headerTitleRow}>
              {editingPreset !== null && (
                <TouchableOpacity
                  onPress={() => setEditingPreset(null)}
                  style={styles.backBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                </TouchableOpacity>
              )}
              <Text style={styles.title}>
                {editingPreset === 'new'
                  ? '🍱 献立セットの新規作成'
                  : editingPreset
                  ? '✏️ 献立セットの編集'
                  : '🍱 献立セットの管理・並び替え'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleModalClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#888888" />
            </TouchableOpacity>
          </View>

          {/* 編集フォーム */}
          {editingPreset !== null ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              {/* セット名 */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>献立セット名 <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.textInput, isPureBlack && styles.textInputPureBlack]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="例: 定番朝食セット、筋トレ後プロテイン、昼定食"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* 食事区分 */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>標準の食事区分</Text>
                <View style={styles.mealTypeRow}>
                  {MEAL_TYPES.map((t) => {
                    const active = formMealType === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        style={[styles.mealTypeBtn, active && styles.mealTypeBtnActive]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setFormMealType(t.key);
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

              {/* 固定曜日設定 */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelWithActionRow}>
                  <Text style={styles.fieldLabel}>固定曜日 (設定した曜日に優先提案)</Text>
                  <TouchableOpacity onPress={clearDays}>
                    <Text style={styles.clearDaysText}>クリア</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.quickDayRow}>
                  <TouchableOpacity style={styles.quickDayBtn} onPress={setDaysEveryday}>
                    <Text style={styles.quickDayBtnText}>毎日</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickDayBtn} onPress={setDaysWeekdays}>
                    <Text style={styles.quickDayBtnText}>平日 (月〜金)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickDayBtn} onPress={setDaysWeekends}>
                    <Text style={styles.quickDayBtnText}>休日 (土日)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dayChipsRow}>
                  {DAY_LABELS.map((d) => {
                    const active = formScheduledDays.includes(d.day);
                    return (
                      <TouchableOpacity
                        key={`day-${d.day}`}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                        onPress={() => toggleDay(d.day)}
                      >
                        <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 固定時間設定 */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelWithActionRow}>
                  <Text style={styles.fieldLabel}>固定時間 (記録時の標準時刻)</Text>
                  <TouchableOpacity
                    style={[styles.toggleSwitch, formEnableTime && styles.toggleSwitchActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setFormEnableTime((prev) => !prev);
                    }}
                  >
                    <Text style={[styles.toggleSwitchText, formEnableTime && styles.toggleSwitchTextActive]}>
                      {formEnableTime ? '固定する (ON)' : '未指定 (現在時刻)'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {formEnableTime && (
                  <View style={{ marginTop: 6 }}>
                    <TimeWheelPicker
                      value={formMealTime}
                      onChange={(newTime) => setFormMealTime(newTime)}
                    />
                  </View>
                )}
              </View>

              {/* メモ */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>メモ (任意)</Text>
                <TextInput
                  style={[styles.textInput, isPureBlack && styles.textInputPureBlack]}
                  value={formMemo}
                  onChangeText={setFormMemo}
                  placeholder="例: トレーニング日のみ卵を2個にする"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* 構成食品リスト */}
              <View style={styles.itemsSection}>
                <View style={styles.labelWithActionRow}>
                  <Text style={styles.itemsSectionTitle}>
                    🥗 構成食品 ({formItems.length}品)
                  </Text>
                  <Text style={styles.itemsTotalsText}>
                    計 {formTotals.cal} kcal (P:{formTotals.p} F:{formTotals.f} C:{formTotals.c})
                  </Text>
                </View>

                {formItems.length === 0 ? (
                  <View style={styles.emptyItemsBox}>
                    <Text style={styles.emptyItemsText}>
                      食品がまだ登録されていません。下のボタンから追加してください。
                    </Text>
                  </View>
                ) : (
                  <View style={styles.itemsListContainer}>
                    {formItems.map((item, idx) => (
                      <View key={`form-item-${idx}`} style={styles.formItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.formItemName}>{item.name}</Text>
                          <Text style={styles.formItemMeta}>
                            {Math.round(item.calories || 0)} kcal | P:{(item.protein || 0).toFixed(1)}g F:{(item.fat || 0).toFixed(1)}g C:{(item.carbs || 0).toFixed(1)}g
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeItemBtn}
                          onPress={() => handleRemoveItem(idx)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* 食品追加ボタン群 */}
                <View style={styles.addItemActionRow}>
                  <TouchableOpacity
                    style={[styles.addItemActionBtn, { backgroundColor: '#0284c7' }]}
                    onPress={() => setSubDialog('favorite_select')}
                  >
                    <Ionicons name="star" size={14} color="#ffffff" />
                    <Text style={styles.addItemActionBtnText}>お気に入りから</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.addItemActionBtn, { backgroundColor: '#4f46e5' }]}
                    onPress={() => setSubDialog('history_select')}
                  >
                    <Ionicons name="time-outline" size={14} color="#ffffff" />
                    <Text style={styles.addItemActionBtnText}>履歴から</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.addItemActionBtn, { backgroundColor: '#059669' }]}
                    onPress={() => setSubDialog('manual_item')}
                  >
                    <Ionicons name="add-circle-outline" size={14} color="#ffffff" />
                    <Text style={styles.addItemActionBtnText}>手動追加</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 保存ボタン */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditingPreset(null)}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelBtnText}>キャンセル</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                  onPress={handleSaveForm}
                  disabled={isSaving}
                >
                  <Text style={styles.saveBtnText}>
                    {isSaving ? '保存中...' : '献立セットを保存'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* 一覧画面 */
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              <TouchableOpacity
                style={[styles.newBtn, isPureBlack && { backgroundColor: '#047857' }]}
                onPress={handleStartAdd}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#ffffff" />
                <Text style={styles.newBtnText}>＋ 新しい献立セットを作成</Text>
              </TouchableOpacity>

              {presets.length === 0 ? (
                <View style={styles.emptyList}>
                  <Ionicons name="restaurant-outline" size={40} color="#64748b" style={{ marginBottom: 10 }} />
                  <Text style={styles.emptyTitle}>献立セットがありません</Text>
                  <Text style={styles.emptySubtitle}>
                    よく食べる朝食や昼食の組み合わせを登録すると、{'\n'}ワンタップでまとめて記録できるようになります。
                  </Text>
                </View>
              ) : (
                presets.map((preset, index) => {
                  const totalCal = Math.round(
                    preset.items.reduce((s, i) => s + (i.calories || 0), 0)
                  );
                  const scheduledDaysArray = preset.scheduled_days
                    ? preset.scheduled_days.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
                    : [];

                  const daysString =
                    scheduledDaysArray.length === 7
                      ? '毎日'
                      : scheduledDaysArray.length === 5 && scheduledDaysArray.every((d) => d >= 1 && d <= 5)
                      ? '平日'
                      : scheduledDaysArray.length > 0
                      ? scheduledDaysArray.map((d) => DAY_LABELS.find((l) => l.day === d)?.label).join('・')
                      : '全曜日';

                  return (
                    <View
                      key={`preset-card-${preset.id}`}
                      style={[styles.presetCard, isPureBlack && styles.presetCardPureBlack]}
                    >
                      {/* 上段 */}
                      <View style={styles.presetCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.presetCardBadgeRow}>
                            {preset.meal_type && (
                              <View style={styles.typeBadge}>
                                <Text style={styles.typeBadgeText}>
                                  {MEAL_TYPES.find((t) => t.key === preset.meal_type)?.label || preset.meal_type}
                                </Text>
                              </View>
                            )}
                            <View style={styles.daysBadge}>
                              <Text style={styles.daysBadgeText}>📅 {daysString}</Text>
                            </View>
                            {Boolean(preset.meal_time) && (
                              <View style={styles.timeBadge}>
                                <Text style={styles.timeBadgeText}>⏰ {preset.meal_time}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.presetName}>{preset.name}</Text>
                        </View>

                        {/* 並び替えボタン */}
                        <View style={styles.orderBtns}>
                          <TouchableOpacity
                            style={[styles.orderBtn, index === 0 && styles.orderBtnDisabled]}
                            onPress={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            <Ionicons name="chevron-up" size={16} color={index === 0 ? '#475569' : '#94a3b8'} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.orderBtn, index === presets.length - 1 && styles.orderBtnDisabled]}
                            onPress={() => handleMoveDown(index)}
                            disabled={index === presets.length - 1}
                          >
                            <Ionicons name="chevron-down" size={16} color={index === presets.length - 1 ? '#475569' : '#94a3b8'} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* 構成食品プレビュー */}
                      <View style={styles.presetItemsPreview}>
                        <Text style={styles.presetItemSummaryText}>
                          {preset.items.length}品目: {preset.items.map((i) => i.name).join(', ')}
                        </Text>
                      </View>

                      {/* 下段 */}
                      <View style={styles.presetCardFooter}>
                        <Text style={styles.presetTotalCal}>合計 {totalCal} kcal</Text>
                        <View style={styles.presetCardActions}>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleStartEdit(preset)}
                          >
                            <Ionicons name="pencil" size={13} color="#38bdf8" />
                            <Text style={styles.actionBtnText}>編集</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={() => setDeletingId(preset.id)}
                          >
                            <Ionicons name="trash" size={13} color="#ef4444" />
                            <Text style={styles.deleteBtnText}>削除</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* サブダイアログ：手動食品追加 */}
          {subDialog === 'manual_item' && (
            <Modal transparent animationType="fade" visible onRequestClose={() => setSubDialog(null)}>
              <View style={styles.subModalOverlay}>
                <View style={[styles.subModalBox, isPureBlack && { backgroundColor: '#000000' }]}>
                  <Text style={styles.subModalTitle}>🥗 食品を手動追加</Text>
                  <ScrollView style={{ maxHeight: 380 }}>
                    <TextInput
                      style={styles.subModalInput}
                      placeholder="食品名 (例: 白米 200g)"
                      placeholderTextColor="#64748b"
                      value={itemFormName}
                      onChangeText={setItemFormName}
                    />
                    <TextInput
                      style={styles.subModalInput}
                      placeholder="カロリー (kcal)"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                      value={itemFormCal}
                      onChangeText={setItemFormCal}
                    />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput
                        style={[styles.subModalInput, { flex: 1 }]}
                        placeholder="P (g)"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={itemFormP}
                        onChangeText={setItemFormP}
                      />
                      <TextInput
                        style={[styles.subModalInput, { flex: 1 }]}
                        placeholder="F (g)"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={itemFormF}
                        onChangeText={setItemFormF}
                      />
                      <TextInput
                        style={[styles.subModalInput, { flex: 1 }]}
                        placeholder="C (g)"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={itemFormC}
                        onChangeText={setItemFormC}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput
                        style={[styles.subModalInput, { flex: 1 }]}
                        placeholder="塩分 (g)"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={itemFormNa}
                        onChangeText={setItemFormNa}
                      />
                      <TextInput
                        style={[styles.subModalInput, { flex: 1 }]}
                        placeholder="食物繊維 (g)"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={itemFormFib}
                        onChangeText={setItemFormFib}
                      />
                    </View>
                  </ScrollView>
                  <View style={styles.subModalBtnRow}>
                    <TouchableOpacity style={styles.subCancelBtn} onPress={() => setSubDialog(null)}>
                      <Text style={styles.subCancelBtnText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.subAddBtn} onPress={handleAddManualItem}>
                      <Text style={styles.subAddBtnText}>追加する</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* サブダイアログ：お気に入りから選択 */}
          {subDialog === 'favorite_select' && (
            <Modal transparent animationType="fade" visible onRequestClose={() => setSubDialog(null)}>
              <View style={styles.subModalOverlay}>
                <View style={[styles.subModalBox, isPureBlack && { backgroundColor: '#000000' }]}>
                  <Text style={styles.subModalTitle}>⭐ お気に入り食品から選んで追加</Text>
                  {favorites.length === 0 ? (
                    <Text style={styles.subModalEmptyText}>お気に入りに登録された食品がありません。</Text>
                  ) : (
                    <ScrollView style={{ maxHeight: 320 }}>
                      {favorites.map((fav) => (
                        <TouchableOpacity
                          key={`fav-sel-${fav.id}`}
                          style={styles.subSelectItemRow}
                          onPress={() => {
                            handleSelectFavoriteItem(fav);
                            setSubDialog(null);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.subSelectName}>{fav.name}</Text>
                            <Text style={styles.subSelectMeta}>
                              {Math.round(fav.calories)} kcal | P:{fav.protein}g F:{fav.fat}g C:{fav.carbs}g
                            </Text>
                          </View>
                          <Ionicons name="add-circle" size={22} color="#10b981" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.subModalBtnRow}>
                    <TouchableOpacity style={styles.subCancelBtn} onPress={() => setSubDialog(null)}>
                      <Text style={styles.subCancelBtnText}>閉じる</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* サブダイアログ：履歴から選択 */}
          {subDialog === 'history_select' && (
            <Modal transparent animationType="fade" visible onRequestClose={() => setSubDialog(null)}>
              <View style={styles.subModalOverlay}>
                <View style={[styles.subModalBox, isPureBlack && { backgroundColor: '#000000' }]}>
                  <Text style={styles.subModalTitle}>📋 食事履歴から選んで追加</Text>
                  {historyLogs.length === 0 ? (
                    <Text style={styles.subModalEmptyText}>過去の食事履歴がありません。</Text>
                  ) : (
                    <ScrollView style={{ maxHeight: 320 }}>
                      {historyLogs.slice(0, 30).map((log) => (
                        <TouchableOpacity
                          key={`hist-sel-${log.id}`}
                          style={styles.subSelectItemRow}
                          onPress={() => {
                            handleSelectHistoryItem(log);
                            setSubDialog(null);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.subSelectName}>{log.name}</Text>
                            <Text style={styles.subSelectMeta}>
                              {log.date} | {Math.round(log.calories)} kcal | P:{log.protein}g
                            </Text>
                          </View>
                          <Ionicons name="add-circle" size={22} color="#10b981" />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <View style={styles.subModalBtnRow}>
                    <TouchableOpacity style={styles.subCancelBtn} onPress={() => setSubDialog(null)}>
                      <Text style={styles.subCancelBtnText}>閉じる</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* 削除確認モーダル */}
          <ConfirmModal
            visible={deletingId !== null}
            title="献立セットの削除"
            message="この献立セットを削除しますか？\n（過去に記録した食事ログは削除されません）"
            confirmText="削除"
            type="danger"
            onConfirm={async () => {
              if (deletingId !== null) {
                await onDeletePreset(deletingId);
                setDeletingId(null);
              }
            }}
            onCancel={() => setDeletingId(null)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 24,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 16,
    gap: 8,
  },
  newBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  presetCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetCardPureBlack: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  presetCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  presetCardBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  daysBadge: {
    backgroundColor: '#3730a3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  daysBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timeBadge: {
    backgroundColor: '#047857',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  presetName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
  },
  orderBtns: {
    flexDirection: 'column',
    gap: 4,
  },
  orderBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  orderBtnDisabled: {
    opacity: 0.3,
  },
  presetItemsPreview: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
  },
  presetItemSummaryText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  presetCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  presetTotalCal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34d399',
  },
  presetCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#0284c71a',
  },
  actionBtnText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#ef44441a',
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  // フォームスタイル
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  textInputPureBlack: {
    backgroundColor: '#0f172a',
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  mealTypeBtnActive: {
    backgroundColor: '#04785722',
    borderColor: '#10b981',
  },
  mealTypeBtnText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  mealTypeBtnTextActive: {
    color: '#34d399',
    fontWeight: 'bold',
  },
  labelWithActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  clearDaysText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  quickDayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  quickDayBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  quickDayBtnText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  dayChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayChipActive: {
    backgroundColor: '#4f46e524',
    borderColor: '#6366f1',
  },
  dayChipText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: '#818cf8',
    fontWeight: 'bold',
  },
  toggleSwitch: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  toggleSwitchActive: {
    backgroundColor: '#059669',
  },
  toggleSwitchText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  toggleSwitchTextActive: {
    color: '#ffffff',
  },
  itemsSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemsSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  itemsTotalsText: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: 'bold',
  },
  emptyItemsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  itemsListContainer: {
    marginVertical: 8,
  },
  formItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  formItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  formItemMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  removeItemBtn: {
    padding: 6,
  },
  addItemActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  addItemActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addItemActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // サブモーダル
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  subModalBox: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  subModalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  subModalEmptyText: {
    color: '#64748b',
    fontSize: 13,
    paddingVertical: 20,
    textAlign: 'center',
  },
  subModalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  subModalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  subCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  subCancelBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  subAddBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  subAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subSelectItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  subSelectName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  subSelectMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
