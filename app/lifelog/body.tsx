import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Theme, useAppTheme } from '../../src/theme';
import { useBodyStore } from '../../src/store/bodyStore';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { BodyCompositionLog } from '../../src/types/bodyComposition';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useFeatureSwipe } from '../../hooks/useFeatureSwipe';

// Components
import BodySummaryCard from '../../components/body/BodySummaryCard';
import NavyFatCalculatorCard from '../../components/body/NavyFatCalculatorCard';
import CaseyLimitCalculatorCard from '../../components/body/CaseyLimitCalculatorCard';
import PotentialGaugeCard from '../../components/body/PotentialGaugeCard';
import BodyMeasurementModal from '../../components/body/BodyMeasurementModal';
import BodyGuideModal from '../../components/body/BodyGuideModal';
import { LifelogHistoryTab } from '../../components/history/LifelogHistoryTab';

export default function BodyCompositionScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { panHandlerProps } = useFeatureSwipe('/lifelog/body');

  // Zustand Store Selectors (Performance optimization)
  const currentLog = useBodyStore((state) => state.currentLog);
  const latestLog = useBodyStore((state) => state.latestLog);
  const historyLogs = useBodyStore((state) => state.historyLogs);
  const isLoading = useBodyStore((state) => state.isLoading);
  const isHealthSyncing = useBodyStore((state) => state.isHealthSyncing);
  const syncError = useBodyStore((state) => state.syncError);

  const loadBodyData = useBodyStore((state) => state.loadBodyData);
  const saveBodyLog = useBodyStore((state) => state.saveBodyLog);
  const saveLastMeasurements = useBodyStore((state) => state.saveLastMeasurements);
  const deleteBodyLog = useBodyStore((state) => state.deleteBodyLog);
  const syncWithHealthConnect = useBodyStore((state) => state.syncWithHealthConnect);

  // LifelogStore (currentDate sync)
  const lifelogDate = useLifelogStore((state) => state.currentDate);

  // Date State (YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const normalizeDateStr = (rawDate?: string | null) => {
    if (!rawDate) return getTodayStr();
    return rawDate.replace(/\//g, '-');
  };

  const [selectedDate, setSelectedDate] = useState(normalizeDateStr(lifelogDate));
  const [showHistoryTab, setShowHistoryTab] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 日付切替 (前日 / 翌日)
  const changeDateOffset = (offsetDays: number) => {
    const parts = selectedDate.split('-');
    const base =
      parts.length === 3
        ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
        : new Date();
    base.setDate(base.getDate() + offsetDays);
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, '0');
    const d = String(base.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // 画面フォーカス時および日付変更時のデータ読み込み
  useEffect(() => {
    if (!isFocused) return;
    loadBodyData(selectedDate);
  }, [isFocused, selectedDate, loadBodyData]);

  // 手動リフレッシュ
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBodyData(selectedDate);
    setRefreshing(false);
  }, [selectedDate, loadBodyData]);

  // Health Connect 同期ハンドラー
  const handleSyncHealthConnect = async () => {
    const success = await syncWithHealthConnect(selectedDate);
    if (success) {
      Alert.alert('同期完了', 'Health Connectから最新の体組成データを取得・反映しました。');
    } else if (syncError) {
      Alert.alert('同期エラー', syncError);
    }
  };

  // 米海軍式からの体脂肪率反映ハンドラー
  const handleApplyNavyFat = async (
    bodyFatRate: number,
    neck: number,
    waist: number,
    hip?: number,
    height?: number
  ) => {
    try {
      const weight = currentLog?.weight ?? latestLog?.weight ?? null;
      const lbm =
        weight !== null ? Number((weight * (1 - bodyFatRate / 100)).toFixed(1)) : null;

      await saveBodyLog({
        date: selectedDate,
        body_fat_rate: bodyFatRate,
        neck,
        waist,
        hip: hip ?? null,
        height: height ?? currentLog?.height ?? latestLog?.height ?? null,
        lbm,
        source: 'navy_calc',
      });

      if (height) {
        saveLastMeasurements({ height, neck, waist, hip: hip ?? null });
      }

      Alert.alert('反映完了', `体脂肪率 ${bodyFatRate}% を今日の体組成ログに保存しました。`);
    } catch (e: any) {
      Alert.alert('保存エラー', e.message || '体脂肪率の保存に失敗しました');
    }
  };

  // ケーシーバット骨格サイズの保存ハンドラー
  const handleSaveCaseyMeasurements = async (
    wrist: number,
    ankle: number,
    targetFatRate?: number,
    height?: number
  ) => {
    try {
      await saveBodyLog({
        date: selectedDate,
        wrist,
        ankle,
        height: height ?? currentLog?.height ?? latestLog?.height ?? null,
      });

      saveLastMeasurements({
        wrist,
        ankle,
        targetFatRate: targetFatRate ?? 10,
        ...(height ? { height } : {}),
      });

      Alert.alert('保存完了', '手首囲・足首囲・想定体脂肪率・身長を保存しました。');
    } catch (e: any) {
      Alert.alert('保存エラー', e.message || '測定値の保存に失敗しました');
    }
  };

  return (
    <PanGestureHandler {...panHandlerProps}>
      <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
        <Stack.Screen
          options={{
            title: '体組成 ＆ 筋肥大限界',
            headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
              <TouchableOpacity
                onPress={() => setShowHistoryTab((prev) => !prev)}
                style={{ padding: 8, marginRight: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showHistoryTab ? 'speedometer-outline' : 'stats-chart-outline'}
                  size={22}
                  color={Theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowGuideModal(true)}
                style={{ padding: 8 }}
                activeOpacity={0.7}
              >
                <Ionicons name="help-circle-outline" size={22} color={Theme.colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Date Header Switcher (メイン画面表示時のみ) */}
      {!showHistoryTab && (
        <View style={styles.dateBar}>
          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => changeDateOffset(-1)}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-back" size={20} color={Theme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateCenterBtn}
            onPress={() => setSelectedDate(getTodayStr())}
            activeOpacity={0.7}
          >
            <Text style={styles.dateMainText}>{selectedDate}</Text>
            {selectedDate === getTodayStr() && <Text style={styles.todayBadge}>今日</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateArrowBtn}
            onPress={() => changeDateOffset(1)}
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content View */}
      {showHistoryTab ? (
        /* 履歴・折れ線推移グラフトップ */
        <LifelogHistoryTab type="body" t={t} />
      ) : (
        /* メイン ダッシュボード タブ */
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.mainContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />
          }
        >
          {/* 1. 今日の体組成カード */}
          <BodySummaryCard
            currentLog={currentLog}
            latestLog={latestLog}
            isHealthSyncing={isHealthSyncing}
            onSyncHealthConnect={handleSyncHealthConnect}
            onOpenEditModal={() => setShowEditModal(true)}
            onOpenGuideModal={() => setShowGuideModal(true)}
          />

          {/* 2. 限界到達度 ＆ ポテンシャル診断ゲージ */}
          <PotentialGaugeCard currentLog={currentLog} latestLog={latestLog} />

          {/* 3. 米海軍式 体脂肪率推定カード */}
          <NavyFatCalculatorCard
            currentLog={currentLog}
            latestLog={latestLog}
            onApplyBodyFat={handleApplyNavyFat}
            onOpenGuide={() => setShowGuideModal(true)}
          />

          {/* 4. ケーシー・バット博士 筋肥大限界モデル */}
          <CaseyLimitCalculatorCard
            currentLog={currentLog}
            latestLog={latestLog}
            onSaveMeasurements={handleSaveCaseyMeasurements}
            onOpenGuide={() => setShowGuideModal(true)}
          />
        </ScrollView>
      )}

      {/* 測定値編集モーダル */}
      <BodyMeasurementModal
        visible={showEditModal}
        date={selectedDate}
        currentLog={currentLog}
        latestLog={latestLog}
        onClose={() => setShowEditModal(false)}
        onSave={async (log) => {
          await saveBodyLog(log);
        }}
      />

      {/* 身体測定ガイドモーダル */}
      <BodyGuideModal visible={showGuideModal} onClose={() => setShowGuideModal(false)} />
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  dateArrowBtn: {
    padding: 8,
  },
  dateCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateMainText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  todayBadge: {
    fontSize: 11,
    color: Theme.colors.primary,
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: 'bold',
  },
  mainScroll: {
    flex: 1,
  },
  mainContent: {
    padding: 16,
    paddingBottom: 220,
  },
});
