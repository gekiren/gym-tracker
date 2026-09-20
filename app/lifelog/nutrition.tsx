import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme, useAppTheme } from '../../src/theme';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { MealLog, MealFavorite, NutritionGoals, AutophagyConfig } from '../../src/db/types';
import {
  getDefaultMealType,
  getCurrentTimeStr,
  getMealDateTime,
  getLatestMealLog,
  sortMealLogsByTime,
} from '../../src/utils/nutritionUtils';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFeatureSwipe } from '../../src/hooks/useFeatureSwipe';

// コンポーネントインポート
import NutritionSummaryCard from '../../components/nutrition/NutritionSummaryCard';
import QuickFavoritesBar from '../../components/nutrition/QuickFavoritesBar';
import QuickPresetsBar from '../../components/nutrition/QuickPresetsBar';
import MealLogList from '../../components/nutrition/MealLogList';
import ChatRecordModal from '../../components/nutrition/ChatRecordModal';
import PhotoRecordModal from '../../components/nutrition/PhotoRecordModal';
import ManualEntryModal from '../../components/nutrition/ManualEntryModal';
import HistorySelectModal from '../../components/nutrition/HistorySelectModal';
import EditMealLogModal from '../../components/nutrition/EditMealLogModal';
import ManageFavoritesModal from '../../components/nutrition/ManageFavoritesModal';
import ManagePresetsModal from '../../components/nutrition/ManagePresetsModal';
import ApplyPresetModal from '../../components/nutrition/ApplyPresetModal';
import AutophagyCard from '../../components/nutrition/AutophagyCard';
import NutritionHistoryChart from '../../components/nutrition/NutritionHistoryChart';
import MdImportModal from '../../components/nutrition/MdImportModal';
import NutritionSettingsModal from '../../components/nutrition/NutritionSettingsModal';
import ImagePreviewModal from '../../components/nutrition/ImagePreviewModal';
import PhotoGalleryModal from '../../components/nutrition/PhotoGalleryModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';
import { MealPresetWithItems, MealPresetItem } from '../../src/db/types';

export default function NutritionScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { panHandlerProps } = useFeatureSwipe('/lifelog/nutrition');

  const [showHistory, setShowHistory] = useState(false);

  // Zustand selector 形式の徹底
  const mealLogs = useNutritionStore((state) => state.mealLogs);
  const allHistoryLogs = useNutritionStore((state) => state.allHistoryLogs);
  const favorites = useNutritionStore((state) => state.favorites);
  const presets = useNutritionStore((state) => state.presets);
  const userGoals = useNutritionStore((state) => state.userNutritionGoals);
  const autophagyConfig = useNutritionStore((state) => state.autophagyConfig);
  const isLoading = useNutritionStore((state) => state.isLoading);

  const loadMealLogs = useNutritionStore((state) => state.loadMealLogs);
  const loadAllHistory = useNutritionStore((state) => state.loadAllHistory);
  const addMeal = useNutritionStore((state) => state.addMeal);
  const updateMeal = useNutritionStore((state) => state.updateMeal);
  const removeMealPhoto = useNutritionStore((state) => state.removeMealPhoto);
  const deleteMeal = useNutritionStore((state) => state.deleteMeal);
  const deleteMealGroupByGroupId = useNutritionStore((state) => state.deleteMealGroupByGroupId);
  const loadFavorites = useNutritionStore((state) => state.loadFavorites);
  const addFavoriteFromLog = useNutritionStore((state) => state.addFavoriteFromLog);
  const addNewFavorite = useNutritionStore((state) => state.addNewFavorite);
  const updateFavoriteItem = useNutritionStore((state) => state.updateFavoriteItem);
  const updateFavoritesOrder = useNutritionStore((state) => state.updateFavoritesOrder);
  const deleteFavoriteById = useNutritionStore((state) => state.deleteFavoriteById);
  const loadPresets = useNutritionStore((state) => state.loadPresets);
  const addNewPreset = useNutritionStore((state) => state.addNewPreset);
  const updatePresetItem = useNutritionStore((state) => state.updatePresetItem);
  const deletePresetById = useNutritionStore((state) => state.deletePresetById);
  const updatePresetsOrder = useNutritionStore((state) => state.updatePresetsOrder);
  const applyPreset = useNutritionStore((state) => state.applyPreset);
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
  const [showManageFavsModal, setShowManageFavsModal] = useState(false);
  const [showManagePresetsModal, setShowManagePresetsModal] = useState(false);
  const [selectedPresetToApply, setSelectedPresetToApply] = useState<MealPresetWithItems | null>(null);
  const [initialPresetData, setInitialPresetData] = useState<{
    name: string;
    meal_type?: string;
    meal_time?: string;
    items: Omit<MealPresetItem, 'id' | 'preset_id'>[];
  } | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [deletingPresetName, setDeletingPresetName] = useState<string | null>(null);
  const [showPhotoGalleryModal, setShowPhotoGalleryModal] = useState(false);
  const [previewLog, setPreviewLog] = useState<MealLog | null>(null);
  const [deletingPhotoLog, setDeletingPhotoLog] = useState<MealLog | null>(null);
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
      await loadPresets();
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

  // 本日の食事ログから献立セットを新規作成
  const handleCreatePresetFromCurrentLogs = (logs: MealLog[]) => {
    if (!logs || logs.length === 0) return;
    const items: Omit<MealPresetItem, 'id' | 'preset_id'>[] = logs.map((log, idx) => ({
      name: log.name,
      calories: log.calories || 0,
      protein: log.protein || 0,
      fat: log.fat || 0,
      carbs: log.carbs || 0,
      sodium: log.sodium || 0,
      fiber: log.fiber || 0,
      memo: log.memo,
      sort_order: idx,
    }));
    const dominantType = logs[0]?.meal_type || getDefaultMealType();
    const dominantTime = logs[0]?.meal_time || getCurrentTimeStr();

    const typeLabels: Record<string, string> = {
      breakfast: '朝食',
      lunch: '昼食',
      dinner: '夕食',
      snack: '間食',
    };
    const typeLabel = typeLabels[dominantType] || '定番';

    setInitialPresetData({
      name: `定番${typeLabel}セット`,
      meal_type: dominantType,
      meal_time: dominantTime,
      items,
    });
    setShowManagePresetsModal(true);
  };

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
      meal_type: getDefaultMealType(now),
      meal_time: getCurrentTimeStr(now),
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

  // 食事時間順（朝→昼→夕）にソートした食事ログ一覧
  const sortedMealLogs = useMemo(() => {
    return sortMealLogsByTime(mealLogs || []);
  }, [mealLogs]);

  // 直近の最終食事ログ（記録時間ベースで最新の食事）
  const lastMealLog = useMemo(() => {
    // 選択日（本日）の食事ログがあれば、その中で記録時間が最新の食事
    if (mealLogs && mealLogs.length > 0) {
      return getLatestMealLog(mealLogs);
    }
    // 本日の食事がまだない場合、全履歴から現在時刻以前の最新食事を探索
    if (allHistoryLogs && allHistoryLogs.length > 0) {
      const nowMs = Date.now();
      return getLatestMealLog(allHistoryLogs, nowMs);
    }
    return null;
  }, [mealLogs, allHistoryLogs]);

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
    <PanGestureHandler {...panHandlerProps}>
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

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 80, 120) },
            ]}
          >
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

          {/* 行2: 3個ボタン */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionGridBtn, { backgroundColor: '#0e7490' }]}
              onPress={() => setShowPhotoGalleryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionGridBtnText}>🖼️ 過去写真</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionGridBtn, { backgroundColor: '#3730a3' }]}
              onPress={() => setShowHistoryModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionGridBtnText}>⭐ 履歴記録</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionGridBtn, { backgroundColor: '#5b21b6' }]}
              onPress={() => setShowMdModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionGridBtnText}>📋 MD一括</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 献立セット一括記録バー */}
        <QuickPresetsBar
          presets={presets}
          selectedDate={selectedDate}
          onSelectPreset={(preset) => setSelectedPresetToApply(preset)}
          onOpenManage={() => {
            setInitialPresetData(null);
            setShowManagePresetsModal(true);
          }}
        />

        {/* クイックお気に入りバー */}
        <QuickFavoritesBar
          favorites={favorites}
          onSelectFavorite={handleSelectQuickFavorite}
          onOpenManage={() => setShowManageFavsModal(true)}
        />

        {/* 栄養サマリーカード */}
        <NutritionSummaryCard mealLogs={mealLogs || []} userGoals={safeGoals} />

        {/* 食事ログ一覧 */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#4facfe" style={{ marginVertical: 20 }} />
        ) : (
          <MealLogList
            mealLogs={sortedMealLogs}
            onDeleteMeal={(id) => setDeletingMealId(id)}
            onEditMeal={(log) => setEditingLog(log)}
            onPreviewPhoto={(log) => setPreviewLog(log)}
            onDeletePresetGroup={(groupId, presetName) => {
              setDeletingGroupId(groupId);
              setDeletingPresetName(presetName || null);
            }}
            onCreatePresetFromLogs={handleCreatePresetFromCurrentLogs}
          />
        )}

        {/* 14日間履歴グラフ */}
        <NutritionHistoryChart allLogs={allHistoryLogs || []} goals={safeGoals} />

        {/* オートファジー絶食タイマー（当日のみ最下段に表示） */}
        {selectedDate === getTodayStr() && (
          <AutophagyCard
            config={safeAutophagy}
            lastMealLog={lastMealLog}
            onUpdateConfig={updateAutophagyConfig}
          />
        )}

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
        aiUrl={safeGoals.ai_url}
      />

      <NutritionSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        userGoals={safeGoals}
        autophagyConfig={safeAutophagy}
        onSaveGoals={saveGoals}
        onSaveAutophagy={updateAutophagyConfig}
      />

      <ManageFavoritesModal
        visible={showManageFavsModal}
        favorites={favorites}
        onClose={() => setShowManageFavsModal(false)}
        onAddFavorite={addNewFavorite}
        onUpdateFavorite={updateFavoriteItem}
        onDeleteFavorite={deleteFavoriteById}
        onUpdateOrder={updateFavoritesOrder}
      />

      {/* 献立セット管理モーダル */}
      <ManagePresetsModal
        visible={showManagePresetsModal}
        presets={presets}
        favorites={favorites}
        historyLogs={allHistoryLogs || []}
        initialNewPresetData={initialPresetData}
        onClose={() => {
          setShowManagePresetsModal(false);
          setInitialPresetData(null);
        }}
        onAddPreset={addNewPreset}
        onUpdatePreset={updatePresetItem}
        onDeletePreset={deletePresetById}
        onUpdateOrder={updatePresetsOrder}
      />

      {/* 献立セット一括記録プレビューモーダル */}
      <ApplyPresetModal
        visible={selectedPresetToApply !== null}
        preset={selectedPresetToApply}
        selectedDate={selectedDate}
        onClose={() => setSelectedPresetToApply(null)}
        onApply={async (presetId, date, options) => {
          await applyPreset(presetId, date, options);
        }}
      />

      {/* 写真拡大プレビューモーダル */}
      <ImagePreviewModal
        visible={previewLog !== null}
        imageUri={previewLog?.photo_url || null}
        log={previewLog}
        onClose={() => setPreviewLog(null)}
        onDeletePhoto={(log) => {
          setDeletingPhotoLog(log);
        }}
      />

      {/* 過去写真ギャラリーモーダル */}
      <PhotoGalleryModal
        visible={showPhotoGalleryModal}
        historyLogs={allHistoryLogs || []}
        onClose={() => setShowPhotoGalleryModal(false)}
        onPreviewPhoto={(log) => setPreviewLog(log)}
        onDeletePhoto={async (id) => {
          await removeMealPhoto(id);
        }}
      />

      {/* 写真のみ削除確認モーダル（プレビュー画面からの削除時用） */}
      <ConfirmModal
        visible={deletingPhotoLog !== null}
        title="写真のみ削除"
        message="この食事ログの写真のみを削除しますか？\n（食事の記録データ自体は保持されます）"
        confirmText="写真のみ削除"
        type="danger"
        onConfirm={async () => {
          if (deletingPhotoLog !== null) {
            await removeMealPhoto(deletingPhotoLog.id);
            setDeletingPhotoLog(null);
            setPreviewLog(null);
          }
        }}
        onCancel={() => setDeletingPhotoLog(null)}
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

      {/* 献立セット一括削除確認モーダル */}
      <ConfirmModal
        visible={deletingGroupId !== null}
        title="献立セットの一括削除"
        message={`この献立セット食事（${deletingPresetName || 'セット'}）を一括削除しますか？\n（同セットで記録されたすべての品が削除されます）`}
        confirmText="一括削除"
        type="danger"
        onConfirm={async () => {
          if (deletingGroupId !== null) {
            await deleteMealGroupByGroupId(deletingGroupId);
            setDeletingGroupId(null);
            setDeletingPresetName(null);
          }
        }}
        onCancel={() => {
          setDeletingGroupId(null);
          setDeletingPresetName(null);
        }}
      />
      </View>
    </PanGestureHandler>
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
