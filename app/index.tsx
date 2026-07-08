import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useLifelogStore } from '../src/store/lifelogStore';
import { saveSetting } from '../src/db/database';
import { readCrashLog, deleteCrashLog, sendCrashReport, initializeSentry } from '../src/services/crashReporterService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  // Workout Store
  const isActive = useWorkoutStore(state => state.isActive);
  const workoutTitle = useWorkoutStore(state => state.title);
  const settings = useWorkoutStore(state => state.settings);
  const loadSettings = useWorkoutStore(state => state.loadSettings);
  const hasUnsentCrashLog = useWorkoutStore(state => state.hasUnsentCrashLog);

  // Lifelog Store
  const currentDate = useLifelogStore(state => state.currentDate);
  const daySummary = useLifelogStore(state => state.daySummary);
  const isLoadingLifelog = useLifelogStore(state => state.isLoading);
  const setCurrentDate = useLifelogStore(state => state.setCurrentDate);
  const addWater = useLifelogStore(state => state.addWater);
  const addHabitLog = useLifelogStore(state => state.addHabitLog);

  // Local state for onboarding/modals
  const [isSendingCrash, setIsSendingCrash] = useState(false);
  const [isNewUser, setIsNewUser] = useState(settings.needsStyleSelection);

  // Date Formatting helper
  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const formatDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  const parseDateStr = (dateStr: string): Date => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  useFocusEffect(
    useCallback(() => {
      const today = getTodayStr();
      const targetDate = currentDate || today;
      setCurrentDate(targetDate);
    }, [currentDate])
  );

  // Date navigation
  const handlePrevDay = () => {
    const date = parseDateStr(currentDate || getTodayStr());
    date.setDate(date.getDate() - 1);
    setCurrentDate(formatDate(date));
  };

  const handleNextDay = () => {
    const date = parseDateStr(currentDate || getTodayStr());
    date.setDate(date.getDate() + 1);
    setCurrentDate(formatDate(date));
  };

  const handleGoToday = () => {
    setCurrentDate(getTodayStr());
  };

  // Quick actions
  const handleAddWaterAmount = async (amount: number) => {
    const today = currentDate || getTodayStr();
    await addWater(amount, today);
  };

  const handleIncrementHabit = async (habitItemId: number) => {
    const today = currentDate || getTodayStr();
    await addHabitLog(habitItemId, today);
  };

  // Onboarding Handlers
  const handleSelectUnit = async (unit: 'kg' | 'lbs') => {
    await saveSetting('weight_unit', unit);
    loadSettings({
      defaultRest: settings.defaultRest,
      autoRest: settings.autoRest,
      timerVibrate: settings.timerVibrate,
      weightUnit: unit,
      needsUnitSelection: false,
      bodyWeight: settings.bodyWeight,
      needsStyleSelection: settings.needsStyleSelection
    });
  };

  const handleSelectStyle = async (style: 'simple' | 'advanced') => {
    await saveSetting('style_mode', style);
    const isAdvanced = style === 'advanced';

    await saveSetting('display_rpe', isAdvanced ? '1' : '0');
    await saveSetting('display_stance', isAdvanced ? '1' : '0');
    await saveSetting('display_1rm', isAdvanced ? '1' : '0');
    await saveSetting('display_volume', isAdvanced ? '1' : '0');

    useWorkoutStore.getState().setDisplayFields({
      showRpe: isAdvanced,
      showStance: isAdvanced,
      show1RM: isAdvanced,
      showVolume: isAdvanced
    });

    loadSettings({
      defaultRest: settings.defaultRest,
      autoRest: settings.autoRest,
      timerVibrate: settings.timerVibrate,
      weightUnit: settings.weightUnit,
      needsUnitSelection: false,
      bodyWeight: settings.bodyWeight,
      needsStyleSelection: false,
      aiTokensBalance: settings.aiTokensBalance,
      crashConsent: settings.crashConsent
    });
  };

  const handleCrashConsent = async (consent: 'agreed' | 'declined') => {
    if (isSendingCrash) return;
    setIsSendingCrash(true);
    try {
      await saveSetting('crash_report_consent', consent);
      useWorkoutStore.getState().setCrashConsent(consent);

      if (consent === 'agreed') {
        initializeSentry();
      }

      if (hasUnsentCrashLog) {
        if (consent === 'agreed') {
          const log = await readCrashLog();
          if (log) {
            await sendCrashReport(log);
          }
        }
        await deleteCrashLog();
        useWorkoutStore.getState().setHasUnsentCrashLog(false);
      }

      setIsNewUser(false);
    } catch (e) {
      console.error('Failed to save crash report consent:', e);
    } finally {
      setIsSendingCrash(false);
    }
  };

  const isToday = currentDate === getTodayStr();

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      {/* Date Switcher Header */}
      <View style={[styles.dateHeader, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
        <TouchableOpacity onPress={handlePrevDay} style={styles.dateNavBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.dateTextContainer}>
          <Text style={styles.dateText}>{currentDate || getTodayStr()}</Text>
          {!isToday && (
            <TouchableOpacity onPress={handleGoToday} style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>今日に戻る</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleNextDay} style={styles.dateNavBtn}>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Loading Indicator */}
        {isLoadingLifelog && (
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginBottom: 12 }} />
        )}

        {/* 1. Workout Card */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.9} 
          onPress={() => router.push('/(tabs)')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
              <Ionicons name="barbell" size={24} color={Theme.colors.primary} />
            </View>
            <Text style={styles.cardTitle}>ワークアウト記録</Text>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>

          <View style={styles.cardBody}>
            {isActive ? (
              <View style={styles.activeWorkoutContainer}>
                <View style={styles.statusBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.statusBadgeText}>実行中</Text>
                </View>
                <Text style={styles.workoutActiveTitle} numberOfLines={1}>
                  {workoutTitle || 'フリーワークアウト'}
                </Text>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: Theme.colors.success }]}
                  onPress={() => router.push('/active-workout')}
                >
                  <Text style={styles.actionBtnText}>トレーニングに戻る</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inactiveWorkoutContainer}>
                <Text style={styles.inactiveText}>今日の筋トレ記録を開始、またはルーティンを選択します。</Text>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => router.push('/(tabs)')}
                >
                  <Text style={styles.actionBtnText}>筋トレ画面を開く</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* 2. Water Intake Card */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.9}
          onPress={() => router.push('/lifelog/water')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}>
              <Ionicons name="water" size={24} color="#00d2ff" />
            </View>
            <Text style={styles.cardTitle}>水分補給</Text>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.statRow}>
              <Text style={styles.statVal}>{daySummary?.water.amount ?? 0} <Text style={styles.statUnit}>ml</Text></Text>
              <Text style={styles.statGoal}>/ {daySummary?.water.goal ?? 2000} ml</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: `${Math.min(100, daySummary?.water.percentage ?? 0)}%`,
                      backgroundColor: '#00d2ff' 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressPercent}>{daySummary?.water.percentage ?? 0}%</Text>
            </View>

            {/* Quick Add Presets */}
            <View style={styles.presetsRow}>
              <TouchableOpacity 
                style={styles.presetBtn} 
                onPress={() => handleAddWaterAmount(200)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetBtnText}>+200ml</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.presetBtn} 
                onPress={() => handleAddWaterAmount(300)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetBtnText}>+300ml</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.presetBtn} 
                onPress={() => handleAddWaterAmount(500)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetBtnText}>+500ml</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {/* 3. 24h Time Breakdown Card */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.9}
          onPress={() => router.push('/lifelog/zikan')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 152, 0, 0.15)' }]}>
              <Ionicons name="time" size={24} color="#ff9800" />
            </View>
            <Text style={styles.cardTitle}>24時間管理</Text>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.statRow}>
              <Text style={styles.statVal}>
                {daySummary ? (daySummary.totalZikanMinutes / 60).toFixed(1) : '0.0'} <Text style={styles.statUnit}>時間</Text>
              </Text>
              <Text style={styles.statGoal}>記録済み</Text>
            </View>

            <View style={styles.breakdownList}>
              {daySummary?.zikan && daySummary.zikan.length > 0 ? (
                daySummary.zikan.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.breakdownRow}>
                    <Text style={styles.breakdownName}>• {item.name}</Text>
                    <Text style={styles.breakdownTime}>
                      {item.hours >= 1 ? `${item.hours}時間` : ''}{item.minutes % 60 > 0 ? `${item.minutes % 60}分` : ''}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>記録された時間ブロックがありません</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* 4. Habits Card */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.9}
          onPress={() => router.push('/lifelog/habit')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(233, 30, 99, 0.15)' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#e91e63" />
            </View>
            <Text style={styles.cardTitle}>習慣カウンター</Text>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>

          <View style={styles.cardBody}>
            {daySummary?.habits && daySummary.habits.length > 0 ? (
              <View style={styles.habitList}>
                {daySummary.habits.map((habit) => (
                  <View key={habit.id} style={styles.habitRow}>
                    <View style={styles.habitInfo}>
                      <View style={[styles.habitColorDot, { backgroundColor: habit.color || '#fff' }]} />
                      <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                    </View>
                    <View style={styles.habitActionContainer}>
                      <Text style={styles.habitCount}>{habit.count} 回</Text>
                      <TouchableOpacity
                        style={styles.habitAddBtn}
                        onPress={() => handleIncrementHabit(habit.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>習慣が登録されていません</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* 5. Routine Tracker Card */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.9}
          onPress={() => router.push('/lifelog/routine')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
              <Ionicons name="repeat" size={24} color="#4caf50" />
            </View>
            <Text style={styles.cardTitle}>ルーティン管理</Text>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.statRow}>
              <Text style={styles.statVal}>
                {daySummary?.routinesCount ?? 0} <Text style={styles.statUnit}>件</Text>
              </Text>
              <Text style={styles.statGoal}>登録中</Text>
            </View>
            <View style={styles.routineSummaryRow}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color="#4caf50" style={{ marginRight: 6 }} />
              <Text style={styles.routineSummaryText}>
                今日の完了ルーティン: <Text style={styles.routineCompletedCount}>{daySummary?.routinesCompletedToday ?? 0}</Text> 件
              </Text>
            </View>
          </View>
        </TouchableOpacity>

      </ScrollView>

      {/* Onboarding Unit Selection Modal */}
      <Modal visible={settings.needsUnitSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Ionicons name="barbell" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.home.onboarding_unit_title')}</Text>
            <Text style={styles.modalDesc}>
              {t('ui.home.onboarding_unit_desc')}
            </Text>
            <View style={styles.modalBtnContainer}>
              <TouchableOpacity style={styles.unitBtn} onPress={() => handleSelectUnit('kg')}>
                <Text style={styles.unitBtnText}>{t('ui.home.unit_kg_desc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.unitBtn} onPress={() => handleSelectUnit('lbs')}>
                <Text style={styles.unitBtnText}>{t('ui.home.unit_lbs_desc')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Onboarding Style Selection Modal */}
      <Modal visible={!settings.needsUnitSelection && settings.needsStyleSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <Ionicons name="sparkles" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.home.onboarding_style_title') || '記録スタイルを選択'}</Text>
            <Text style={[styles.modalDesc, { marginBottom: 20 }]}>
              {t('ui.home.onboarding_style_desc') || 'ご自身のトレーニングレベルや好みに合わせて、画面に表示する記録項目を選んでください。'}
            </Text>

            <TouchableOpacity 
              style={styles.styleOptionCard} 
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('simple')}
            >
              <View style={styles.styleOptionIconBg}>
                <Ionicons name="document-text-outline" size={26} color={Theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.styleOptionTitle}>{t('ui.home.style_simple_title') || 'シンプル'}</Text>
                <Text style={styles.styleOptionDesc}>
                  {t('ui.home.style_simple_desc') || '表示項目を最小限に抑え、トレーニングの重量・回数記録だけに集中できるクリーンな表示です。'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.styleOptionCard, { marginTop: 12 }]} 
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('advanced')}
            >
              <View style={[styles.styleOptionIconBg, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
                <Ionicons name="sparkles-outline" size={26} color={Theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.styleOptionTitle}>{t('ui.home.style_advanced_title') || 'こだわり'}</Text>
                <Text style={styles.styleOptionDesc}>
                  {t('ui.home.style_advanced_desc') || 'RPE(辛さ)やフォームのスタンス記録、自動1RM推定、合計ボリューム計算など、こだわりの機能をフル活用できます。'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.styleOnboardingHint}>
              {t('ui.home.style_onboarding_hint') || '※選択した内容は、後から設定（プロフィール）画面で個別にいつでもON/OFFを変更可能です。'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Onboarding & Startup Crash Consent Modal */}
      <Modal visible={!settings.needsUnitSelection && !settings.needsStyleSelection && settings.crashConsent === 'unset' && hasUnsentCrashLog} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxWidth: 450 }]}>
            <Ionicons name="bug-outline" size={48} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.crash_report.title') || 'アプリ改善へのご協力のお願い'}</Text>
            <Text style={[styles.modalDesc, { marginBottom: 24 }]}>
              {t('ui.crash_report.message_detected') || '前回の起動時にアプリが予期せず終了しました。品質向上のため、匿名のクラッシュレポートを送信してもよろしいですか？'}
            </Text>

            <View style={styles.modalBtnContainer}>
              <TouchableOpacity style={styles.crashConsentBtn} onPress={() => handleCrashConsent('agreed')} disabled={isSendingCrash}>
                {isSendingCrash ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.crashConsentBtnText}>{t('ui.crash_report.btn_consent') || '送信して協力する（同意）'}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.crashDeclineBtn} onPress={() => handleCrashConsent('declined')} disabled={isSendingCrash}>
                <Text style={styles.crashDeclineBtnText}>{t('ui.crash_report.btn_decline') || '今回は送信しない（拒否）'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  dateNavBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dateTextContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  todayBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Theme.borderRadius.sm,
  },
  todayBadgeText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Theme.spacing.md,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    width: '100%',
  },
  activeWorkoutContainer: {
    gap: 8,
  },
  workoutActiveTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 217, 100, 0.15)',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.success,
  },
  statusBadgeText: {
    color: Theme.colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  inactiveWorkoutContainer: {
    gap: 12,
  },
  inactiveText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  statVal: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 6,
  },
  statUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: Theme.colors.textMuted,
  },
  statGoal: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Theme.spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  presetBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownList: {
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownName: {
    color: '#fff',
    fontSize: 14,
  },
  breakdownTime: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  habitList: {
    gap: 10,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  habitColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  habitName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  habitActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  habitAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(233, 30, 99, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.4)',
  },
  routineSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
  },
  routineSummaryText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  routineCompletedCount: {
    color: '#4caf50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.colors.card, width: '100%', borderRadius: Theme.borderRadius.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 12, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: Theme.colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtnContainer: { width: '100%', gap: 12 },
  unitBtn: { backgroundColor: Theme.colors.primary, paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center' },
  unitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  styleOptionCard: { backgroundColor: 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Theme.borderRadius.md, borderWidth: 1, borderColor: Theme.colors.border, width: '100%' },
  styleOptionIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(79, 172, 254, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  styleOptionTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  styleOptionDesc: { fontSize: 12, color: Theme.colors.textMuted, lineHeight: 18 },
  styleOnboardingHint: { fontSize: 12, color: Theme.colors.textMuted, textAlign: 'center', marginTop: 24, lineHeight: 18, paddingHorizontal: 12 },
  crashConsentBtn: { backgroundColor: '#007aff', paddingVertical: 16, borderRadius: Theme.borderRadius.md, alignItems: 'center', width: '100%', justifyContent: 'center' },
  crashConsentBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  crashDeclineBtn: { backgroundColor: '#121212', paddingVertical: 12, borderRadius: Theme.borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: '#262626', width: '100%', justifyContent: 'center' },
  crashDeclineBtnText: { color: '#555555', fontSize: 14, fontWeight: 'bold' }
});
