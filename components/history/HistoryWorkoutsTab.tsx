import React, { useRef, useState, useMemo } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Theme } from '../../src/theme';
import { AI_CONFIG } from '../../src/config/aiConfig';
import { HistoryChart, ChartMetric } from './HistoryChart';

interface HistoryWorkoutsTabProps {
  workouts: any[];
  isCalendarVisible: boolean;
  setCalendarVisible: (visible: boolean) => void;
  settings: any;
  onDeleteWorkout: (id: number, title: string) => void;
  onSNSShare: (id: number) => void;
  onAICoachHistory: (id: number, title: string) => void;
  t: (key: string, options?: any) => string;
  i18n: any;
}

export const HistoryWorkoutsTab: React.FC<HistoryWorkoutsTabProps> = ({
  workouts,
  isCalendarVisible,
  setCalendarVisible,
  settings,
  onDeleteWorkout,
  onSNSShare,
  onAICoachHistory,
  t,
  i18n,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const isJa = i18n.language === 'ja';
  const cardOffsets = useRef<{ [key: number]: number }>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedWorkoutId, setHighlightedWorkoutId] = useState<number | null>(null);

  const [chartScale, setChartScale] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('volume');

  // Calendar Helpers (Memoized)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const monthlyStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    let count = 0;
    let volume = 0;
    let calories = 0;

    workouts.forEach(w => {
      const date = new Date(w.start_time);
      if (date >= monthStart && date <= monthEnd) {
        count++;
        volume += w.volume || 0;
        calories += w.calories || 0;
      }
    });

    return { count, volume, calories };
  }, [currentMonth, workouts]);

  const workoutsMap = useMemo(() => {
    const map: { [key: string]: boolean } = {};
    workouts.forEach(w => {
      const dStr = format(new Date(w.start_time), 'yyyy-MM-dd');
      map[dStr] = true;
    });
    return map;
  }, [workouts]);

  const handleDatePress = (dateStr: string) => {
    const targetWorkout = workouts.find(w => {
      const wDate = format(new Date(w.start_time), 'yyyy-MM-dd');
      return wDate === dateStr;
    });

    if (targetWorkout) {
      setCalendarVisible(false);
      const yOffset = cardOffsets.current[targetWorkout.id];
      if (yOffset !== undefined) {
        const scrollTarget = Math.max(0, yOffset - 20);
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: scrollTarget, animated: true });
          setHighlightedWorkoutId(targetWorkout.id);
          setTimeout(() => {
            setHighlightedWorkoutId(null);
          }, 1500);
        }, 100);
      }
    }
  };

  const renderCalendarModal = () => {
    const days = calendarDays;
    const { count, volume, calories } = monthlyStats;
    const isJa = i18n.language === 'ja';

    const monthYearText = isJa
      ? format(currentMonth, 'yyyy年 M月')
      : format(currentMonth, 'MMMM yyyy');

    const weekdays = isJa
      ? ['月', '火', '水', '木', '金', '土', '日']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <Modal
        visible={isCalendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.calendarModalHeader}>
              <Text style={styles.calendarModalTitle}>
                {isJa ? 'ワークアウト履歴カレンダー' : 'Workout Calendar'}
              </Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthSelector}>
              <TouchableOpacity
                onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                style={styles.monthNavButton}
              >
                <Ionicons name="chevron-back" size={22} color={Theme.colors.primary} />
              </TouchableOpacity>
              <Text style={styles.monthText}>{monthYearText}</Text>
              <TouchableOpacity
                onPress={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                style={styles.monthNavButton}
              >
                <Ionicons name="chevron-forward" size={22} color={Theme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdaysContainer}>
              {weekdays.map((day, idx) => (
                <Text key={idx} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const hasWorkout = workoutsMap[dayStr];
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.dayCell}
                    disabled={!hasWorkout}
                    onPress={() => handleDatePress(dayStr)}
                  >
                    <View style={[
                      styles.dayBox,
                      hasWorkout && styles.workoutDayBox
                    ]}>
                      <Text style={[
                        styles.dayText,
                        !isCurrentMonth && styles.dimmedDayText,
                        hasWorkout && styles.workoutDayText
                      ]}>
                        {format(day, 'd')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>
                {isJa ? '月間サマリー' : 'Monthly Summary'}
              </Text>
              <View style={styles.summaryStatsRow}>
                <View style={styles.summaryStatBlock}>
                  <Text style={styles.summaryStatLabel}>{isJa ? '実施日数' : 'Workouts'}</Text>
                  <Text style={styles.summaryStatValue}>{count}{isJa ? '日' : ''}</Text>
                </View>
                <View style={styles.summaryStatBlock}>
                  <Text style={styles.summaryStatLabel}>{isJa ? '総ボリューム' : 'Total Volume'}</Text>
                  <Text style={styles.summaryStatValue}>
                    {volume > 0 ? `${volume.toLocaleString()} ${settings.weightUnit}` : '-'}
                  </Text>
                </View>
                <View style={styles.summaryStatBlock}>
                  <Text style={styles.summaryStatLabel}>{isJa ? '総消費カロリー' : 'Total Calories'}</Text>
                  <Text style={styles.summaryStatValue}>
                    {calories > 0 ? `${Math.round(calories).toLocaleString()} kcal` : '-'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <FlatList
        ref={flatListRef}
        style={styles.subContainer}
        contentContainerStyle={styles.content}
        data={workouts}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item: w }) => {
          const isHighlighted = w.id === highlightedWorkoutId;
          return (
            <TouchableOpacity 
              style={[
                styles.card,
                isHighlighted && { borderColor: Theme.colors.primary, borderWidth: 2 }
              ]}
              activeOpacity={0.7}
              onLayout={(e) => {
                cardOffsets.current[w.id] = e.nativeEvent.layout.y;
              }}
              onPress={() => router.push({ pathname: '/workout-details/[id]', params: { id: w.id, _t: Date.now() } } as any)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{w.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {AI_CONFIG.status === 'active' && (
                    <TouchableOpacity 
                      onPress={() => onAICoachHistory(w.id, w.title)} 
                      style={[styles.exportIcon, { marginRight: 8 }]}
                      accessibilityLabel={t('ui.accessibility.ai_coach_history')}
                    >
                      <Ionicons name="sparkles" size={18} color={Theme.colors.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    onPress={() => onSNSShare(w.id)} 
                    style={[styles.exportIcon, { marginRight: 8 }]}
                    accessibilityLabel={t('ui.accessibility.share_sns')}
                  >
                    <Ionicons name="share-social" size={18} color={Theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => onDeleteWorkout(w.id, w.title)} 
                    style={[styles.exportIcon, { backgroundColor: 'rgba(255,50,50,0.1)' }]}
                    accessibilityLabel={t('ui.accessibility.delete_workout')}
                  >
                    <Ionicons name="trash" size={18} color={Theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={styles.dateText}>{format(new Date(w.start_time), isJa ? 'yyyy-MM-dd HH:mm' : 'MMM d, yyyy, h:mm a')}</Text>
                {w.end_time && (
                  <Text style={styles.durationText}>
                    ・{t('ui.history.duration_label')}: {Math.max(1, Math.round((new Date(w.end_time).getTime() - new Date(w.start_time).getTime()) / 60000))}{t('ui.common.min_unit')}
                  </Text>
                )}
              </View>
              
              {w.notes && (
                <View style={styles.notesPreview}>
                  <Ionicons name="document-text-outline" size={14} color={Theme.colors.textMuted} style={{ marginRight: 4 }} />
                  <Text style={styles.notesPreviewText} numberOfLines={2}>{w.notes}</Text>
                </View>
              )}
              
              <View style={styles.statsRow}>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>{t('ui.history.exercises_count')}</Text>
                  <Text style={styles.statValue}>{w.exercise_count}</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>{t('ui.history.volume_label')}</Text>
                  <Text style={styles.statValue}>{w.volume ? `${w.volume} ${settings.weightUnit}` : '-'}</Text>
                </View>
                <View style={styles.statBlock}>
                  <Text style={styles.statLabel}>{t('ui.common.calories') || 'Calories'}</Text>
                  <Text style={styles.statValue}>{w.calories ? `${w.calories} kcal` : '-'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={
          <>
            <HistoryChart
              workouts={workouts}
              chartScale={chartScale}
              setChartScale={setChartScale}
              chartMetric={chartMetric}
              setChartMetric={setChartMetric}
              weightUnit={settings.weightUnit}
              setCalendarVisible={setCalendarVisible}
              t={t}
            />

            <Text style={styles.subtitle}>{t('ui.history.subtitle')}</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t('ui.history.empty_state')}</Text>
          </View>
        }
      />
      {renderCalendarModal()}
    </>
  );
};

const styles = StyleSheet.create({
  subContainer: { flex: 1 },
  content: { padding: Theme.spacing.md, paddingBottom: 100 },
  subtitle: { color: Theme.colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: Theme.spacing.xs, marginBottom: Theme.spacing.md },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.xs },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginRight: 8 },
  exportIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  dateText: { color: Theme.colors.textMuted, fontSize: 13 },
  durationText: { color: Theme.colors.textMuted, fontSize: 13 },
  notesPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 6, marginBottom: 12 },
  notesPreviewText: { color: Theme.colors.textMuted, fontSize: 13, flex: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: Theme.spacing.md },
  statBlock: { alignItems: 'center', flex: 1 },
  statLabel: { color: Theme.colors.textMuted, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { color: Theme.colors.text, fontSize: 15, fontWeight: 'bold' },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { color: Theme.colors.textMuted, fontSize: 14, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Theme.colors.card, borderRadius: 16, padding: 20, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: Theme.colors.border },
  calendarModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  monthSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, backgroundColor: '#1c1c1e', borderRadius: 8, padding: 4 },
  monthNavButton: { padding: 6 },
  monthText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  weekdaysContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  weekdayText: { color: Theme.colors.textMuted, fontSize: 12, width: 40, textAlign: 'center', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  dayCell: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  dayBox: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  workoutDayBox: { backgroundColor: 'rgba(79, 172, 254, 0.15)', borderWidth: 1, borderColor: Theme.colors.primary },
  dayText: { color: '#fff', fontSize: 14 },
  dimmedDayText: { color: 'rgba(255,255,255,0.15)' },
  workoutDayText: { color: Theme.colors.primary, fontWeight: 'bold' },
  summaryContainer: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Theme.colors.border },
  summaryTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  summaryStatsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryStatBlock: { alignItems: 'center', flex: 1 },
  summaryStatLabel: { color: Theme.colors.textMuted, fontSize: 10, marginBottom: 4 },
  summaryStatValue: { color: Theme.colors.text, fontSize: 14, fontWeight: 'bold' },
});
