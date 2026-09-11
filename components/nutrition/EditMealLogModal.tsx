import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MealLog } from '../../src/db/types';
import { useAppTheme } from '../../src/theme';
import { getDefaultMealType } from '../../src/utils/nutritionUtils';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import TimeWheelPicker from './TimeWheelPicker';

const MEAL_TYPES = [
  { key: 'breakfast', label: '🌅 朝食' },
  { key: 'lunch',     label: '☀️ 昼食' },
  { key: 'dinner',   label: '🌙 夕食' },
  { key: 'snack',    label: '☕ 間食' },
] as const;

const formatTimeFromLog = (log: MealLog | null): string => {
  if (log?.meal_time) return log.meal_time;
  if (log?.created_at) {
    const d = new Date(log.created_at);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

interface Props {
  visible: boolean;
  log: MealLog | null;
  onClose: () => void;
  onSave: (id: number, data: Partial<Omit<MealLog, 'id'>>) => Promise<void>;
}

export default function EditMealLogModal({ visible, log, onClose, onSave }: Props) {
  const { backgroundTheme } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';
  const scrollViewRef = useRef<ScrollView>(null);

  const favorites = useNutritionStore((state) => state.favorites);
  const addFavoriteFromLog = useNutritionStore((state) => state.addFavoriteFromLog);
  const deleteFavoriteById = useNutritionStore((state) => state.deleteFavoriteById);

  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<string>(getDefaultMealType());
  const [mealTime, setMealTime] = useState<string>('12:00');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [sodium, setSodium] = useState('');
  const [fiber, setFiber] = useState('');
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFavLoading, setIsFavLoading] = useState(false);

  // 倍率調整用の状態
  const [multiplier, setMultiplier] = useState(1.0);
  const [initialNutrients, setInitialNutrients] = useState({
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    sodium: 0,
    fiber: 0,
  });
  const [showCustomMultiplierInput, setShowCustomMultiplierInput] = useState(false);
  const [customMultiplierText, setCustomMultiplierText] = useState('');

  // 入力中の料理名がお気に入りに登録されているか判定
  const isFavorited = useMemo(() => {
    const clean = name.trim().toLowerCase();
    if (!clean) return false;
    return favorites.some((f) => (f.name || '').trim().toLowerCase() === clean);
  }, [name, favorites]);

  // logが変わったらフィールドを同期
  useEffect(() => {
    if (log) {
      setName(log.name || '');
      setMealType(log.meal_type || getDefaultMealType());
      setMealTime(formatTimeFromLog(log));
      const initCalories = log.calories ?? 0;
      const initProtein = log.protein ?? 0;
      const initFat = log.fat ?? 0;
      const initCarbs = log.carbs ?? 0;
      const initSodium = log.sodium ?? 0;
      const initFiber = log.fiber ?? 0;
      setInitialNutrients({
        calories: initCalories,
        protein: initProtein,
        fat: initFat,
        carbs: initCarbs,
        sodium: initSodium,
        fiber: initFiber,
      });
      setMultiplier(1.0);
      setShowCustomMultiplierInput(false);
      setCustomMultiplierText('');
      setCalories(String(log.calories ?? ''));
      setProtein(String(log.protein ?? ''));
      setFat(String(log.fat ?? ''));
      setCarbs(String(log.carbs ?? ''));
      setSodium(String(log.sodium ?? ''));
      setFiber(String(log.fiber ?? ''));
      setMemo(log.memo || '');
    }
  }, [log]);

  const applyMultiplierToNutrients = (m: number) => {
    const newCalories = initialNutrients.calories > 0
      ? String(Math.round(initialNutrients.calories * m))
      : '0';
    const newProtein = initialNutrients.protein > 0
      ? String(parseFloat((initialNutrients.protein * m).toFixed(1)))
      : '0';
    const newFat = initialNutrients.fat > 0
      ? String(parseFloat((initialNutrients.fat * m).toFixed(1)))
      : '0';
    const newCarbs = initialNutrients.carbs > 0
      ? String(parseFloat((initialNutrients.carbs * m).toFixed(1)))
      : '0';
    const newSodium = initialNutrients.sodium > 0
      ? String(parseFloat((initialNutrients.sodium * m).toFixed(1)))
      : '0';
    const newFiber = initialNutrients.fiber > 0
      ? String(parseFloat((initialNutrients.fiber * m).toFixed(1)))
      : '0';

    setCalories(newCalories);
    setProtein(newProtein);
    setFat(newFat);
    setCarbs(newCarbs);
    setSodium(newSodium);
    setFiber(newFiber);
  };

  const handleMultiplierChange = (m: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMultiplier(m);
    setShowCustomMultiplierInput(false);
    applyMultiplierToNutrients(m);
  };

  const handleApplyCustomMultiplier = () => {
    const normalized = customMultiplierText.replace(/[０-９．]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('入力エラー', '正しい倍率（0より大きい数値）を入力してください。');
      return;
    }
    const rounded = parseFloat(parsed.toFixed(2));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setMultiplier(rounded);
    setShowCustomMultiplierInput(false);
    applyMultiplierToNutrients(rounded);
  };

  const handleNutrientManualChange = (
    field: 'calories' | 'protein' | 'fat' | 'carbs' | 'sodium' | 'fiber',
    val: string,
    setter: (v: string) => void
  ) => {
    setter(val);
    const num = parseFloat(val) || 0;
    setInitialNutrients((prev) => ({ ...prev, [field]: num }));
    setMultiplier(1.0);
    setShowCustomMultiplierInput(false);
  };

  const handleToggleFavorite = async () => {
    if (!name.trim()) {
      Alert.alert('入力エラー', '料理名を入力してください。');
      return;
    }
    setIsFavLoading(true);
    try {
      const clean = name.trim().toLowerCase();
      const existing = favorites.find(
        (f) => (f.name || '').trim().toLowerCase() === clean
      );
      if (existing) {
        await deleteFavoriteById(existing.id);
      } else {
        await addFavoriteFromLog({
          name: name.trim(),
          meal_type: mealType,
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          fat: parseFloat(fat) || 0,
          carbs: parseFloat(carbs) || 0,
          sodium: parseFloat(sodium) || 0,
          fiber: parseFloat(fiber) || 0,
          memo: memo.trim() || undefined,
          created_at: Date.now(),
        });
      }
    } catch {
      Alert.alert('エラー', 'お気に入りの更新に失敗しました。');
    } finally {
      setIsFavLoading(false);
    }
  };

  const handleSave = async () => {
    if (!log) return;
    if (!name.trim()) {
      Alert.alert('入力エラー', '料理名を入力してください。');
      return;
    }
    setIsSaving(true);
    try {
      await onSave(log.id, {
        name: name.trim(),
        meal_type: mealType,
        meal_time: mealTime,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        fat: parseFloat(fat) || 0,
        carbs: parseFloat(carbs) || 0,
        sodium: parseFloat(sodium) || 0,
        fiber: parseFloat(fiber) || 0,
        memo: memo.trim() || undefined,
      });
      onClose();
    } catch {
      Alert.alert('保存エラー', '更新に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  if (!log) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, isPureBlack && { backgroundColor: '#000000', borderWidth: 1, borderColor: '#1f1f1f' }]}>
          <View style={[styles.header, isPureBlack && { borderBottomColor: '#1f1f1f' }]}>
            <Text style={styles.title}>✏️ 食事ログ編集</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={handleToggleFavorite}
                style={styles.headerFavBtn}
                disabled={isFavLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isFavLoading ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <Ionicons
                    name={isFavorited ? 'star' : 'star-outline'}
                    size={22}
                    color={isFavorited ? '#f59e0b' : '#94a3b8'}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView ref={scrollViewRef} style={styles.body} contentContainerStyle={{ paddingBottom: 260 }} keyboardShouldPersistTaps="handled">
            {/* 食事タイプ */}
            <Text style={styles.label}>食事タイプ</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.mealTypeBtn,
                    isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' },
                    mealType === t.key && styles.mealTypeBtnActive,
                  ]}
                  onPress={() => setMealType(t.key)}
                >
                  <Text style={[styles.mealTypeBtnText, mealType === t.key && styles.mealTypeBtnTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 時間設定 (TimeWheelPicker) */}
            <TimeWheelPicker
              value={mealTime}
              onChange={setMealTime}
              label="食事時間"
            />

            {/* 料理名 */}
            <Text style={styles.label}>料理名</Text>
            <TextInput style={[styles.input, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]} value={name} onChangeText={setName} placeholderTextColor="#475569" />

            {/* 倍率調整 */}
            <View style={[styles.portionBox, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}>
              <Text style={styles.portionLabel}>食べた量の倍率: {multiplier}倍</Text>
              <View style={styles.presetRow}>
                {[0.5, 0.7, 1.0, 1.2, 1.5, 2.0].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.presetBtn,
                      isPureBlack && { backgroundColor: '#000000', borderColor: '#1f1f1f' },
                      multiplier === m && !showCustomMultiplierInput && styles.presetBtnActive,
                    ]}
                    onPress={() => handleMultiplierChange(m)}
                  >
                    <Text
                      style={[
                        styles.presetBtnText,
                        multiplier === m && !showCustomMultiplierInput && styles.presetBtnTextActive,
                      ]}
                    >
                      {m}倍
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.presetBtn,
                    isPureBlack && { backgroundColor: '#000000', borderColor: '#1f1f1f' },
                    (showCustomMultiplierInput || (![0.5, 0.7, 1.0, 1.2, 1.5, 2.0].includes(multiplier))) && styles.presetBtnActive,
                  ]}
                  onPress={() => {
                    setCustomMultiplierText(String(multiplier));
                    setShowCustomMultiplierInput(!showCustomMultiplierInput);
                  }}
                >
                  <Text
                    style={[
                      styles.presetBtnText,
                      (showCustomMultiplierInput || (![0.5, 0.7, 1.0, 1.2, 1.5, 2.0].includes(multiplier))) && styles.presetBtnTextActive,
                    ]}
                  >
                    ✏️ 自分で入力{!showCustomMultiplierInput && ![0.5, 0.7, 1.0, 1.2, 1.5, 2.0].includes(multiplier) ? ` (${multiplier}倍)` : ''}
                  </Text>
                </TouchableOpacity>
              </View>

              {showCustomMultiplierInput && (
                <View style={styles.customInputRow}>
                  <TextInput
                    style={[styles.customInput, isPureBlack && { backgroundColor: '#000000', borderColor: '#1f1f1f' }]}
                    value={customMultiplierText}
                    onChangeText={setCustomMultiplierText}
                    keyboardType="decimal-pad"
                    placeholder="例: 1.3"
                    placeholderTextColor="#475569"
                  />
                  <Text style={styles.customInputUnit}>倍</Text>
                  <TouchableOpacity style={styles.customApplyBtn} onPress={handleApplyCustomMultiplier}>
                    <Text style={styles.customApplyBtnText}>適用</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 栄養素グリッド */}
            <Text style={styles.label}>栄養素</Text>
            <View style={styles.nutriGrid}>
              {[
                { key: 'calories' as const, label: 'カロリー (kcal)', value: calories, setter: setCalories, color: '#10b981' },
                { key: 'protein' as const,  label: 'タンパク質 (g)', value: protein,  setter: setProtein,  color: '#06b6d4' },
                { key: 'fat' as const,      label: '脂質 (g)',       value: fat,      setter: setFat,      color: '#f59e0b' },
                { key: 'carbs' as const,    label: '炭水化物 (g)',   value: carbs,    setter: setCarbs,    color: '#a855f7' },
                { key: 'sodium' as const,   label: '塩分 (g)',       value: sodium,   setter: setSodium,   color: '#f43f5e' },
                { key: 'fiber' as const,    label: '食物繊維 (g)',   value: fiber,    setter: setFiber,    color: '#84cc16' },
              ].map((item) => (
                <View key={item.label} style={[styles.nutriItem, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}>
                  <Text style={[styles.nutriLabel, { color: item.color }]}>{item.label}</Text>
                  <TextInput
                    style={[styles.nutriInput, isPureBlack && { backgroundColor: '#000000', borderColor: '#1f1f1f' }]}
                    value={item.value}
                    onChangeText={(v) => handleNutrientManualChange(item.key, v, item.setter)}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#475569"
                  />
                </View>
              ))}
            </View>

            {/* メモ */}
            <Text style={styles.label}>メモ（任意）</Text>
            <TextInput
              style={[styles.textArea, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={3}
              placeholderTextColor="#475569"
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />

            {/* お気に入り追加/解除ボタン */}
            <TouchableOpacity
              style={[
                styles.favActionBtn,
                isFavorited ? styles.favActionBtnActive : styles.favActionBtnInactive,
                isPureBlack && { backgroundColor: isFavorited ? '#f59e0b18' : '#080808', borderColor: isFavorited ? '#f59e0b' : '#1f1f1f' },
              ]}
              onPress={handleToggleFavorite}
              disabled={isFavLoading}
              activeOpacity={0.8}
            >
              {isFavLoading ? (
                <ActivityIndicator size="small" color="#f59e0b" />
              ) : (
                <>
                  <Ionicons
                    name={isFavorited ? 'star' : 'star-outline'}
                    size={16}
                    color={isFavorited ? '#f59e0b' : '#94a3b8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.favActionBtnText, isFavorited && styles.favActionBtnTextActive]}>
                    {isFavorited ? '★ お気に入り解除' : '⭐ お気に入りに追加'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>💾 更新する</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-start' },
  sheet: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    marginTop: Platform.OS === 'android' ? 40 : 50,
    marginHorizontal: 8,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerFavBtn: { padding: 4 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },
  body: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, marginTop: 12 },
  mealTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  mealTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  mealTypeBtnActive: { backgroundColor: '#4facfe22', borderColor: '#4facfe' },
  mealTypeBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  mealTypeBtnTextActive: { color: '#4facfe' },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nutriItem: { width: '48%', backgroundColor: '#1e293b', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155' },
  nutriLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  nutriInput: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'right',
  },
  textArea: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  favActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  favActionBtnInactive: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  favActionBtnActive: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b',
  },
  favActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  favActionBtnTextActive: {
    color: '#f59e0b',
  },
  saveBtn: { backgroundColor: '#4facfe', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  portionBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  portionLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  presetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  presetBtnText: { fontSize: 12, color: '#94a3b8' },
  presetBtnTextActive: { color: '#fff', fontWeight: '700' },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customInputUnit: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  customApplyBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  customApplyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
