import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getExerciseById, getExerciseHistory, getPersonalRecords } from '../../src/db/database';
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

const INITIAL_PAGE_SIZE = 20;

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [personalRecords, setPersonalRecords] = useState<Record<string, Record<number, number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(INITIAL_PAGE_SIZE);
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
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedWorkoutId, setHighlightedWorkoutId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      Alert.alert(t('ui.common.error') || 'Error', 'Invalid Exercise ID');
      router.back();
      return;
    }

    let isMounted = true;
    const fetchDetails = async () => {
      try {
        const [exItem, histData, prData] = await Promise.all([
          getExerciseById(parsedId),
          getExerciseHistory(parsedId),
          getPersonalRecords(parsedId)
        ]);

        if (isMounted) {
          setExercise(exItem);
          setHistory(histData || []);
          setPersonalRecords(prData || {});
        }
      } catch (e) {
        console.error('Failed to fetch exercise details:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const formatDate = (isoString: string) => {
    const isJa = i18n.language === 'ja';
    return format(new Date(isoString), isJa ? 'yyyy/MM/dd' : 'MMM d, yyyy');
  };

  const handleAICoachExerciseDetail = () => {
    if (!exercise || history.length === 0) {
      Alert.alert(t('ui.common.info') || '情報', '履歴データがまだありません。まずはこの種目のトレーニングを記録してください。');
      return;
    }

    let contextStr = `【種目名: ${exercise.name} の過去の全トレーニング履歴】\n`;
    contextStr += `分類: ${translateMuscleGroup(exercise.muscle_group)} / 器具: ${translateEquipment(exercise.equipment)}\n`;
    
    history.forEach(workout => {
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
    if (history.length === 0) return;

    let md = t('ui.exercise_detail.export_md_header', { name: translateExercise(exercise.name) });
    md += t('ui.exercise_detail.export_md_table_header');

    history.forEach(item => {
      const dateStr = formatDate(item.start_time);
      item.sets.forEach((s: any) => {
        let timeStr = '';
        const fmtTime = (secs: number) => {
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
        };
        if (s.work_seconds != null && s.work_seconds > 0) timeStr += `${fmtTime(s.work_seconds)}`;
        if (s.rest_seconds != null && s.rest_seconds > 0) timeStr += `${timeStr?' / ':''}rest ${fmtTime(s.rest_seconds)}`;
        if (!timeStr) timeStr = '-';
        const stanceVal = (s.stance || s.variation) ? translateStance(s.stance || s.variation) : '-';
        md += `| ${dateStr} | ${s.set_number} | ${stanceVal} | ${s.weight ? s.weight + settings.weightUnit : '-'} | ${s.reps ? s.reps + t('ui.common.reps_unit') : '-'} | ${s.rpe || '-'} | ${timeStr} |\n`;
      });
    });

    await Clipboard.setStringAsync(md);
    Alert.alert(t('ui.exercise_detail.copy_success_title'), t('ui.exercise_detail.copy_success_message'));
  };

  const handleDatePress = (dateStr: string) => {
    const targetIndex = history.findIndex(item => {
      const wDate = format(new Date(item.start_time), 'yyyy-MM-dd');
      return wDate === dateStr;
    });

    if (targetIndex !== -1) {
      const targetHistory = history[targetIndex];
      setCalendarVisible(false);

      // 表示上限を超えている場合は、該当カードが表示されるように上限を拡張
      if (targetIndex >= displayLimit) {
        setDisplayLimit(Math.max(displayLimit, targetIndex + 10));
      }

      setTimeout(() => {
        const yOffset = cardOffsets.current[targetHistory.workout_id];
        if (yOffset !== undefined) {
          const scrollTarget = Math.max(0, yOffset - 20);
          scrollViewRef.current?.scrollTo({ y: scrollTarget, animated: true });
          setHighlightedWorkoutId(targetHistory.workout_id);
          setTimeout(() => {
            setHighlightedWorkoutId(null);
          }, 1500);
        }
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
          history={history}
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
          {history.length > 0 && (
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

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>{t('ui.exercise_detail.empty_history')}</Text>
            <Text style={styles.emptySubtext}>{t('ui.exercise_detail.empty_history_sub')}</Text>
          </View>
        ) : (
          <>
            {history.slice(0, displayLimit).map(item => {
              const dailyVolume = item.sets.reduce((sum: number, s: any) => {
                const w = parseFloat(s.weight) || 0;
                const r = parseInt(s.reps, 10) || 0;
                return sum + (w * r);
              }, 0);

              return (
                <View 
                  key={item.workout_id} 
                  style={[
                    styles.historyCard, 
                    { marginHorizontal: spacing.md },
                    item.workout_id === highlightedWorkoutId && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onLayout={(e) => {
                    cardOffsets.current[item.workout_id] = e.nativeEvent.layout.y;
                  }}
                >
                  <View style={styles.historyCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                      <Text style={styles.historyDate}>{formatDate(item.start_time)}</Text>
                    </View>
                    {dailyVolume > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('ui.history.volume_label')}: </Text>
                        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: 'bold' }}>{dailyVolume} {settings.weightUnit}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.tableHeader}>
                    <Text style={styles.thSet}>{t('ui.exercise_detail.table_header_set')}</Text>
                    <Text style={styles.thVal}>{t('ui.exercise_detail.table_header_record')}</Text>
                  </View>
                  
                  {item.sets.map((s: any, idx: number) => {
                    let timeStr = '';
                    const fmtTime = (secs: number) => {
                      const m = Math.floor(secs / 60);
                      const s = secs % 60;
                      return m > 0 ? `${m}m${s.toString().padStart(2, '0')}s` : `${s}s`;
                    };
                    if (s.work_seconds != null && s.work_seconds > 0) timeStr += `⏱️ ${fmtTime(s.work_seconds)} `;
                    if (s.rest_seconds != null && s.rest_seconds > 0) timeStr += `☕ ${fmtTime(s.rest_seconds)}`;
                    timeStr = timeStr.trim();
                    const isTreadmill = isTreadmillExercise(exercise?.name);
                    const parsedWeight = parseFloat(s.weight);
                    const parsedReps = parseInt(s.reps, 10);
                    const oneRm = !isTreadmill && !isNaN(parsedWeight) && !isNaN(parsedReps) && parsedWeight > 0 && parsedReps > 0
                      ? calculateRM(parsedWeight, parsedReps)
                      : null;
                    const show1RM = settings.displayFields?.show1RM !== false;
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
                                  {s.weight ? `${s.weight} ${settings.weightUnit}` : '-'} × {s.reps ? `${s.reps}${t('ui.common.reps_unit')}` : '-'}
                                </Text>
                                {show1RM && oneRm != null && (
                                  <View style={styles.oneRmBadge}>
                                    <Text style={styles.oneRmText}>1RM: {oneRm}{settings.weightUnit}</Text>
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
            })}

            {/* Load More Controls for high data volume */}
            {history.length > displayLimit && (
              <View style={styles.loadMoreContainer}>
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={() => setDisplayLimit(prev => Math.min(history.length, prev + 20))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-down-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.loadMoreText}>
                    {t('ui.exercise_detail.load_more_history', { count: history.length - displayLimit })}
                  </Text>
                </TouchableOpacity>
                {history.length - displayLimit > 20 && (
                  <TouchableOpacity
                    style={styles.showAllBtn}
                    onPress={() => setDisplayLimit(history.length)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.showAllText}>
                      {t('ui.exercise_detail.show_all_history', { count: history.length })}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <HistoryCalendarModal
        visible={isCalendarVisible}
        currentMonth={currentMonth}
        history={history}
        weightUnit={settings.weightUnit}
        onClose={() => setCalendarVisible(false)}
        onNavigateMonth={(offset) => {
          setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
        }}
        onDatePress={handleDatePress}
      />
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
