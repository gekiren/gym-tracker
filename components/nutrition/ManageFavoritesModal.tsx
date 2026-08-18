import React, { useState, useRef } from 'react';
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
import { MealFavorite } from '../../src/db/types';
import { useAppTheme } from '../../src/theme';
import { ConfirmModal } from '../ui/ConfirmModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MEAL_TYPES = [
  { key: 'breakfast', label: '🌅 朝食' },
  { key: 'lunch',     label: '☀️ 昼食' },
  { key: 'dinner',   label: '🌙 夕食' },
  { key: 'snack',    label: '☕ 間食' },
] as const;

interface Props {
  visible: boolean;
  favorites: MealFavorite[];
  onClose: () => void;
  onAddFavorite: (fav: Omit<MealFavorite, 'id'>) => Promise<void>;
  onUpdateFavorite: (id: number, fav: Partial<Omit<MealFavorite, 'id'>>) => Promise<void>;
  onDeleteFavorite: (id: number) => Promise<void>;
  onUpdateOrder: (orders: { id: number; sort_order: number }[]) => Promise<void>;
}

export default function ManageFavoritesModal({
  visible,
  favorites,
  onClose,
  onAddFavorite,
  onUpdateFavorite,
  onDeleteFavorite,
  onUpdateOrder,
}: Props) {
  const { backgroundTheme, colors } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';

  // 編集フォームステート (null = 一覧モード, 'new' = 新規作成, MealFavorite = 編集)
  const [editingItem, setEditingItem] = useState<MealFavorite | 'new' | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // フォーム入力項目
  const [formName, setFormName] = useState('');
  const [formMealType, setFormMealType] = useState<string>('dinner');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formFat, setFormFat] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formSodium, setFormSodium] = useState('');
  const [formFiber, setFormFiber] = useState('');
  const [formMemo, setFormMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // 新規作成開始
  const handleStartAdd = () => {
    setFormName('');
    setFormMealType('dinner');
    setFormCalories('');
    setFormProtein('');
    setFormFat('');
    setFormCarbs('');
    setFormSodium('');
    setFormFiber('');
    setFormMemo('');
    setEditingItem('new');
  };

  // 編集開始
  const handleStartEdit = (item: MealFavorite) => {
    setFormName(item.name || '');
    setFormMealType(item.meal_type || 'dinner');
    setFormCalories(item.calories > 0 ? String(item.calories) : '');
    setFormProtein(item.protein > 0 ? String(item.protein) : '');
    setFormFat(item.fat > 0 ? String(item.fat) : '');
    setFormCarbs(item.carbs > 0 ? String(item.carbs) : '');
    setFormSodium(item.sodium > 0 ? String(item.sodium) : '');
    setFormFiber(item.fiber > 0 ? String(item.fiber) : '');
    setFormMemo(item.memo || '');
    setEditingItem(item);
  };

  // フォーム保存
  const handleSaveForm = async () => {
    if (!formName.trim()) {
      Alert.alert('入力エラー', '料理名を入力してください。');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        meal_type: formMealType,
        calories: parseFloat(formCalories) || 0,
        protein: parseFloat(formProtein) || 0,
        fat: parseFloat(formFat) || 0,
        carbs: parseFloat(formCarbs) || 0,
        sodium: parseFloat(formSodium) || 0,
        fiber: parseFloat(formFiber) || 0,
        memo: formMemo.trim() || undefined,
        created_at: Date.now(),
      };

      if (editingItem === 'new') {
        await onAddFavorite(payload);
      } else if (editingItem && typeof editingItem === 'object') {
        await onUpdateFavorite(editingItem.id, payload);
      }
      setEditingItem(null);
    } catch {
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  // 上へ移動
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newFavs = [...favorites];
    const temp = newFavs[index];
    newFavs[index] = newFavs[index - 1];
    newFavs[index - 1] = temp;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const orders = newFavs.map((item, idx) => ({ id: item.id, sort_order: idx }));
    await onUpdateOrder(orders);
  };

  // 下へ移動
  const handleMoveDown = async (index: number) => {
    if (index === favorites.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newFavs = [...favorites];
    const temp = newFavs[index];
    newFavs[index] = newFavs[index + 1];
    newFavs[index + 1] = temp;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const orders = newFavs.map((item, idx) => ({ id: item.id, sort_order: idx }));
    await onUpdateOrder(orders);
  };

  const handleModalClose = () => {
    setEditingItem(null);
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
              {editingItem !== null && (
                <TouchableOpacity
                  onPress={() => setEditingItem(null)}
                  style={styles.backBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                </TouchableOpacity>
              )}
              <Text style={styles.title}>
                {editingItem === 'new'
                  ? '➕ お気に入り新規作成'
                  : editingItem
                  ? '✏️ お気に入りの編集'
                  : '⭐ クイックお気に入りの編集・管理'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleModalClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* コンテンツ */}
          {editingItem !== null ? (
            /* 編集・新規フォーム */
            <ScrollView
              ref={scrollViewRef}
              style={styles.body}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* 食事タイプ */}
              <Text style={styles.label}>食事タイプ</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.mealTypeBtn,
                      isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' },
                      formMealType === t.key && styles.mealTypeBtnActive,
                    ]}
                    onPress={() => setFormMealType(t.key)}
                  >
                    <Text
                      style={[
                        styles.mealTypeBtnText,
                        formMealType === t.key && styles.mealTypeBtnTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 料理名 */}
              <Text style={styles.label}>料理名 *</Text>
              <TextInput
                style={[
                  styles.input,
                  isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' },
                ]}
                value={formName}
                onChangeText={setFormName}
                placeholder="例: プロテインシェイク、鶏胸肉200g"
                placeholderTextColor="#475569"
              />

              {/* 栄養素 */}
              <Text style={styles.label}>栄養素</Text>
              <View style={styles.nutriGrid}>
                {[
                  { label: 'カロリー (kcal)', value: formCalories, setter: setFormCalories, color: '#10b981' },
                  { label: 'タンパク質 (g)', value: formProtein,  setter: setFormProtein,  color: '#06b6d4' },
                  { label: '脂質 (g)',       value: formFat,      setter: setFormFat,      color: '#f59e0b' },
                  { label: '炭水化物 (g)',   value: formCarbs,    setter: setFormCarbs,    color: '#a855f7' },
                  { label: '塩分 (g)',       value: formSodium,   setter: setFormSodium,   color: '#f43f5e' },
                  { label: '食物繊維 (g)',   value: formFiber,    setter: setFormFiber,    color: '#84cc16' },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={[
                      styles.nutriItem,
                      isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' },
                    ]}
                  >
                    <Text style={[styles.nutriLabel, { color: item.color }]}>{item.label}</Text>
                    <TextInput
                      style={[
                        styles.nutriInput,
                        isPureBlack && { backgroundColor: '#000000', borderColor: '#1f1f1f' },
                      ]}
                      value={item.value}
                      onChangeText={item.setter}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#475569"
                    />
                  </View>
                ))}
              </View>

              {/* メモ */}
              <Text style={styles.label}>メモ（任意）</Text>
              <TextInput
                style={[
                  styles.textArea,
                  isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' },
                ]}
                value={formMemo}
                onChangeText={setFormMemo}
                multiline
                numberOfLines={2}
                placeholder="ブランド名や補足情報など"
                placeholderTextColor="#475569"
              />

              {/* アクションボタン */}
              <View style={styles.formActionRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, isPureBlack && { borderColor: '#334155' }]}
                  onPress={() => setEditingItem(null)}
                >
                  <Text style={styles.cancelBtnText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
                  onPress={handleSaveForm}
                  disabled={isSaving}
                >
                  <Text style={styles.saveBtnText}>
                    {editingItem === 'new' ? '➕ 追加する' : '💾 保存する'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            /* 一覧＆並び替えモード */
            <ScrollView
              style={styles.body}
              contentContainerStyle={{ paddingBottom: 80 }}
              showsVerticalScrollIndicator={false}
            >
              {/* 新規追加ボタン */}
              <TouchableOpacity
                style={[
                  styles.addNewBtn,
                  isPureBlack && { backgroundColor: '#080808', borderColor: '#0284c7' },
                ]}
                onPress={handleStartAdd}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="#38bdf8" />
                <Text style={styles.addNewBtnText}>新規お気に入りを追加</Text>
              </TouchableOpacity>

              {favorites.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>⭐</Text>
                  <Text style={styles.emptyTitle}>お気に入りがありません</Text>
                  <Text style={styles.emptySub}>
                    上の「新規お気に入りを追加」ボタン、または食事ログ一覧の⭐マークから登録できます。
                  </Text>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  <Text style={styles.listHint}>
                    ▲▼ ボタンでクイック表示の並び順を変更できます。
                  </Text>

                  {favorites.map((item, index) => {
                    const isFirst = index === 0;
                    const isLast = index === favorites.length - 1;

                    return (
                      <View
                        key={`fav-manage-${item.id}`}
                        style={[
                          styles.favCard,
                          isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' },
                        ]}
                      >
                        {/* 左側: 並び替えボタン */}
                        <View style={styles.orderControls}>
                          <TouchableOpacity
                            style={[styles.orderBtn, isFirst && styles.orderBtnDisabled]}
                            onPress={() => handleMoveUp(index)}
                            disabled={isFirst}
                          >
                            <Ionicons
                              name="chevron-up"
                              size={18}
                              color={isFirst ? '#475569' : '#38bdf8'}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.orderBtn, isLast && styles.orderBtnDisabled]}
                            onPress={() => handleMoveDown(index)}
                            disabled={isLast}
                          >
                            <Ionicons
                              name="chevron-down"
                              size={18}
                              color={isLast ? '#475569' : '#38bdf8'}
                            />
                          </TouchableOpacity>
                        </View>

                        {/* 中央: 情報 */}
                        <View style={styles.favInfo}>
                          <Text style={styles.favName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View style={styles.favPfcRow}>
                            {item.calories > 0 && (
                              <Text style={styles.favCal}>{Math.round(item.calories)} kcal</Text>
                            )}
                            {(item.protein > 0 || item.fat > 0 || item.carbs > 0) && (
                              <Text style={styles.favPfc}>
                                P:{item.protein} F:{item.fat} C:{item.carbs}
                              </Text>
                            )}
                          </View>
                        </View>

                        {/* 右側: 編集・削除ボタン */}
                        <View style={styles.actionBtns}>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleStartEdit(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil-outline" size={18} color="#38bdf8" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => setDeletingId(item.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={18} color="#f43f5e" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* 削除確認モーダル */}
      <ConfirmModal
        visible={deletingId !== null}
        title="お気に入り削除"
        message="このクイックお気に入りを削除しますか？"
        confirmText="削除"
        type="danger"
        onConfirm={async () => {
          if (deletingId !== null) {
            await onDeleteFavorite(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
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
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  backBtn: { padding: 4, marginRight: 2 },
  title: { fontSize: 16, fontWeight: '700', color: '#f8fafc', flex: 1 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },
  body: { padding: 16 },

  // 新規追加ボタン
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c722',
    borderWidth: 1,
    borderColor: '#0284c7',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addNewBtnText: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },

  // 空状態
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 6 },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },

  // 一覧
  listContainer: { gap: 10 },
  listHint: { fontSize: 11, color: '#64748b', marginBottom: 4 },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  orderControls: { flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center' },
  orderBtn: {
    padding: 3,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnDisabled: { opacity: 0.25 },
  favInfo: { flex: 1, marginLeft: 2 },
  favName: { fontSize: 14, fontWeight: '700', color: '#f8fafc', marginBottom: 3 },
  favPfcRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favCal: { fontSize: 12, color: '#10b981', fontWeight: '700' },
  favPfc: { fontSize: 11, color: '#94a3b8' },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconActionBtn: {
    padding: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // フォーム用スタイル
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8, marginTop: 12 },
  mealTypeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  mealTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  mealTypeBtnActive: { backgroundColor: '#0284c733', borderColor: '#38bdf8' },
  mealTypeBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  mealTypeBtnTextActive: { color: '#38bdf8', fontWeight: '700' },
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
  nutriItem: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
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
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formActionRow: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
});
