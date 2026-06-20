import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getExerciseById, getExerciseHistory, getPersonalRecords } from '../../src/db/database';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateMuscleGroup, translateEquipment, translateStance } from '../../src/i18n';
import { openYouTubeSearch } from '../../src/utils/youtubeUtils';
import { AI_CONFIG } from '../../src/config/aiConfig';
import { format } from 'date-fns';
import { PersonalRecordsList } from '../../components/active-workout/PersonalRecordsList';
import { HistoryCalendarModal } from '../../components/active-workout/HistoryCalendarModal';

// Subcomponents
import { StanceManagement } from '../../components/exercise-detail/StanceManagement';
import { ExerciseCharts } from '../../components/exercise-detail/ExerciseCharts';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [personalRecords, setPersonalRecords] = useState<Record<string, Record<number, number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const settings = useWorkoutStore(state => state.settings);
  const addCustomStance = useWorkoutStore(state => state.addCustomStance);
  const removeCustomStance = useWorkoutStore(state => state.removeCustomStance);
  const { t } = useTranslation();
  
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
    const fetchDetails = async () => {
      try {
        const exItem = await getExerciseById(parsedId);
        setExercise(exItem);
        const histData = await getExerciseHistory(parsedId);
        setHistory(histData);
        const prData = await getPersonalRecords(parsedId);
        setPersonalRecords(prData);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
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
        if (s.work_seconds != null) timeStr += `${fmtTime(s.work_seconds)}`;
        if (s.rest_seconds != null) timeStr += `${timeStr?' / ':''}rest ${fmtTime(s.rest_seconds)}`;
        if (!timeStr) timeStr = '-';
        const stanceVal = (s.stance || s.variation) ? translateStance(s.stance || s.variation) : '-';
        md += `| ${dateStr} | ${s.set_number} | ${stanceVal} | ${s.weight ? s.weight + settings.weightUnit : '-'} | ${s.reps ? s.reps + t('ui.common.reps_unit') : '-'} | ${s.rpe || '-'} | ${timeStr} |\n`;
      });
    });

    await Clipboard.setStringAsync(md);
    Alert.alert(t('ui.exercise_detail.copy_success_title'), t('ui.exercise_detail.copy_success_message'));
  };

  const handleDatePress = (dateStr: string) => {
    const targetHistory = history.find(item => {
      const wDate = format(new Date(item.start_time), 'yyyy-MM-dd');
      return wDate === dateStr;
    });

    if (targetHistory) {
      setCalendarVisible(false);
      const yOffset = cardOffsets.current[targetHistory.workout_id];
      if (yOffset !== undefined) {
        const scrollTarget = Math.max(0, yOffset - 20);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: scrollTarget, animated: true });
          setHighlightedWorkoutId(targetHistory.workout_id);
          setTimeout(() => {
            setHighlightedWorkoutId(null);
          }, 1500);
        }, 100);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: Theme.colors.textMuted }}>{t('ui.exercise_detail.not_found')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: t('ui.exercise_detail.title'),
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.primary,
          headerRight: () => AI_CONFIG.status === 'active' ? (
            <TouchableOpacity onPress={handleAICoachExerciseDetail} style={{ marginRight: 16 }}>
              <Ionicons name="sparkles" size={22} color={Theme.colors.primary} />
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
            >
              <Ionicons name="play" size={12} color={Theme.colors.primary} />
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
            <TouchableOpacity onPress={handleExportMarkdown} style={styles.exportBtn}>
              <Ionicons name="copy-outline" size={14} color={Theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.exportBtnText}>{t('ui.exercise_detail.copy_md_btn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={48} color={Theme.colors.border} />
            <Text style={styles.emptyText}>{t('ui.exercise_detail.empty_history')}</Text>
            <Text style={styles.emptySubtext}>{t('ui.exercise_detail.empty_history_sub')}</Text>
          </View>
        ) : (
          history.map(item => {
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
                  { marginHorizontal: Theme.spacing.md },
                  item.workout_id === highlightedWorkoutId && { borderColor: Theme.colors.primary, borderWidth: 2 }
                ]}
                onLayout={(e) => {
                  cardOffsets.current[item.workout_id] = e.nativeEvent.layout.y;
                }}
              >
                <View style={styles.historyCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="calendar-outline" size={16} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
                    <Text style={styles.historyDate}>{formatDate(item.start_time)}</Text>
                  </View>
                  {dailyVolume > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: Theme.colors.textMuted, fontSize: 12 }}>{t('ui.history.volume_label')}: </Text>
                      <Text style={{ color: Theme.colors.primary, fontSize: 13, fontWeight: 'bold' }}>{dailyVolume} {settings.weightUnit}</Text>
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
                  if (s.work_seconds != null) timeStr += `⏱️ ${fmtTime(s.work_seconds)} `;
                  if (s.rest_seconds != null) timeStr += `☕ ${fmtTime(s.rest_seconds)}`;
                  timeStr = timeStr.trim();
                  return (
                    <View key={idx} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                      <View style={[styles.setRow, { paddingVertical: 0 }]}>
                        <Text style={styles.tdSet}>{s.set_number}</Text>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                          <Text style={styles.tdVal}>
                            {s.weight ? `${s.weight} ${settings.weightUnit}` : '-'}  ×  {s.reps ? `${s.reps}${t('ui.common.reps_unit')}` : '-'}
                          </Text>
                          {(s.stance || s.variation) && <View style={styles.historyVariationBadge}><Text style={styles.historyVariationText}>{translateStance(s.stance || s.variation)}</Text></View>}
                        </View>
                        {s.rpe && <Text style={styles.tdRpe}>@RPE {s.rpe}</Text>}
                      </View>
                      {timeStr ? (
                        <Text style={{ textAlign: 'right', fontSize: 11, color: Theme.colors.textMuted, marginTop: 4, marginRight: 8 }}>{timeStr}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: Theme.spacing.sm },
  title: { fontSize: 24, fontWeight: 'bold', color: Theme.colors.text, flexShrink: 1 },
  howToBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.2)' },
  howToText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  badgeText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  sectionHeader: { paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.lg, paddingBottom: Theme.spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.xl },
  emptyText: { color: Theme.colors.textMuted, fontSize: 16, marginTop: 12, fontWeight: 'bold' },
  emptySubtext: { color: Theme.colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  historyCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  historyCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: 8, marginBottom: 8 },
  historyDate: { color: Theme.colors.text, fontSize: 15, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', marginBottom: 4 },
  thSet: { width: 50, color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  thVal: { flex: 1, color: Theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  tdSet: { width: 50, color: Theme.colors.text, fontSize: 16, fontWeight: '500' },
  tdVal: { flex: 1, color: Theme.colors.text, fontSize: 16 },
  tdRpe: { color: Theme.colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.2)' },
  exportBtnText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  historyVariationBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  historyVariationText: { color: Theme.colors.text, fontSize: 11, fontWeight: 'bold' },
});
