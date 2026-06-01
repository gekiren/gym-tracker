import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, ScrollView, TextInput, Modal, Dimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { getExerciseById, getExerciseHistory, getPersonalRecords, updateExerciseDefaultVariation, saveSetting } from '../../src/db/database';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateMuscleGroup, translateEquipment, translateStance } from '../../src/i18n';
import { DEFAULT_STANCES } from '../../src/utils/stances';
import { AI_CONFIG } from '../../src/config/aiConfig';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [personalRecords, setPersonalRecords] = useState<Record<string, Record<number, number>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { settings, addCustomStance, removeCustomStance } = useWorkoutStore();
  const { t } = useTranslation();
  
  const [isAddingStance, setIsAddingStance] = useState(false);
  const [newStance, setNewStance] = useState('');

  const [selectedChartReps, setSelectedChartReps] = useState<number | null>(null);
  const [selectedChartVariation, setSelectedChartVariation] = useState<string | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        const exItem = await getExerciseById(parseInt(id, 10));
        setExercise(exItem);
        const histData = await getExerciseHistory(parseInt(id, 10));
        setHistory(histData);
        const prData = await getPersonalRecords(parseInt(id, 10));
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
        if (s.variation) sd += ` (${translateStance(s.variation)})`;
        if (s.rpe) sd += ` (RPE: ${s.rpe})`;
        return sd;
      });
      contextStr += setDescs.join(', ') + '\n';
    });

    router.push({
      pathname: '/(tabs)/coach',
      params: {
        contextPrompt: contextStr,
        prefillMessage: `${translateExercise(exercise.name)}のこれまでの重量やボリュームの成長履歴を分析し、さらに伸ばすための改善点やアドバイスをください。`,
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
        const varStr = s.variation ? ` (${translateStance(s.variation)})` : '';
        md += `| ${dateStr} | ${s.set_number}${varStr} | ${s.weight ? s.weight + settings.weightUnit : '-'} | ${s.reps ? s.reps + t('ui.common.reps_unit') : '-'} | ${s.rpe || '-'} | ${timeStr} |\n`;
      });
    });

    await Clipboard.setStringAsync(md);
    Alert.alert(t('ui.exercise_detail.copy_success_title'), t('ui.exercise_detail.copy_success_message'));
  };

  const getPRTimeline = (reps: number, variation: string) => {
    const sortedHistory = [...history].reverse();
    const timeline: { date: string; weight: number }[] = [];

    sortedHistory.forEach(workout => {
      const matchingSets = workout.sets.filter((s: any) => {
        const setVariation = s.variation || 'default';
        return s.reps === reps && setVariation === variation;
      });

      if (matchingSets.length > 0) {
        const maxWeight = Math.max(...matchingSets.map((s: any) => parseFloat(s.weight) || 0));
        if (maxWeight > 0) {
          const d = new Date(workout.start_time);
          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
          timeline.push({ date: dateStr, weight: maxWeight });
        }
      }
    });

    return timeline;
  };

  const getChartDataForReps = () => {
    if (selectedChartReps === null || selectedChartVariation === null) return null;
    const timeline = getPRTimeline(selectedChartReps, selectedChartVariation);
    if (timeline.length === 0) return null;

    const displayTimeline = timeline.slice(-10); // show last 10 points
    
    return {
      timeline: displayTimeline,
      chartData: {
        labels: displayTimeline.map((t, idx) => {
          if (displayTimeline.length <= 6) return t.date;
          if (idx === 0 || idx === displayTimeline.length - 1 || idx === Math.floor(displayTimeline.length / 2)) {
            return t.date;
          }
          return '';
        }),
        datasets: [
          {
            data: displayTimeline.map(t => t.weight)
          }
        ]
      }
    };
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
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Exercise Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{translateExercise(exercise.name)}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}><Text style={styles.badgeText}>{translateMuscleGroup(exercise.muscle_group)}</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>{translateEquipment(exercise.equipment)}</Text></View>
          </View>
        </View>

        {Object.keys(personalRecords).length > 0 && (
          <View style={styles.prSection}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: Theme.spacing.lg, marginBottom: 8 }]}>{t('ui.exercise_detail.section_pr')}</Text>
            {Object.entries(personalRecords).map(([variation, prMap]) => (
              <View key={variation} style={{ marginBottom: 12 }}>
                {variation !== 'default' && (
                  <Text style={styles.prVariationTitle}>{t('ui.active_workout.stance_label')}: {translateStance(variation)}</Text>
                )}
                <View style={styles.prList}>
                  {Object.keys(prMap)
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map(reps => {
                      const repNum = parseInt(reps);
                      const weight = prMap[repNum];
                      const oneRm = repNum === 1 ? weight : Math.round(weight * (1 + (repNum / 30)));
                      return (
                        <TouchableOpacity 
                          key={reps} 
                          style={styles.prItem}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedChartReps(repNum);
                            setSelectedChartVariation(variation);
                            setShowChartModal(true);
                          }}
                        >
                          <Text style={styles.prReps}>{reps}{t('ui.common.reps_unit')}</Text>
                          <Text style={styles.prWeight}>{weight} {settings.weightUnit}</Text>
                          {repNum > 1 && (
                            <Text style={styles.prOneRm}>1RM: {oneRm}{settings.weightUnit}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Stance Management Section */}
        <View style={styles.stanceSection}>
          <Text style={styles.sectionTitle}>{t('ui.exercise_detail.section_stance')}</Text>
          <View style={styles.stanceList}>
            <TouchableOpacity
              style={[styles.choiceChip, exercise.default_variation === null && styles.choiceChipActive]}
              onPress={async () => {
                await updateExerciseDefaultVariation(exercise.id, null);
                setExercise({ ...exercise, default_variation: null });
              }}
            >
              <Text style={[styles.choiceChipText, exercise.default_variation === null && styles.choiceChipTextActive]}>
                {t('ui.active_workout.stance_standard')}
              </Text>
            </TouchableOpacity>
            
            {(settings.customStances || []).map((s: string) => {
              const isActive = exercise.default_variation === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.choiceChip, isActive && styles.choiceChipActive]}
                  onPress={async () => {
                    await updateExerciseDefaultVariation(exercise.id, s);
                    setExercise({ ...exercise, default_variation: s });
                  }}
                  onLongPress={() => {
                    Alert.alert(
                      t('ui.active_workout.stance_delete_title'),
                      t('ui.active_workout.stance_delete_message', { name: translateStance(s) }),
                      [
                        { text: t('ui.active_workout.stance_cancel'), style: 'cancel' },
                        { 
                          text: t('ui.active_workout.stance_delete_confirm'), 
                          style: 'destructive',
                          onPress: async () => {
                            const next = (settings.customStances || []).filter(item => item !== s);
                            removeCustomStance(s);
                            await saveSetting('custom_stances', JSON.stringify(next));
                            if (exercise.default_variation === s) {
                              await updateExerciseDefaultVariation(exercise.id, null);
                              setExercise({ ...exercise, default_variation: null });
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={[styles.choiceChipText, isActive && styles.choiceChipTextActive]}>
                    {translateStance(s)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity 
              style={styles.addStanceBtn} 
              onPress={() => setIsAddingStance(true)}
            >
              <Ionicons name="add" size={16} color={Theme.colors.primary} />
              <Text style={styles.addStanceBtnText}>{t('ui.active_workout.stance_add_original_btn')}</Text>
            </TouchableOpacity>
          </View>

          {isAddingStance && (
            <View style={styles.addStanceInputContainer}>
              <TextInput
                style={styles.addStanceInput}
                value={newStance}
                onChangeText={setNewStance}
                placeholder={t('ui.active_workout.stance_add_placeholder')}
                placeholderTextColor={Theme.colors.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  style={styles.addStanceActionBtn}
                  onPress={() => {
                    setIsAddingStance(false);
                    setNewStance('');
                  }}
                >
                  <Text style={{ color: Theme.colors.textMuted }}>{t('ui.active_workout.stance_cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addStanceActionBtn, { backgroundColor: Theme.colors.primary }]}
                  onPress={async () => {
                    const val = newStance.trim();
                    if (val) {
                      addCustomStance(val);
                      const next = Array.from(new Set([...(settings.customStances || []), val]));
                      await saveSetting('custom_stances', JSON.stringify(next));
                      await updateExerciseDefaultVariation(exercise.id, val);
                      setExercise({ ...exercise, default_variation: val });
                    }
                    setNewStance('');
                    setIsAddingStance(false);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('ui.active_workout.stance_add_to_list')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

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
            <View key={item.workout_id} style={[styles.historyCard, { marginHorizontal: Theme.spacing.md }]}>
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
                        {s.variation && <View style={styles.historyVariationBadge}><Text style={styles.historyVariationText}>{translateStance(s.variation)}</Text></View>}
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
      {/* PR Progression Chart Modal */}
      <Modal
        visible={showChartModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedChartReps ? t('ui.exercise_detail.progression_chart_title', { reps: selectedChartReps }) : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowChartModal(false)}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {(() => {
              const res = getChartDataForReps();
              if (!res) {
                return (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: Theme.colors.textMuted }}>No history found for this rep target.</Text>
                  </View>
                );
              }

              const { timeline, chartData } = res;
              const initialWeight = timeline[0]?.weight || 0;
              const currentPRWeight = Math.max(...timeline.map(t => t.weight));
              const diff = currentPRWeight - initialWeight;

              return (
                <ScrollView contentContainerStyle={{ alignItems: 'center' }}>
                  {/* Analysis Cards */}
                  <View style={styles.analysisRow}>
                    <View style={styles.analysisCard}>
                      <Text style={styles.analysisLabel}>{t('ui.exercise_detail.initial_record')}</Text>
                      <Text style={styles.analysisValue}>{initialWeight} {settings.weightUnit}</Text>
                    </View>
                    <View style={styles.analysisCard}>
                      <Text style={styles.analysisLabel}>{t('ui.exercise_detail.current_pr')}</Text>
                      <Text style={[styles.analysisValue, { color: Theme.colors.primary }]}>{currentPRWeight} {settings.weightUnit}</Text>
                    </View>
                    <View style={styles.analysisCard}>
                      <Text style={styles.analysisLabel}>{t('ui.exercise_detail.improvement_value')}</Text>
                      <Text style={[styles.analysisValue, { color: diff >= 0 ? Theme.colors.success : Theme.colors.danger }]}>
                        {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} {settings.weightUnit}
                      </Text>
                    </View>
                  </View>

                  <LineChart
                    data={chartData}
                    width={Dimensions.get('window').width * 0.8}
                    height={220}
                    chartConfig={{
                      backgroundColor: Theme.colors.card,
                      backgroundGradientFrom: Theme.colors.card,
                      backgroundGradientTo: Theme.colors.card,
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      propsForDots: {
                        r: "5",
                        strokeWidth: "2",
                        stroke: Theme.colors.primary
                      }
                    }}
                    bezier
                    style={{ borderRadius: 12, marginVertical: 16 }}
                  />
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { padding: Theme.spacing.lg, backgroundColor: Theme.colors.card, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  title: { fontSize: 24, fontWeight: 'bold', color: Theme.colors.text, marginBottom: Theme.spacing.sm },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: 'rgba(79, 172, 254, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(79, 172, 254, 0.3)' },
  badgeText: { color: Theme.colors.primary, fontSize: 12, fontWeight: 'bold' },
  sectionHeader: { paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.lg, paddingBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Theme.spacing.xl },
  emptyText: { color: Theme.colors.textMuted, fontSize: 16, marginTop: 12, fontWeight: 'bold' },
  emptySubtext: { color: Theme.colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' },
  listContent: { paddingHorizontal: Theme.spacing.md, paddingBottom: 40 },
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
  prSection: { borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: Theme.spacing.md, paddingTop: Theme.spacing.md },
  prList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Theme.spacing.lg },
  prItem: { backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#333', minWidth: 70 },
  prReps: { color: Theme.colors.textMuted, fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  prWeight: { color: Theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
  prOneRm: { color: '#f5a623', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  prVariationTitle: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: 'bold', paddingHorizontal: Theme.spacing.lg, marginBottom: 4 },
  historyVariationBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  historyVariationText: { color: Theme.colors.text, fontSize: 11, fontWeight: 'bold' },
  stanceSection: { padding: Theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  stanceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333' },
  choiceChipActive: { backgroundColor: 'rgba(79, 172, 254, 0.2)', borderColor: Theme.colors.primary },
  choiceChipText: { color: Theme.colors.textMuted, fontSize: 13, fontWeight: '500' },
  choiceChipTextActive: { color: Theme.colors.primary, fontWeight: 'bold' },
  addStanceBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: Theme.colors.primary },
  addStanceBtnText: { color: Theme.colors.primary, fontSize: 13, marginLeft: 4 },
  addStanceInputContainer: { marginTop: 16, backgroundColor: '#1a1a1a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  addStanceInput: { backgroundColor: '#121212', color: Theme.colors.text, padding: 8, borderRadius: 4, marginBottom: 12, fontSize: 14 },
  addStanceActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.lg, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  analysisRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  analysisCard: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  analysisLabel: { fontSize: 11, color: Theme.colors.textMuted, marginBottom: 4 },
  analysisValue: { fontSize: 14, fontWeight: 'bold', color: Theme.colors.text }
});
