import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getExerciseById, getExerciseHistory, getPersonalRecords, updateExerciseDefaultVariation, saveSetting } from '../../src/db/database';
import { Theme } from '../../src/theme';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useTranslation } from 'react-i18next';
import { translateExercise, translateMuscleGroup, translateEquipment, translateStance } from '../../src/i18n';
import { DEFAULT_STANCES } from '../../src/utils/stances';

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
                    .map(reps => (
                    <View key={reps} style={styles.prItem}>
                      <Text style={styles.prReps}>{reps}{t('ui.common.reps_unit')}</Text>
                      <Text style={styles.prWeight}>{prMap[parseInt(reps)]} {settings.weightUnit}</Text>
                    </View>
                  ))}
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
          history.map(item => (
            <View key={item.workout_id} style={[styles.historyCard, { marginHorizontal: Theme.spacing.md }]}>
              <View style={styles.historyCardHeader}>
                <Ionicons name="calendar-outline" size={16} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.historyDate}>{formatDate(item.start_time)}</Text>
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
          ))
        )}
      </ScrollView>
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
  historyCardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Theme.colors.border, paddingBottom: 8, marginBottom: 8 },
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
  addStanceActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }
});
