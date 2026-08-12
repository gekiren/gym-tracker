import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { Theme } from '../../src/theme';
import { calculateRM } from '../../src/utils/workoutStats';

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

interface ChartPoint {
  id: string;
  label: string;
  dateStr: string;
  value: number;
}

// Linear Path Generator
function createLinearPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
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
  const [chartType, setChartType] = useState<'volume' | '1rm'>('volume');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // chartScaleやchartTypeが変更されたら選択位置をリセット
  useEffect(() => {
    setSelectedIndex(null);
  }, [chartScale, chartType]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (!history || history.length === 0) return [];

    if (chartType === 'volume') {
      const hValid = history
        .map(item => {
          const volume = item.sets.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0);
          return { start_time: item.start_time, volume };
        })
        .filter(h => h.volume > 0);

      if (hValid.length === 0) return [];

      if (chartScale === 'day') {
        const hRev = [...hValid].reverse().slice(-40);
        return hRev.map(h => {
          const d = new Date(h.start_time);
          return {
            id: h.start_time,
            label: format(d, 'MM/dd'),
            dateStr: format(d, 'yyyy/MM/dd'),
            value: Math.round(h.volume)
          };
        });
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

        const sortedWeeks = Object.values(weeklyVolumes).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
        return sortedWeeks.map(w => ({
          id: w.date.toISOString(),
          label: format(w.date, 'MM/dd'),
          dateStr: `${format(w.date, 'yyyy/MM/dd')}週`,
          value: Math.round(w.volume)
        }));
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

        const sortedMonths = Object.values(monthlyVolumes).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
        return sortedMonths.map(m => ({
          id: m.date.toISOString(),
          label: format(m.date, 'yyyy/MM'),
          dateStr: format(m.date, 'yyyy年M月'),
          value: Math.round(m.volume)
        }));
      }
    } else {
      // 1RM Chart Data
      const hValid = history
        .map(item => {
          const max1Rm = item.sets.reduce((max: number, s: any) => {
            const rm = calculateRM(parseFloat(s.weight), parseInt(s.reps, 10)) || 0;
            return Math.max(max, rm);
          }, 0);
          return { start_time: item.start_time, max1Rm };
        })
        .filter(h => h.max1Rm > 0);

      if (hValid.length === 0) return [];

      if (chartScale === 'day') {
        const daily1RMs: { [key: string]: { date: Date; max1Rm: number } } = {};
        hValid.forEach(h => {
          const date = new Date(h.start_time);
          const key = format(date, 'yyyy-MM-dd');
          if (!daily1RMs[key]) {
            daily1RMs[key] = { date, max1Rm: 0 };
          }
          daily1RMs[key].max1Rm = Math.max(daily1RMs[key].max1Rm, h.max1Rm);
        });

        const sortedDays = Object.values(daily1RMs).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
        return sortedDays.map(d => ({
          id: d.date.toISOString(),
          label: format(d.date, 'MM/dd'),
          dateStr: format(d.date, 'yyyy/MM/dd'),
          value: Math.round(d.max1Rm * 10) / 10
        }));
      }

      if (chartScale === 'week') {
        const weekly1RMs: { [key: string]: { date: Date; max1Rm: number } } = {};
        hValid.forEach(h => {
          const date = new Date(h.start_time);
          const weekStart = startOfWeek(date, { weekStartsOn: 1 });
          const key = weekStart.toISOString();
          if (!weekly1RMs[key]) {
            weekly1RMs[key] = { date: weekStart, max1Rm: 0 };
          }
          weekly1RMs[key].max1Rm = Math.max(weekly1RMs[key].max1Rm, h.max1Rm);
        });

        const sortedWeeks = Object.values(weekly1RMs).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
        return sortedWeeks.map(w => ({
          id: w.date.toISOString(),
          label: format(w.date, 'MM/dd'),
          dateStr: `${format(w.date, 'yyyy/MM/dd')}週`,
          value: Math.round(w.max1Rm * 10) / 10
        }));
      }

      if (chartScale === 'month') {
        const monthly1RMs: { [key: string]: { date: Date; max1Rm: number } } = {};
        hValid.forEach(h => {
          const date = new Date(h.start_time);
          const monthStart = startOfMonth(date);
          const key = monthStart.toISOString();
          if (!monthly1RMs[key]) {
            monthly1RMs[key] = { date: monthStart, max1Rm: 0 };
          }
          monthly1RMs[key].max1Rm = Math.max(monthly1RMs[key].max1Rm, h.max1Rm);
        });

        const sortedMonths = Object.values(monthly1RMs).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
        return sortedMonths.map(m => ({
          id: m.date.toISOString(),
          label: format(m.date, 'yyyy/MM'),
          dateStr: format(m.date, 'yyyy年M月'),
          value: Math.round(m.max1Rm * 10) / 10
        }));
      }
    }

    return [];
  }, [history, chartScale, chartType]);

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

  const repChartData = useMemo(() => {
    if (selectedChartReps === null || selectedChartVariation === null) return null;
    const timeline = getPRTimeline(selectedChartReps, selectedChartVariation);
    if (timeline.length === 0) return null;

    const displayTimeline = timeline.slice(-10);
    
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

  // アクティブに選択されたインデックス（デフォルトは最新データ）
  const activeIndex = selectedIndex !== null && selectedIndex < chartPoints.length 
    ? selectedIndex 
    : (chartPoints.length > 0 ? chartPoints.length - 1 : null);

  const activePoint = activeIndex !== null ? chartPoints[activeIndex] : null;

  // 7個動的幅計算
  const containerWidth = Dimensions.get('window').width - 32;
  const targetDisplayCount = 7;
  const pointWidth = Math.max(48, Math.floor(containerWidth / targetDisplayCount));
  const svgHeight = 180;
  const paddingTop = 35;
  const paddingBottom = 35;
  const drawHeight = svgHeight - paddingTop - paddingBottom;
  const svgWidth = Math.max(containerWidth, chartPoints.length * pointWidth);

  const maxVal = Math.max(0.001, ...chartPoints.map(p => p.value));

  const coords = chartPoints.map((p, idx) => {
    const x = (idx + 0.5) * pointWidth;
    const valNorm = maxVal > 0 ? p.value / maxVal : 0;
    const y = svgHeight - paddingBottom - (valNorm * drawHeight);
    return { x, y, point: p, idx };
  });

  const linearPath = createLinearPath(coords.map(c => ({ x: c.x, y: c.y })));
  const areaPath = coords.length > 0 
    ? `${linearPath} L ${coords[coords.length - 1].x} ${svgHeight - paddingBottom} L ${coords[0].x} ${svgHeight - paddingBottom} Z`
    : '';

  const chartThemeColor = Theme.colors.primary;

  return (
    <>
      {chartPoints.length > 0 && (
        <View style={styles.chartContainer}>
          {/* Header Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
            <Text style={styles.chartTitle}>
              {chartType === 'volume'
                ? t('ui.history.chart_title', { unit: settings.weightUnit })
                : t('ui.history.chart_1rm_title', { unit: settings.weightUnit })}
            </Text>
            <TouchableOpacity 
              style={styles.calendarBtn}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={Theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Selectors Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
            <View style={styles.toggleContainer}>
              {(['volume', '1rm'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.toggleButton, chartType === type && styles.toggleButtonActive]}
                  onPress={() => setChartType(type)}
                >
                  <Text style={[styles.toggleButtonText, chartType === type && styles.toggleButtonTextActive]}>
                    {t(type === 'volume' ? 'ui.history.type_volume' : 'ui.history.type_1rm')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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

          {/* Selected Point Summary Card */}
          {activePoint && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryDate}>{activePoint.dateStr}</Text>
              <Text style={styles.summaryVal}>
                {activePoint.value.toLocaleString()}
                <Text style={styles.summaryUnit}> {settings.weightUnit}</Text>
              </Text>
            </View>
          )}

          {/* SVG Line & Area Chart */}
          <View style={styles.chartWrapper}>
            <ScrollView
              key={`${chartType}_${chartScale}`}
              ref={chartScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={() => chartScrollRef.current?.scrollToEnd({ animated: false })}
              contentContainerStyle={{ paddingLeft: 0, paddingRight: 0 }}
            >
              <View style={{ width: svgWidth, height: svgHeight, position: 'relative' }}>
                <Svg width={svgWidth} height={svgHeight} style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="exerciseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor={chartThemeColor} stopOpacity={0.35} />
                      <Stop offset="100%" stopColor={chartThemeColor} stopOpacity={0.0} />
                    </LinearGradient>
                  </Defs>

                  {/* 50% Horizontal Grid */}
                  <Line
                    x1={0}
                    y1={svgHeight - paddingBottom - drawHeight * 0.5}
                    x2={svgWidth}
                    y2={svgHeight - paddingBottom - drawHeight * 0.5}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={1}
                  />

                  {/* Area Gradient Fill */}
                  {areaPath !== '' && (
                    <Path d={areaPath} fill="url(#exerciseAreaGrad)" />
                  )}

                  {/* Linear Line Path */}
                  {linearPath !== '' && (
                    <Path
                      d={linearPath}
                      fill="none"
                      stroke={chartThemeColor}
                      strokeWidth={3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Data Points & Active Ring */}
                  {coords.map(c => {
                    const isSelected = c.idx === activeIndex;

                    return (
                      <G key={c.point.id}>
                        {/* Vertical Guide Line */}
                        {isSelected && (
                          <Line
                            x1={c.x}
                            y1={paddingTop - 10}
                            x2={c.x}
                            y2={svgHeight - paddingBottom}
                            stroke={chartThemeColor}
                            strokeOpacity={0.35}
                            strokeDasharray="3,3"
                            strokeWidth={1.5}
                          />
                        )}

                        {/* Active Outer Ring */}
                        {isSelected && (
                          <Circle
                            cx={c.x}
                            cy={c.y}
                            r={10}
                            fill="none"
                            stroke={chartThemeColor}
                            strokeOpacity={0.4}
                            strokeWidth={2}
                          />
                        )}

                        {/* Point Circle */}
                        <Circle
                          cx={c.x}
                          cy={c.y}
                          r={isSelected ? 5.5 : 4}
                          fill={isSelected ? chartThemeColor : '#121212'}
                          stroke={isSelected ? '#ffffff' : chartThemeColor}
                          strokeWidth={isSelected ? 2 : 2.5}
                        />

                        {/* X-Axis Date Label */}
                        <SvgText
                          x={c.x}
                          y={svgHeight - 10}
                          fill={isSelected ? chartThemeColor : Theme.colors.textMuted}
                          fontSize={11}
                          fontWeight={isSelected ? '800' : '600'}
                          textAnchor="middle"
                        >
                          {c.point.label}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>

                {/* Touch Layer */}
                <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                  <View style={{ flexDirection: 'row', width: svgWidth, height: svgHeight }}>
                    {coords.map(c => (
                      <TouchableOpacity
                        key={`touch_${c.point.id}`}
                        style={{ width: pointWidth, height: svgHeight }}
                        activeOpacity={0.7}
                        onPress={() => setSelectedIndex(c.idx)}
                      />
                    ))}
                  </View>
                </View>
              </View>
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
  chartTitle: { color: Theme.colors.text, fontSize: 18, fontWeight: 'bold' },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Theme.borderRadius.sm,
    padding: 2,
    alignSelf: 'flex-start',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.sm - 2,
  },
  toggleButtonActive: {
    backgroundColor: Theme.colors.card,
  },
  toggleButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
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
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryDate: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryVal: {
    color: Theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryUnit: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chartWrapper: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
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

