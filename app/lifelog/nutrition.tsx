import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme, useAppTheme } from '../../src/theme';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { MealLog, MealFavorite, NutritionGoals, AutophagyConfig } from '../../src/db/types';

// コンポーネントインポート
import NutritionSummaryCard from '../../components/nutrition/NutritionSummaryCard';
import QuickFavoritesBar from '../../components/nutrition/QuickFavoritesBar';
import MealLogList from '../../components/nutrition/MealLogList';
import ChatRecordModal from '../../components/nutrition/ChatRecordModal';
import PhotoRecordModal from '../../components/nutrition/PhotoRecordModal';
import ManualEntryModal from '../../components/nutrition/ManualEntryModal';
import HistorySelectModal from '../../components/nutrition/HistorySelectModal';
import EditMealLogModal from '../../components/nutrition/EditMealLogModal';
import AutophagyCard from '../../components/nutrition/AutophagyCard';
import NutritionHistoryChart from '../../components/nutrition/NutritionHistoryChart';
import MdImportModal from '../../components/nutrition/MdImportModal';
import NutritionSettingsModal from '../../components/nutrition/NutritionSettingsModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';

export default function NutritionScreen() {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { t } = useTranslation();

  const [showHistory, setShowHistory] = useState(false);

  // Zustand selector 形式の徹底
  const mealLogs = useNutritionStore((state) => state.mealLogs);
  const allHistoryLogs = useNutritionStore((state) => state.allHistoryLogs);
  const favorites = useNutritionStore((state) => state.favorites);
  const userGoals = useNutritionStore((state) => state.userNutritionGoals);
  const autophagyConfig = useNutritionStore((state) => state.autophagyConfig);
  const isLoading = useNutritionStore((state) => state.isLoading);

  const loadMealLogs = useNutritionStore((state) => state.loadMealLogs);
  const loadAllHistory = useNutritionStore((state) => state.loadAllHistory);
  const addMeal = useNutritionStore((state) => state.addMeal);
  const updateMeal = useNutritionStore((state) => state.updateMeal);
  const deleteMeal = useNutritionStore((state) => state.deleteMeal);
  const loadFavorites = useNutritionStore((state) => state.loadFavorites);
  const addFavoriteFromLog = useNutritionStore((state) => state.addFavoriteFromLog);
  const deleteFavoriteById = useNutritionStore((state) => state.deleteFavoriteById);
  const loadGoals = useNutritionStore((state) => state.loadGoals);
  const saveGoals = useNutritionStore((state) => state.saveGoals);
  const loadAutophagyConfig = useNutritionStore((state) => state.loadAutophagyConfig);
  const updateAutophagyConfig = useNutritionStore((state) => state.updateAutophagyConfig);

  // 日付状態 (YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // モーダル開閉状態
  const [showChatModal, setShowChatModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showMdModal, setShowMdModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingLog, setEditingLog] = useState<MealLog | null>(null);
  const [deletingMealId, setDeletingMealId] = useState<number | null>(null);

  // 日付切替
  const changeDateOffset = (offsetDays: number) => {
    const parts = selectedDate.split('-');
    const base = parts.length === 3
      ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      : new Date();
    base.setDate(base.getDate() + offsetDays);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // 画面フォーカス時のデータ読み込み（isFocusedでバックグラウンド時サスペンド）
  const reloadData = useCallback(async () => {
    try {
      await loadMealLogs(selectedDate);
      await loadAllHistory();
      await loadFavorites();
      await loadGoals();
      await loadAutophagyConfig();
    } catch (err) {
      console.warn('[NutritionScreen] reloadData error:', err);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!isFocused) return;
    reloadData();
    const unsubscribe = navigation.addListener('focus', () => {
      reloadData();
    });
    return unsubscribe;
  }, [navigation, selectedDate, isFocused]);

  // お気に入りトグル処理
  const handleToggleFavorite = async (log: MealLog) => {
    const existing = favorites.find(
      (f) => f.name.trim().toLowerCase() === log.name.trim().toLowerCase()
    );
    if (existing) {
      await deleteFavoriteById(existing.id);
    } else {
      await addFavoriteFromLog({
        name: log.name,
        meal_type: log.meal_type,
        calories: log.calories,
        protein: log.protein,
        fat: log.fat,
        carbs: log.carbs,
        sodium: log.sodium,
        fiber: log.fiber,
        memo: log.memo,
        created_at: Date.now(),
      });
    }
  };

  // クイックお気に入りからの直接記録
  const handleSelectQuickFavorite = async (fav: MealFavorite) => {
    const now = new Date();
    await addMeal({
      date: selectedDate,
      meal_type: fav.meal_type || 'dinner',
      meal_time: now.toTimeString().slice(0, 5),
      name: fav.name,
      calories: fav.calories,
      protein: fav.protein,
      fat: fav.fat,
      carbs: fav.carbs,
      sodium: fav.sodium,
      fiber: fav.fiber,
      memo: fav.memo,
      created_at: now.getTime(),
    });
  };

  // 一括取り込み
  const handleImportMd = async (logs: Omit<MealLog, 'id'>[]) => {
    for (const log of logs) {
      await addMeal(log);
    }
  };

  const lastMealLog = mealLogs.length > 0 ? mealLogs[mealLogs.length - 1] : null;

  const safeGoals: NutritionGoals = userGoals || {
    calories: 2000,
    protein: 60,
    fat: 55,
    carbs: 250,
    sodium: 7.5,
    fiber: 20,
  };

  const safeAutophagy: AutophagyConfig = autophagyConfig || {
    enabled: true,
    target_hours: 16,
    auto_sync_with_last_meal: true,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: '🥗 栄養＆食事管理',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
              <TouchableOpacity onPress={() => setShowHistory(prev => !prev)} style={{ padding: 6, marginRight: 6 }}>
                <Ionicons name={showHistory ? "list-outline" : "stats-chart-outline"} size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={{ padding: 6 }}>
                <Ionicons name="settings-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {showHistory ? (
        <LifelogHistoryTab type="nutrition" t={t} />
      ) : (
        <>
          {/* 日付ナビゲーションバー */}
          <View style={[styles.dateBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDateOffset(-1)}>
              <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateCenterBtn} onPress={() => setSelectedDate(getTodayStr())}>
              <Text style={[styles.dateText, { color: colors.text }]}>{selectedDate === getTodayStr() ? `今日 (${selectedDate})` : selectedDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDateOffset(1)}>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
        {/* 食事登録アクションボタン群（最上段） */}
        <View style={styles.actionSection}>
          {/* 行1: 3個ボタン */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionGridBtn, { backgroundColor: '#0369a1' }]}
              onPress={() => setShowPhotoModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionGridBtnText}>📷 写真解析</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionGridBtn, { backgroundColor: '#0284c7' }]}
              onPress={() => setShowChatModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionGridBtnText}>💬 AIチャット</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionGridBtn, { backgroundColor: '#047857' }]}
              onPress={() => setShowManualModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionGridBtnText}>✏️ 手動入力</Text>
            </TouchableOpacity>
          </View>

          {/* 行2: 2個ボタン */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionGridBtn, { backgroundColor: '#3730a3' }]}
              onPress={() => setShowHistoryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionGridBtnText}>⭐ 履歴から記録</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionGridBtn, { backgroundColor: '#5b21b6' }]}
              onPress={() => setShowMdModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionGridBtnText}>📋 MD一括取り込み</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* クイックお気に入りバー（上から2番目） */}
        <QuickFavoritesBar
          favorites={favorites}
          onSelectFavorite={handleSelectQuickFavorite}
        />

        {/* 栄養サマリーカード */}
        <NutritionSummaryCard mealLogs={mealLogs || []} userGoals={safeGoals} />

        {/* 食事ログ一覧 */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#4facfe" style={{ marginVertical: 20 }} />
        ) : (
          <MealLogList
            mealLogs={mealLogs}
            favorites={favorites}
            onDeleteMeal={(id) => setDeletingMealId(id)}
            onEditMeal={(log) => setEditingLog(log)}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {/* 14日間履歴グラフ */}
        <NutritionHistoryChart allLogs={allHistoryLogs || []} goals={safeGoals} />

        {/* オートファジー絶食タイマー（最下段） */}
        <AutophagyCard
          config={safeAutophagy}
          lastMealLog={lastMealLog}
          onUpdateConfig={updateAutophagyConfig}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
      </>
      )}

      {/* 各種モーダル */}
      <ChatRecordModal
        visible={showChatModal}
        onClose={() => setShowChatModal(false)}
        onSave={addMeal}
        selectedDate={selectedDate}
      />

      {showPhotoModal && (
        <PhotoRecordModal
          visible={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
          onSave={addMeal}
          selectedDate={selectedDate}
        />
      )}

      <ManualEntryModal
        visible={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSave={addMeal}
        selectedDate={selectedDate}
      />

      <HistorySelectModal
        visible={showHistoryModal}
        historyLogs={allHistoryLogs || []}
        onClose={() => setShowHistoryModal(false)}
        onSelect={addMeal}
        selectedDate={selectedDate}
      />

      <EditMealLogModal
        visible={editingLog !== null}
        log={editingLog}
        onClose={() => setEditingLog(null)}
        onSave={updateMeal}
      />

      <MdImportModal
        visible={showMdModal}
        onClose={() => setShowMdModal(false)}
        onImport={handleImportMd}
        selectedDate={selectedDate}
      />

      <NutritionSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userGoals={safeGoals}
        autophagyConfig={safeAutophagy}
        onSaveGoals={saveGoals}
        onSaveAutophagy={updateAutophagyConfig}
      />

      <ConfirmModal
        visible={deletingMealId !== null}
        title="ログ削除"
        message="この食事ログを削除しますか？"
        confirmText="削除"
        type="danger"
        onConfirm={async () => {
          if (deletingMealId !== null) {
            await deleteMeal(deletingMealId);
            setDeletingMealId(null);
          }
        }}
        onCancel={() => setDeletingMealId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    elevation: 2,
    zIndex: 10,
  },
  dateNavBtn: { padding: 8 },
  dateCenterBtn: { paddingHorizontal: 12, paddingVertical: 4 },
  dateText: { fontSize: 14, fontWeight: '700', color: '#f8fafc' },
  scrollBody: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 40 },
  actionSection: {
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionGridBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionGridBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
