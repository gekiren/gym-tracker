import React, { useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { Theme } from '../../src/theme';

interface ExerciseChartsProps {
  history: any[];
  settings: any;
  chartScale: 'day' | 'week' | 'month';
  setChartScale: (scale: 'day' | 'week' | 'month') => void;
  setCalendarVisible: (visible: boolean) => void;
  selectedChartReps: number | null;
  setSelectedChartReps: (reps: number | null) => void;
  selectedChartVariation: string | null;
  setSelectedChartVariation: (variation: string | null) => void;
  showChartModal: boolean;
  setShowChartModal: (show: boolean) => void;
  t: (key: string, options?: any) => string;
}

export const ExerciseCharts: React.FC<ExerciseChartsProps> = ({
  history,
  settings,
  chartScale,
  setChartScale,
  setCalendarVisible,
  selectedChartReps,
  setSelectedChartReps,
  selectedChartVariation,
  setSelectedChartVariation,
  showChartModal,
  setShowChartModal,
  t,
}) => {
  const chartScrollRef = useRef<ScrollView>(null);

  const getPRTimeline = useCallback((reps: number, variation: string) => {
    const sortedHistory = [...history].reverse();
    const timeline: { date: string; weight: number }[] = [];

    sortedHistory.forEach(workout => {
      const matchingSets = workout.sets.filter((s: any) => {
        const setVariation = s.stance || s.variation || 'default';
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
  }, [history]);

  const vChartData = useMemo(() => {
    const hValid = history
      .map(item => {
        const volume = item.sets.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0);
        return {
          start_time: item.start_time,
          volume
        };
      })
      .filter(h => h.volume > 0);

    if (hValid.length === 0) return null;

    if (chartScale === 'day') {
      const hRev = [...hValid].reverse();
      if (hRev.length < 1) return null;
      return {
        labels: hRev.map(h => format(new Date(h.start_time), 'MM/dd')).slice(-50),
        datasets: [
          {
            data: hRev.map(h => h.volume).slice(-50)
          }
        ]
      };
    }

    if (chartScale === 'week') {
      const weeklyVolumes: { [key: string]: { date: Date; volume: number } } = {};
      hValid.forEach(h => {
        const date = new Date(h.start_time);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const key = weekStart.toISOString();
        if (!weeklyVolumes[key]) {
          weeklyVolumes[key] = { date: weekStart, volume: 0 };
        }
        weeklyVolumes[key].volume += h.volume;
      });

      const sortedWeeks = Object.values(weeklyVolumes).sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedWeeks.length < 1) return null;

      const recentWeeks = sortedWeeks.slice(-50);
      return {
        labels: recentWeeks.map(w => format(w.date, 'MM/dd')),
        datasets: [
          {
            data: recentWeeks.map(w => w.volume)
          }
        ]
      };
    }

    if (chartScale === 'month') {
      const monthlyVolumes: { [key: string]: { date: Date; volume: number } } = {};
      hValid.forEach(h => {
        const date = new Date(h.start_time);
        const monthStart = startOfMonth(date);
        const key = monthStart.toISOString();
        if (!monthlyVolumes[key]) {
          monthlyVolumes[key] = { date: monthStart, volume: 0 };
        }
        monthlyVolumes[key].volume += h.volume;
      });

      const sortedMonths = Object.values(monthlyVolumes).sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedMonths.length < 1) return null;

      const recentMonths = sortedMonths.slice(-50);
      return {
        labels: recentMonths.map(m => format(m.date, 'yyyy/MM')),
        datasets: [
          {
            data: recentMonths.map(m => m.volume)
          }
        ]
      };
    }

    return null;
  }, [history, chartScale]);

  const repChartData = useMemo(() => {
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
  }, [selectedChartReps, selectedChartVariation, getPRTimeline]);

  return (
    <>
      {vChartData && (
        <View style={styles.chartContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
            <Text style={[styles.chartTitle, { marginBottom: 0 }]}>{t('ui.history.chart_title', { unit: settings.weightUnit })}</Text>
            <TouchableOpacity 
              style={styles.calendarBtn}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={22} color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
            <View style={styles.scaleContainer}>
              {(['day', 'week', 'month'] as const).map(scale => (
                <TouchableOpacity
                  key={scale}
                  style={[styles.scaleButton, chartScale === scale && styles.scaleButtonActive]}
                  onPress={() => setChartScale(scale)}
                >
                  <Text style={[styles.scaleButtonText, chartScale === scale && styles.scaleButtonTextActive]}>
                    {t(`ui.history.scale_${scale}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, overflow: 'hidden' }}>
            <ScrollView
              key={chartScale}
              ref={chartScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => chartScrollRef.current?.scrollToEnd({ animated: false })}
              contentContainerStyle={{ paddingLeft: 15, paddingRight: 20 }}
            >
              <BarChart
                data={vChartData}
                width={Math.max(180, vChartData.labels.length * 48)}
                height={220}
                chartConfig={{
                  backgroundColor: Theme.colors.card,
                  backgroundGradientFrom: Theme.colors.card,
                  backgroundGradientTo: Theme.colors.card,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  barPercentage: 0.55,
                  propsForBackgroundLines: {
                    stroke: 'rgba(255, 255, 255, 0.05)',
                    strokeDasharray: '3',
                  }
                }}
                withHorizontalLabels={false}
                withVerticalLabels={true}
                showValuesOnTopOfBars={true}
                yAxisLabel=""
                yAxisSuffix=""
                style={{
                  marginLeft: -10,
                  paddingRight: 16,
                  paddingTop: 12,
                }}
              />
            </ScrollView>
          </View>
        </View>
      )}

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
              const res = repChartData;
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
    </>
  );
};

const styles = StyleSheet.create({
  chartContainer: { paddingHorizontal: Theme.spacing.lg, marginVertical: Theme.spacing.md },
  chartTitle: { color: Theme.colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: Theme.spacing.md },
  scaleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Theme.borderRadius.sm,
    padding: 2,
    alignSelf: 'flex-start',
  },
  scaleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm - 2,
  },
  scaleButtonActive: {
    backgroundColor: Theme.colors.card,
  },
  scaleButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  scaleButtonTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  calendarBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: 44,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.lg, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  analysisRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  analysisCard: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 8, padding: 10, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  analysisLabel: { fontSize: 11, color: Theme.colors.textMuted, marginBottom: 4 },
  analysisValue: { fontSize: 14, fontWeight: 'bold', color: Theme.colors.text },
});
