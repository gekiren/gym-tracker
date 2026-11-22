import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  InteractionManager,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getExerciseById,
  getExerciseHistory,
  getExerciseHistoryPaginated,
  getExerciseHistoryCount,
  getExerciseChartSummary,
  getExerciseAvailableStances,
  getPersonalRecords,
  getExerciseDetailCache,
  setExerciseDetailCache,
  patchExerciseDetailCache,
  ExerciseChartSummaryRow,
  ExerciseHistoryEntry,
} from '../../src/db/database';
import { useAppTheme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateMuscleGroup, translateEquipment, translateStance } from '../../src/i18n';
import { openYouTubeSearch } from '../../src/utils/youtubeUtils';
import { AI_CONFIG } from '../../src/config/aiConfig';
import { format } from 'date-fns';
import { PersonalRecordsList } from '../../components/active-workout/PersonalRecordsList';
import { HistoryCalendarModal } from '../../components/active-workout/HistoryCalendarModal';

// Subcomponents
import { StanceManagement } from '../../components/exercise-detail/StanceManagement';
import { RestTimerManagement } from '../../components/exercise-detail/RestTimerManagement';
import { WeightStepManagement } from '../../components/exercise-detail/WeightStepManagement';
import { ExerciseCharts } from '../../components/exercise-detail/ExerciseCharts';
import { isTreadmillExercise } from '../../src/utils/exerciseUtils';
import { calculateRM } from '../../src/utils/workoutStats';

const INITIAL_PAGE_SIZE = 10;
const LOAD_MORE_PAGE_SIZE = 20;

const formatSetDuration = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
};

interface ExerciseHistoryCardProps {
  item: ExerciseHistoryEntry;
  isHighlighted: boolean;
  isTreadmill: boolean;
  weightUnit: string;
  show1RM: boolean;
  formattedDate: string;
  t: (key: string, options?: any) => string;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useAppTheme>['colors'];
  spacing: ReturnType<typeof useAppTheme>['spacing'];
  onCardLayout: (workoutId: number, y: number) => void;
}

const ExerciseHistoryCard = memo(({
  item,
  isHighlighted,
  isTreadmill,
  weightUnit,
  show1RM,
  formattedDate,
  t,
  styles,
  colors,
  spacing,
  onCardLayout,
}: ExerciseHistoryCardProps) => {
  const dailyVolume = useMemo(() => {
    return item.sets.reduce((sum: number, s: any) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.reps, 10) || 0;
      return sum + (w * r);
    }, 0);
  }, [item.sets]);

  return (
    <View
      style={[
        styles.historyCard,
        { marginHorizontal: spacing.md },
        isHighlighted && { borderColor: colors.primary, borderWidth: 2 },
      ]}
      onLayout={(e) => onCardLayout(item.workout_id, e.nativeEvent.layout.y)}
    >
      <View style={styles.historyCardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.historyDate}>{formattedDate}</Text>
        </View>
        {dailyVolume > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('ui.history.volume_label')}: </Text>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold' }}>
              {dailyVolume} {weightUnit}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.thSet}>{t('ui.exercise_detail.table_header_set')}</Text>
        <Text style={styles.thVal}>{t('ui.exercise_detail.table_header_record')}</Text>
      </View>

      {item.sets.map((s: any, idx: number) => {
        let timeStr = '';
        if (s.work_seconds != null && s.work_seconds > 0) timeStr += `⏱️ ${formatSetDuration(s.work_seconds)} `;
        if (s.rest_seconds != null && s.rest_seconds > 0) timeStr += `☕ ${formatSetDuration(s.rest_seconds)}`;
        timeStr = timeStr.trim();

        const parsedWeight = parseFloat(s.weight);
        const parsedReps = parseInt(s.reps, 10);
        const oneRm = !isTreadmill && !isNaN(parsedWeight) && !isNaN(parsedReps) && parsedWeight > 0 && parsedReps > 0
          ? calculateRM(parsedWeight, parsedReps)
          : null;
        const stanceText = s.stance || s.variation;
        const hasMetaRow = Boolean(stanceText || timeStr);

        return (
          <View key={idx} style={styles.setItemContainer}>
            <View style={styles.setRow}>
              <Text style={styles.tdSet}>{s.set_number}</Text>
              <View style={styles.setMainContent}>
                {isTreadmill ? (
                  <Text style={styles.tdValText} numberOfLines={1}>
                    {s.speed != null ? `${s.speed} km/h` : '-'}
                    {s.incline != null ? ` (傾斜 ${s.incline}%)` : ''}
                  </Text>
                ) : (
                  <>
                    <Text style={styles.tdValText} numberOfLines={1}>
                      {s.weight ? `${s.weight} ${weightUnit}` : '-'} × {s.reps ? `${s.reps}${t('ui.common.reps_unit')}` : '-'}
                    </Text>
                    {show1RM && oneRm != null && (
                      <View style={styles.oneRmBadge}>
                        <Text style={styles.oneRmText}>1RM: {oneRm}{weightUnit}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
              {!isTreadmill && s.rpe ? <Text style={styles.tdRpe}>@RPE {s.rpe}</Text> : null}
            </View>
            {hasMetaRow && (
              <View style={styles.setMetaRow}>
                {stanceText ? (
                  <View style={styles.historyVariationBadge}>
                    <Text style={styles.historyVariationText} numberOfLines={1} ellipsizeMode="tail">
                      {translateStance(stanceText)}
                    </Text>
                  </View>
                ) : (
                  <View />
                )}
                {timeStr ? (
                  <Text style={styles.setTimeText}>{timeStr}</Text>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
});

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const parsedId = useMemo(() => (id ? parseInt(id, 10) : NaN), [id]);

  const [exercise, setExercise] = useState<any>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [totalHistoryCount, setTotalHistoryCount] = useState<number>(0);
  const [personalRecords, setPersonalRecords] = useState<Record<string, Record<number, number>>>({});
  const [chartSummary, setChartSummary] = useState<ExerciseChartSummaryRow[]>([]);
  const [availableStances, setAvailableStances] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const settings = useSettingsStore(state => state.settings);
  const addCustomStance = useSettingsStore(state => state.addCustomStance);
  const removeCustomStance = useSettingsStore(state => state.removeCustomStance);
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);

  const [chartScale, setChartScale] = useState<'day' | 'week' | 'month'>('day');
  const [selectedChartReps, setSelectedChartReps] = useState<number | null>(null);
  const [selectedChartVariation, setSelectedChartVariation] = useState<string | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);

  // Calendar States
  const cardOffsets = useRef<{ [key: number]: number }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedWorkoutId, setHighlightedWorkoutId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (scrollRetryTimerRef.current) clearTimeout(scrollRetryTimerRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    if (isNaN(parsedId)) {
      Alert.alert(t('ui.common.error') || 'Error', 'Invalid Exercise ID');
      router.back();
      return;
    }

    cardOffsets.current = {};
    let isMounted = true;
    let interactionHandle: ReturnType<typeof InteractionManager.runAfterInteractions> | null = null;

    const cached = getExerciseDetailCache(parsedId);
    if (cached) {
      setExercise(cached.exercise);
      setPersonalRecords(cached.personalRecords || {});
      setHistory(cached.initialHistory || []);
      setTotalHistoryCount(cached.totalHistoryCount ?? 0);
      setIsLoading(false);

      if (cached.chartSummaryByStance?.all !== undefined && cached.availableStances !== undefined) {
        setChartSummary(cached.chartSummaryByStance.all);
        setAvailableStances(cached.availableStances);
        setIsChartLoading(false);
        return;
      }

      setIsChartLoading(true);
      interactionHandle = InteractionManager.runAfterInteractions(async () => {
        try {
          const [summaryRows, stances] = await Promise.all([
            getExerciseChartSummary(parsedId, 'all'),
            getExerciseAvailableStances(parsedId),
          ]);
          if (!isMounted) return;
          setChartSummary(summaryRows || []);
          setAvailableStances(stances || []);
          setIsChartLoading(false);
          patchExerciseDetailCache(parsedId, {
            availableStances: stances || [],
            chartSummaryByStance: { all: summaryRows || [] },
          });
        } catch (e) {
          console.error('Failed to fetch chart summary:', e);
          if (isMounted) setIsChartLoading(false);
        }
      });

      return () => {
        isMounted = false;
        interactionHandle?.cancel?.();
      };
    }

    setIsLoading(true);
    setIsChartLoading(true);

    const fetchDetails = async () => {
      try {
        const [exItem, prData, initialHist, totalCount] = await Promise.all([
          getExerciseById(parsedId),
          getPersonalRecords(parsedId),
          getExerciseHistoryPaginated(parsedId, INITIAL_PAGE_SIZE, 0),
          getExerciseHistoryCount(parsedId),
        ]);

        if (!isMounted) return;

        setExercise(exItem);
        setPersonalRecords(prData || {});
        setHistory(initialHist || []);
        setTotalHistoryCount(totalCount ?? 0);
        setIsLoading(false);

        if (!exItem) {
          setIsChartLoading(false);
          return;
        }

        setExerciseDetailCache(parsedId, {
          exercise: exItem,
          personalRecords: prData || {},
          initialHistory: initialHist || [],
          totalHistoryCount: totalCount ?? 0,
          updatedAt: Date.now(),
        });

        interactionHandle = InteractionManager.runAfterInteractions(async () => {
          try {
            const [summaryRows, stances] = await Promise.all([
              getExerciseChartSummary(parsedId, 'all'),
              getExerciseAvailableStances(parsedId),
            ]);
            if (!isMounted) return;
            setChartSummary(summaryRows || []);
            setAvailableStances(stances || []);
            setIsChartLoading(false);
            patchExerciseDetailCache(parsedId, {
              availableStances: stances || [],
              chartSummaryByStance: { all: summaryRows || [] },
            });
          } catch (chartErr) {
            console.error('Failed to fetch chart summary:', chartErr);
            if (isMounted) setIsChartLoading(false);
          }
        });
      } catch (e) {
        console.error('Failed to fetch exercise details:', e);
        if (isMounted) {
          setIsLoading(false);
          setIsChartLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
      interactionHandle?.cancel?.();
    };
  }, [id, parsedId]);

  const formatDate = useCallback((isoString: string) => {
    const isJa = i18n.language === 'ja';
    return format(new Date(isoString), isJa ? 'yyyy/MM/dd' : 'MMM d, yyyy');
  }, [i18n.language]);

  const handleCardLayout = useCallback((workoutId: number, y: number) => {
    cardOffsets.current[workoutId] = y;
  }, []);

  const ensureFullHistory = useCallback(async (): Promise<ExerciseHistoryEntry[]> => {
    if (isNaN(parsedId) || history.length >= totalHistoryCount) {
      return history;
    }
    const allItems = await getExerciseHistory(parsedId);
    setHistory(allItems);
    return allItems;
  }, [parsedId, history, totalHistoryCount]);

  const handleLoadMore = useCallback(async () => {
    if (isNaN(parsedId) || isLoadingMore || history.length >= totalHistoryCount) return;
    setIsLoadingMore(true);
    try {
      const nextItems = await getExerciseHistoryPaginated(parsedId, LOAD_MORE_PAGE_SIZE, history.length);
      setHistory(prev => {
        const existingIds = new Set(prev.map(p => p.workout_id));
        const filtered = nextItems.filter(n => !existingIds.has(n.workout_id));
        return [...prev, ...filtered];
      });
    } catch (e) {
      console.error('Failed to load more exercise history:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [parsedId, isLoadingMore, history.length, totalHistoryCount]);

  const handleShowAll = useCallback(async () => {
    if (isNaN(parsedId) || isLoadingMore || history.length >= totalHistoryCount) return;
    setIsLoadingMore(true);
    try {
      const allItems = await getExerciseHistory(parsedId);
      setHistory(allItems);
    } catch (e) {
      console.error('Failed to load all exercise history:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [parsedId, isLoadingMore, history.length, totalHistoryCount]);

  const handleAICoachExerciseDetail = async () => {
    if (!exercise || (history.length === 0 && totalHistoryCount === 0)) {
      Alert.alert(t('ui.common.info') || '情報', '履歴データがまだありません。まずはこの種目のトレーニングを記録してください。');
      return;
    }

    const fullHistory = await ensureFullHistory();
    if (fullHistory.length === 0) {
      Alert.alert(t('ui.common.info') || '情報', '履歴データがまだありません。まずはこの種目のトレーニングを記録してください。');
      return;
    }

    let contextStr = `【種目名: ${exercise.name} の過去の全トレーニング履歴】\n`;
    contextStr += `分類: ${translateMuscleGroup(exercise.muscle_group)} / 器具: ${translateEquipment(exercise.equipment)}\n`;

    fullHistory.forEach(workout => {
      const dateStr = formatDate(workout.start_time);
      contextStr += `- ${dateStr}: `;
      const setDescs = workout.sets.map((s: any) => {
        let sd = `${s.weight ?? 0}${settings.weightUnit} x ${s.reps ?? 0}回`;
        if (s.side) sd = `[${s.side === 'L' ? '左' : '右'}] ` + sd;
        if (s.stance || s.variation) sd += ` (${translateStance(s.stance || s.variation)})`;
        if (s.rpe) sd += ` (RPE: ${s.rpe})`;
        return sd;
      });
      contextStr += setDescs.join(', ') + '\n';
    });

    router.push({
      pathname: '/(tabs)/coach',
      params: {
        contextPrompt: contextStr,
        prefillMessage: t('ui.coach.prefill_exercise_history', { name: translateExercise(exercise.name) }),
        title: translateExercise(exercise.name)
      }
    });
  };

  const handleExportMarkdown = async () => {
    if (!exercise || (history.length === 0 && totalHistoryCount === 0)) return;

    const fullHistory = await ensureFullHistory();
    if (fullHistory.length === 0) return;

    let md = t('ui.exercise_detail.export_md_header', { name: translateExercise(exercise.name) });
    md += t('ui.exercise_detail.export_md_table_header');

    fullHistory.forEach(item => {
      const dateStr = formatDate(item.start_time);
      item.sets.forEach((s: any) => {
        let timeStr = '';
        if (s.work_seconds != null && s.work_seconds > 0) timeStr += `${formatSetDuration(s.work_seconds)}`;
        if (s.rest_seconds != null && s.rest_seconds > 0) timeStr += `${timeStr ? ' / ' : ''}rest ${formatSetDuration(s.rest_seconds)}`;
        if (!timeStr) timeStr = '-';
        const stanceVal = (s.stance || s.variation) ? translateStance(s.stance || s.variation) : '-';
        md += `| ${dateStr} | ${s.set_number} | ${stanceVal} | ${s.weight ? s.weight + settings.weightUnit : '-'} | ${s.reps ? s.reps + t('ui.common.reps_unit') : '-'} | ${s.rpe || '-'} | ${timeStr} |\n`;
      });
    });

    await Clipboard.setStringAsync(md);
    Alert.alert(t('ui.exercise_detail.copy_success_title'), t('ui.exercise_detail.copy_success_message'));
  };

  const scrollToWorkoutCard = useCallback((workoutId: number, attempt: number = 0) => {
    if (scrollRetryTimerRef.current) {
      clearTimeout(scrollRetryTimerRef.current);
      scrollRetryTimerRef.current = null;
    }

    const yOffset = cardOffsets.current[workoutId];
    if (yOffset !== undefined) {
      const scrollTarget = Math.max(0, yOffset - 20);
      scrollViewRef.current?.scrollTo({ y: scrollTarget, animated: true });
      setHighlightedWorkoutId(workoutId);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedWorkoutId(null);
      }, 1500);
      return;
    }

    if (attempt < 10) {
      scrollRetryTimerRef.current = setTimeout(() => {
        scrollToWorkoutCard(workoutId, attempt + 1);
      }, 100);
    }
  }, []);

  const handleDatePress = async (dateStr: string) => {
    setCalendarVisible(false);

    let targetHistory = history.find(item => {
      const wDate = format(new Date(item.start_time), 'yyyy-MM-dd');
      return wDate === dateStr;
    });

    if (!targetHistory && history.length < totalHistoryCount) {
      setIsLoadingMore(true);
      try {
        const allItems = await ensureFullHistory();
        targetHistory = allItems.find(item => {
          const wDate = format(new Date(item.start_time), 'yyyy-MM-dd');
          return wDate === dateStr;
        });
      } catch (e) {
        console.error('Failed to load history for date jump:', e);
      } finally {
        setIsLoadingMore(false);
      }
    }

    if (targetHistory) {
      const targetWorkoutId = targetHistory.workout_id;
      scrollRetryTimerRef.current = setTimeout(() => {
        scrollToWorkoutCard(targetWorkoutId);
      }, 150);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textMuted }}>{t('ui.exercise_detail.not_found')}</Text>
      </View>
    );
  }

  const isTreadmill = isTreadmillExercise(exercise.name);
  const show1RM = settings.displayFields?.show1RM !== false;
  const hasAnyHistory = totalHistoryCount > 0 || history.length > 0;
  const remainingCount = Math.max(0, totalHistoryCount - history.length);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t('ui.exercise_detail.title'),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerRight: () => AI_CONFIG.status === 'active' ? (
            <TouchableOpacity onPress={handleAICoachExerciseDetail} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
              <Ionicons name="sparkles" size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : null
        }}
      />
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Exercise Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{translateExercise(exercise.name)}</Text>
            <TouchableOpacity
              style={styles.howToBtn}
              onPress={() => openYouTubeSearch(exercise.name)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="play" size={12} color={colors.primary} />
              <Text style={styles.howToText}>How To</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.badges}>
            <View style={styles.badge}><Text style={styles.badgeText}>{translateMuscleGroup(exercise.muscle_group)}</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>{translateEquipment(exercise.equipment)}</Text></View>
          </View>
        </View>

        {/* Stance Management Section */}
        <StanceManagement
          exercise={exercise}
          setExercise={setExercise}
          settings={settings}
          addCustomStance={addCustomStance}
          removeCustomStance={removeCustomStance}
          t={t}
        />

        {/* Rest Timer Management Section */}
        <RestTimerManagement
          exercise={exercise}
          setExercise={setExercise}
          settings={settings}
          t={t}
        />

        {/* Weight Step Management Section */}
        {exercise.muscle_group !== '有酸素' && (
          <WeightStepManagement
            exercise={exercise}
            setExercise={setExercise}
            settings={settings}
            t={t}
          />
        )}

        {/* PR Section */}
        <PersonalRecordsList
          personalRecords={personalRecords}
          weightUnit={settings.weightUnit}
          onPrPress={(reps, variation) => {
            setSelectedChartReps(reps);
            setSelectedChartVariation(variation);
            setShowChartModal(true);
          }}
        />

        {/* Volume Charts and PR progression charts */}
        <ExerciseCharts
          exerciseId={parsedId}
          chartSummary={chartSummary}
          availableStances={availableStances}
          isLoadingChart={isChartLoading}
          settings={settings}
          chartScale={chartScale}
          setChartScale={setChartScale}
          setCalendarVisible={setCalendarVisible}
          selectedChartReps={selectedChartReps}
          setSelectedChartReps={setSelectedChartReps}
          selectedChartVariation={selectedChartVariation}
          setSelectedChartVariation={setSelectedChartVariation}
          showChartModal={showChartModal}
          setShowChartModal={setShowChartModal}
          t={t}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('ui.exercise_detail.section_history')}</Text>
          {hasAnyHistory && (
            <TouchableOpacity
              onPress={handleExportMarkdown}
              style={styles.exportBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="copy-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.exportBtnText}>{t('ui.exercise_detail.copy_md_btn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {!hasAnyHistory ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>{t('ui.exercise_detail.empty_history')}</Text>
            <Text style={styles.emptySubtext}>{t('ui.exercise_detail.empty_history_sub')}</Text>
          </View>
        ) : (
          <>
            {history.map(item => (
              <ExerciseHistoryCard
                key={item.workout_id}
                item={item}
                isHighlighted={item.workout_id === highlightedWorkoutId}
                isTreadmill={isTreadmill}
                weightUnit={settings.weightUnit}
                show1RM={show1RM}
                formattedDate={formatDate(item.start_time)}
                t={t}
                styles={styles}
                colors={colors}
                spacing={spacing}
                onCardLayout={handleCardLayout}
              />
            ))}

            {/* Load More Controls for high data volume */}
            {remainingCount > 0 && (
              <View style={styles.loadMoreContainer}>
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={handleLoadMore}
                  disabled={isLoadingMore}
                  activeOpacity={0.7}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="chevron-down-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.loadMoreText}>
                        {t('ui.exercise_detail.load_more_history', { count: remainingCount })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {remainingCount > LOAD_MORE_PAGE_SIZE && (
                  <TouchableOpacity
                    style={styles.showAllBtn}
                    onPress={handleShowAll}
                    disabled={isLoadingMore}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showAllText}>
                      {t('ui.exercise_detail.show_all_history', { count: totalHistoryCount })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      {isCalendarVisible && !isNaN(parsedId) && (
        <HistoryCalendarModal
          visible={isCalendarVisible}
          exerciseId={parsedId}
          currentMonth={currentMonth}
          weightUnit={settings.weightUnit}
          onClose={() => setCalendarVisible(false)}
          onNavigateMonth={(offset) => {
            setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
          }}
          onDatePress={handleDatePress}
        />
      )}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  spacing: ReturnType<typeof useAppTheme>['spacing']
) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, flexShrink: 1 },
  howToBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 10, paddingVertical: 6, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.25)' },
  howToText: { color: colors.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
  sectionHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 16, marginTop: 12, fontWeight: 'bold' },
  emptySubtext: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  historyCard: { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  historyCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 8 },
  historyDate: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', marginBottom: 4 },
  thSet: { width: 40, color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  thVal: { flex: 1, color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  setItemContainer: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  setRow: { flexDirection: 'row', alignItems: 'center' },
  tdSet: { width: 40, color: colors.text, fontSize: 15, fontWeight: '600' },
  setMainContent: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  tdVal: { flex: 1, color: colors.text, fontSize: 15 },
  tdValText: { color: colors.text, fontSize: 15, fontWeight: '500', flexShrink: 1 },
  oneRmBadge: {
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 166, 35, 0.25)',
    flexShrink: 0,
  },
  oneRmText: {
    color: '#f5a623',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tdRpe: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginLeft: 8, flexShrink: 0 },
  setMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 40, marginTop: 4, gap: 8 },
  setTimeText: { fontSize: 12, color: colors.textMuted, flexShrink: 0 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 10, paddingVertical: 6, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.25)' },
  exportBtnText: { color: colors.primary, fontSize: 12, fontWeight: 'bold' },
  historyVariationBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, flexShrink: 1 },
  historyVariationText: { color: colors.text, fontSize: 12, fontWeight: 'bold' },
  loadMoreContainer: { marginHorizontal: spacing.md, marginVertical: spacing.md, alignItems: 'center', gap: 10 },
  loadMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(79, 172, 254, 0.12)', borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)', borderRadius: 12, minHeight: 48, paddingVertical: 12, paddingHorizontal: 20, width: '100%' },
  loadMoreText: { color: colors.primary, fontSize: 14, fontWeight: 'bold' },
  showAllBtn: { minHeight: 40, justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  showAllText: { color: colors.textMuted, fontSize: 13, textDecorationLine: 'underline' },
});
