import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Dimensions, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore, FeatureId } from '../src/store/settingsStore';
import { useLifelogStore } from '../src/store/lifelogStore';
import { useNutritionStore } from '../src/store/nutritionStore';
import { useBodyStore } from '../src/store/bodyStore';
import { analyzeMusclePotential } from '../src/utils/bodyCalculators';
import { saveSetting, getLastWorkoutSummary, LastWorkoutSummary } from '../src/db/database';
import * as Updates from 'expo-updates';
import { readCrashLog, deleteCrashLog, sendCrashReport, initializeSentry } from '../src/services/crashReporterService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LifelogDateHeader } from '../components/LifelogDateHeader';

const { width } = Dimensions.get('window');



export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  // Workout Store
  const isActive = useWorkoutStore(state => state.isActive);
  const workoutTitle = useWorkoutStore(state => state.title);
  const settings = useSettingsStore(state => state.settings);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const featureOrder = useSettingsStore(state => state.settings.featureOrder);
  const featureVisibility = useSettingsStore(state => state.settings.featureVisibility);
  const hasUnsentCrashLog = useWorkoutStore(state => state.hasUnsentCrashLog);

  // Lifelog Store
  const currentDate = useLifelogStore(state => state.currentDate);
  const daySummary = useLifelogStore(state => state.daySummary);
  const isLoadingLifelog = useLifelogStore(state => state.isLoading);
  const setCurrentDate = useLifelogStore(state => state.setCurrentDate);
  const addWater = useLifelogStore(state => state.addWater);
  const addHabitLog = useLifelogStore(state => state.addHabitLog);
  const waterPresets = useLifelogStore(state => state.waterPresets);

  // Nutrition Store
  const mealLogs = useNutritionStore(state => state.mealLogs);
  const userNutritionGoals = useNutritionStore(state => state.userNutritionGoals);
  const loadMealLogs = useNutritionStore(state => state.loadMealLogs);
  const loadGoals = useNutritionStore(state => state.loadGoals);

  // Body Store
  const currentBodyLog = useBodyStore(state => state.currentLog);
  const latestBodyLog = useBodyStore(state => state.latestLog);
  const savedBodyMeasurements = useBodyStore(state => state.savedMeasurements);
  const loadBodyData = useBodyStore(state => state.loadBodyData);

  // Local state for onboarding/modals
  const [isSendingCrash, setIsSendingCrash] = useState(false);
  const [isNewUser, setIsNewUser] = useState(settings.needsStyleSelection);
  const [lastWorkoutSummary, setLastWorkoutSummary] = useState<LastWorkoutSummary | null>(null);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);

  // Date Formatting helper
  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const today = getTodayStr();
      const targetDate = currentDate || today;
      setCurrentDate(targetDate);
      loadMealLogs(targetDate);
      loadGoals();
      loadBodyData(targetDate.replace(/\//g, '-'));

      const fetchSummary = async () => {
        try {
          const summary = await getLastWorkoutSummary();
          if (isMounted) {
            setLastWorkoutSummary(summary);
          }
        } catch (err) {
          console.error('Failed to load last workout summary:', err);
        }
      };

      fetchSummary();
      // 起動直後の初期化タイミングに備えた150ms遅延バックアップ実行
      const timer = setTimeout(fetchSummary, 150);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }, [currentDate])
  );

  // Quick actions
  const handleAddWaterAmount = async (amount: number, caffeine?: number) => {
    const today = currentDate || getTodayStr();
    await addWater(amount, today, caffeine);
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

    useSettingsStore.getState().setDisplayFields({
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
      useSettingsStore.getState().setCrashConsent(consent);

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

  const renderFeatureCard = (id: FeatureId) => {
    switch (id) {
      case 'workout':
        return (
          <TouchableOpacity 
            key="workout"
            style={styles.card} 
            activeOpacity={0.85} 
            onPress={() => router.push('/(tabs)')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
                <Ionicons name="barbell" size={24} color={Theme.colors.primary} />
              </View>
              <Text style={styles.cardTitle}>筋トレ</Text>
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
                  {lastWorkoutSummary ? (
                    <>
                      <View style={[styles.statRow, { marginBottom: 2 }]}>
                        <Text style={[styles.statGoal, { color: Theme.colors.textMuted, fontSize: 14 }]}>
                          直近: <Text style={{ color: Theme.colors.textMuted, fontSize: 14 }}>{lastWorkoutSummary.dateStr}</Text> ({lastWorkoutSummary.title || '筋トレ'})
                        </Text>
                      </View>

                      {lastWorkoutSummary.muscleVolumes.filter(item => item.volumeKg > 0).length > 0 ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                          {lastWorkoutSummary.muscleVolumes.filter(item => item.volumeKg > 0).map((item, idx) => (
                            <View key={idx} style={styles.muscleVolumeBadge}>
                              <Text style={styles.muscleVolumeText}>
                                {item.muscle}: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{item.volumeKg.toLocaleString()} kg</Text>
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.inactiveText}>セット記録なし ({lastWorkoutSummary.totalSets}セット)</Text>
                      )}

                      {Updates.channel !== 'production' && lastWorkoutSummary?.debugInfo && (
                        <View style={{ marginTop: 8 }}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setIsDebugExpanded(prev => !prev)}
                            style={{
                              alignSelf: 'flex-start',
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingVertical: 3,
                              paddingHorizontal: 8,
                              backgroundColor: 'rgba(255, 183, 77, 0.12)',
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: 'rgba(255, 183, 77, 0.3)',
                            }}
                          >
                            <Ionicons name="bug-outline" size={12} color="#ffb74d" />
                            <Text style={{ color: '#ffb74d', fontSize: 10, fontWeight: 'bold' }}>
                              {isDebugExpanded ? 'Debug 閉じる' : 'Debug'}
                            </Text>
                          </TouchableOpacity>

                          {isDebugExpanded && (
                            <View style={{ marginTop: 6, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,183,77,0.2)' }}>
                              <Text style={{ color: '#ffb74d', fontSize: 10 }} numberOfLines={6}>
                                🔍 [Staging Debug] {lastWorkoutSummary.debugInfo}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={styles.inactiveText}>過去のワークアウト記録がありません。タップして筋トレを開始しましょう。</Text>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        );

      case 'body':
        return (
          <TouchableOpacity 
            key="body"
            style={styles.card} 
            activeOpacity={0.85}
            onPress={() => router.push('/lifelog/body')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Ionicons name="body" size={24} color="#38bdf8" />
              </View>
              <Text style={styles.cardTitle}>体組成＆筋肥大限界</Text>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
            </View>

            <View style={styles.cardBody}>
              {(() => {
                const log = currentBodyLog || latestBodyLog;
                const weight = log?.weight ?? null;
                const bodyFatRate = log?.body_fat_rate ?? null;
                const height = log?.height ?? savedBodyMeasurements.height ?? 175;
                const wrist = log?.wrist ?? savedBodyMeasurements.wrist ?? null;
                const ankle = log?.ankle ?? savedBodyMeasurements.ankle ?? null;

                if (!weight && !bodyFatRate) {
                  return (
                    <Text style={styles.inactiveText}>
                      体組成データが未記録です。タップして体重・体脂肪率や骨格限界モデルを診断しましょう。
                    </Text>
                  );
                }

                const lbm = weight && bodyFatRate ? Number((weight * (1 - bodyFatRate / 100)).toFixed(1)) : null;
                const potential = weight && bodyFatRate && height && wrist && ankle
                  ? analyzeMusclePotential(weight, bodyFatRate, height, wrist, ankle)
                  : null;

                return (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statVal}>
                        {weight !== null ? weight.toFixed(1) : '--'}{' '}
                        <Text style={styles.statUnit}>kg</Text>
                      </Text>
                      <Text style={styles.statGoal}>
                        / 体脂肪率: {bodyFatRate !== null ? `${bodyFatRate.toFixed(1)}%` : '--'}
                        {lbm !== null ? ` (LBM ${lbm}kg)` : ''}
                      </Text>
                    </View>

                    {potential ? (
                      <>
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBarBg}>
                            <View 
                              style={[
                                styles.progressBarFill, 
                                { 
                                  width: `${Math.min(100, potential.reachPercentage)}%`,
                                  backgroundColor: '#38bdf8' 
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.progressPercent}>{potential.reachPercentage}%</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#334155' }}>
                          <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                            限界除脂肪: <Text style={{ fontWeight: '700', color: '#a78bfa' }}>{potential.maxLbm}kg</Text>
                          </Text>
                          <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                            増量可能: <Text style={{ fontWeight: '700', color: '#4ade80' }}>+{potential.remainingMuscleGainKg}kg</Text>
                          </Text>
                          <Text style={{ fontSize: 12, color: '#38bdf8', fontWeight: 'bold' }}>
                            {potential.naturalStatusLabel.split(' ')[0]}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                          ※手首・足首サイズを入力すると骨格筋肥大限界（%）が自動診断されます。
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        );

      case 'water':
        return (
          <View key="water" style={styles.card}>
            <TouchableOpacity 
              style={styles.cardHeader}
              activeOpacity={0.7}
              onPress={() => router.push('/lifelog/water')}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}>
                <Ionicons name="water" size={24} color="#00d2ff" />
              </View>
              <Text style={styles.cardTitle}>水分補給</Text>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <View style={styles.cardBody}>
              <View style={styles.statRow}>
                <Text style={styles.statVal}>{daySummary?.water.amount ?? 0} <Text style={styles.statUnit}>ml</Text></Text>
                <Text style={styles.statGoal}>/ {daySummary?.water.goal ?? 2000} ml</Text>
              </View>

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

              <View style={styles.presetsRow}>
                {waterPresets.map((preset, idx) => (
                  <TouchableOpacity 
                    key={idx}
                    style={styles.presetBtn} 
                    onPress={() => handleAddWaterAmount(preset.amount, preset.caffeine)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.presetBtnText}>
                      {preset.caffeine > 0 ? `☕${preset.amount}ml` : `${preset.amount}ml`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 'nutrition':
        return (
          <TouchableOpacity 
            key="nutrition"
            style={styles.card} 
            activeOpacity={0.85}
            onPress={() => router.push('/lifelog/nutrition')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="restaurant" size={24} color="#10b981" />
              </View>
              <Text style={styles.cardTitle}>栄養＆食事管理</Text>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
            </View>
            <View style={styles.cardBody}>
              {(() => {
                const logs = mealLogs || [];
                const goalCal = userNutritionGoals?.calories || 2000;
                const totalCal = logs.reduce((acc, curr) => acc + (curr.calories || 0), 0);
                const totalP = logs.reduce((acc, curr) => acc + (curr.protein || 0), 0);
                const totalF = logs.reduce((acc, curr) => acc + (curr.fat || 0), 0);
                const totalC = logs.reduce((acc, curr) => acc + (curr.carbs || 0), 0);
                const calPercent = Math.min(100, Math.round((totalCal / goalCal) * 100));

                return (
                  <>
                    <View style={styles.statRow}>
                      <Text style={styles.statVal}>{Math.round(totalCal)} <Text style={styles.statUnit}>kcal</Text></Text>
                      <Text style={styles.statGoal}>/ {goalCal} kcal ({logs.length}件)</Text>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${calPercent}%`,
                              backgroundColor: '#10b981' 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressPercent}>{calPercent}%</Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' }}>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>P: <Text style={{ fontWeight: '700', color: '#06b6d4' }}>{totalP.toFixed(1)}g</Text></Text>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>F: <Text style={{ fontWeight: '700', color: '#f59e0b' }}>{totalF.toFixed(1)}g</Text></Text>
                      <Text style={{ fontSize: 13, color: '#94a3b8' }}>C: <Text style={{ fontWeight: '700', color: '#a855f7' }}>{totalC.toFixed(1)}g</Text></Text>
                    </View>
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        );

      case 'zikan':
        return (
          <TouchableOpacity 
            key="zikan"
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
        );

      case 'habit':
        return (
          <View key="habit" style={styles.card}>
            <TouchableOpacity 
              style={styles.cardHeader}
              activeOpacity={0.7}
              onPress={() => router.push('/lifelog/habit')}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(233, 30, 99, 0.15)' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#e91e63" />
              </View>
              <Text style={styles.cardTitle}>習慣カウンター</Text>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>

            <View style={styles.cardBody}>
              {daySummary?.habits && daySummary.habits.length > 0 ? (
                <View style={styles.habitList}>
                  {daySummary.habits.slice(0, 3).map((habit) => (
                    <View key={habit.id} style={styles.habitRow}>
                      <TouchableOpacity
                        style={styles.habitMainClickArea}
                        onPress={() => router.push('/lifelog/habit')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.habitInfo}>
                          <View style={[styles.habitColorDot, { backgroundColor: habit.color || '#fff' }]} />
                          <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                        </View>
                        <Text style={styles.habitCount}>{habit.count} 回</Text>
                      </TouchableOpacity>
                      <View style={styles.habitActionContainer}>
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
          </View>
        );

      case 'routine':
        return (
          <TouchableOpacity 
            key="routine"
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
              <View style={styles.routineSummaryRow}>
                <Ionicons name="checkmark-done-circle-outline" size={20} color="#4caf50" style={{ marginRight: 6 }} />
                <Text style={styles.routineSummaryText}>
                  完了したルーティン:
                </Text>
              </View>
              {daySummary?.completedRoutineNames && daySummary.completedRoutineNames.length > 0 ? (
                <View style={{ marginTop: 8, paddingLeft: 26 }}>
                  {daySummary.completedRoutineNames.map((name, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="checkmark" size={14} color="#4caf50" style={{ marginRight: 6 }} />
                      <Text style={{ color: Theme.colors.text, fontSize: 15 }}>{name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ marginTop: 8, paddingLeft: 26 }}>
                  <Text style={{ color: Theme.colors.textMuted, fontSize: 14 }}>なし</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );

      case 'voice_ai':
        return (
          <TouchableOpacity
            key="voice_ai"
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push('/lifelog/voice-assistant')}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(100, 180, 255, 0.15)' }]}>
                <Ionicons name="mic" size={24} color="#64b4ff" />
              </View>
              <Text style={styles.cardTitle}>音声AIアシスタント</Text>
              <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.inactiveText}>
                話すだけでトレーニング・食事・水分を記録。Gemini Live API による音声リアルタイム対話。
              </Text>
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      {/* Date Switcher Header */}
      <LifelogDateHeader style={{ paddingTop: insets.top + 16, paddingBottom: 16 }} type="workout" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Loading Indicator */}
        {isLoadingLifelog && (
          <ActivityIndicator size="small" color={Theme.colors.primary} style={{ marginBottom: 12 }} />
        )}

        {/* Dynamic Feature Cards List */}
        {(() => {
          const activeOrder: FeatureId[] = featureOrder && featureOrder.length > 0 
            ? featureOrder 
            : ['workout', 'body', 'water', 'nutrition', 'zikan', 'routine', 'habit', 'voice_ai'];
          const visibleFeatures = activeOrder.filter((id: FeatureId) =>
            featureVisibility ? featureVisibility[id] !== false : true
          );

          if (visibleFeatures.length === 0) {
            return (
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 36 }]}>
                <Ionicons name="options-outline" size={44} color={Theme.colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={{ color: Theme.colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  表示される機能が選択されていません。{'\n'}
                  アプリ設定 ➔「機能管理」から表示する機能を選択してください。
                </Text>
              </View>
            );
          }

          return visibleFeatures.map((id) => renderFeatureCard(id as FeatureId));
        })()}

        {/* App Settings Access Card */}
        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(79, 172, 254, 0.15)' }]}>
              <Ionicons name="settings-outline" size={24} color="#4facfe" />
            </View>
            <Text style={styles.cardTitle}>アプリ設定</Text>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.inactiveText}>
              Gemini AI連携、データ出力・共有、バックアップ、機能管理などを操作できます。
            </Text>
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
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    gap: 6,
  },
  inactiveText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 24,
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
    marginBottom: 4,
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
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBtn: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  habitMainClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 12,
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
    borderRadius: 20,
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
  muscleVolumeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  muscleVolumeText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
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
