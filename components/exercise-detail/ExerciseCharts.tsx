import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { Theme } from '../../src/theme';
import { calculateRM } from '../../src/utils/workoutStats';

export type ExerciseChartMetric = 'volume' | '1rm' | 'sets' | 'avg_volume_per_set' | 'density';

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

export const METRIC_OPTIONS: {
  id: ExerciseChartMetric;
  titleKey: string;
  subKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
}[] = [
  { id: 'volume', titleKey: 'ui.history.metric_volume', subKey: 'ui.history.metric_volume_sub', icon: 'bar-chart-outline', badge: 'デフォルト' },
  { id: '1rm', titleKey: 'ui.history.type_1rm', subKey: 'ui.history.metric_1rm_sub', icon: 'trophy-outline' },
  { id: 'sets', titleKey: 'ui.history.metric_sets', subKey: 'ui.history.metric_sets_sub', icon: 'layers-outline' },
  { id: 'avg_volume_per_set', titleKey: 'ui.history.metric_avg_volume_per_set', subKey: 'ui.history.metric_avg_volume_per_set_sub', icon: 'fitness-outline' },
  { id: 'density', titleKey: 'ui.history.metric_density', subKey: 'ui.history.metric_density_sub', icon: 'speedometer-outline' },
];

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
  const [chartMetric, setChartMetric] = useState<ExerciseChartMetric>('volume');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isMetricModalVisible, setMetricModalVisible] = useState(false);

  // chartScaleやchartMetricが変更されたら選択位置をリセット
  useEffect(() => {
    setSelectedIndex(null);
  }, [chartScale, chartMetric]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (!history || history.length === 0) return [];

    const processedHistory = history.map(item => {
      const sets = item.sets || [];
      const setsCount = sets.length;
      const volume = sets.reduce((sum: number, s: any) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0);
      const max1Rm = sets.reduce((max: number, s: any) => {
        const rm = calculateRM(parseFloat(s.weight), parseInt(s.reps, 10)) || 0;
        return Math.max(max, rm);
      }, 0);
      let totalSecs = sets.reduce((sum: number, s: any) => sum + (parseFloat(s.work_seconds) || 0) + (parseFloat(s.rest_seconds) || 0), 0);
      let durationMin = totalSecs > 0 ? totalSecs / 60 : (setsCount > 0 ? setsCount * 2 : 0);

      return {
        start_time: item.start_time,
        volume,
        setsCount,
        max1Rm,
        durationMin,
      };
    });

    const hValid = processedHistory.filter(h => {
      if (chartMetric === '1rm') return h.max1Rm > 0;
      if (chartMetric === 'sets') return h.setsCount > 0;
      return h.volume > 0;
    });

    if (hValid.length === 0) return [];

    if (chartScale === 'day') {
      const hRev = [...hValid].reverse().slice(-40);
      return hRev.map(h => {
        const d = new Date(h.start_time);
        let val = 0;
        switch (chartMetric) {
          case 'volume':
            val = Math.round(h.volume);
            break;
          case '1rm':
            val = Math.round(h.max1Rm * 10) / 10;
            break;
          case 'sets':
            val = h.setsCount;
            break;
          case 'avg_volume_per_set':
            val = h.setsCount > 0 ? Math.round(h.volume / h.setsCount) : 0;
            break;
          case 'density':
            val = h.durationMin > 0 ? Math.round((h.volume / h.durationMin) * 10) / 10 : 0;
            break;
        }

        return {
          id: h.start_time,
          label: format(d, 'MM/dd'),
          dateStr: format(d, 'yyyy/MM/dd'),
          value: val,
        };
      });
    }

    if (chartScale === 'week') {
      const weeklyData: { [key: string]: { date: Date; volume: number; setsCount: number; max1Rm: number; durationMin: number } } = {};
      hValid.forEach(h => {
        const date = new Date(h.start_time);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const key = weekStart.toISOString();
        if (!weeklyData[key]) {
          weeklyData[key] = { date: weekStart, volume: 0, setsCount: 0, max1Rm: 0, durationMin: 0 };
        }
        weeklyData[key].volume += h.volume;
        weeklyData[key].setsCount += h.setsCount;
        weeklyData[key].max1Rm = Math.max(weeklyData[key].max1Rm, h.max1Rm);
        weeklyData[key].durationMin += h.durationMin;
      });

      const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
      return sortedWeeks.map(w => {
        let val = 0;
        switch (chartMetric) {
          case 'volume':
            val = Math.round(w.volume);
            break;
          case '1rm':
            val = Math.round(w.max1Rm * 10) / 10;
            break;
          case 'sets':
            val = w.setsCount;
            break;
          case 'avg_volume_per_set':
            val = w.setsCount > 0 ? Math.round(w.volume / w.setsCount) : 0;
            break;
          case 'density':
            val = w.durationMin > 0 ? Math.round((w.volume / w.durationMin) * 10) / 10 : 0;
            break;
        }

        return {
          id: w.date.toISOString(),
          label: format(w.date, 'MM/dd'),
          dateStr: `${format(w.date, 'yyyy/MM/dd')}週`,
          value: val,
        };
      });
    }

    if (chartScale === 'month') {
      const monthlyData: { [key: string]: { date: Date; volume: number; setsCount: number; max1Rm: number; durationMin: number } } = {};
      hValid.forEach(h => {
        const date = new Date(h.start_time);
        const monthStart = startOfMonth(date);
        const key = monthStart.toISOString();
        if (!monthlyData[key]) {
          monthlyData[key] = { date: monthStart, volume: 0, setsCount: 0, max1Rm: 0, durationMin: 0 };
        }
        monthlyData[key].volume += h.volume;
        monthlyData[key].setsCount += h.setsCount;
        monthlyData[key].max1Rm = Math.max(monthlyData[key].max1Rm, h.max1Rm);
        monthlyData[key].durationMin += h.durationMin;
      });

      const sortedMonths = Object.values(monthlyData).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
      return sortedMonths.map(m => {
        let val = 0;
        switch (chartMetric) {
          case 'volume':
            val = Math.round(m.volume);
            break;
          case '1rm':
            val = Math.round(m.max1Rm * 10) / 10;
            break;
          case 'sets':
            val = m.setsCount;
            break;
          case 'avg_volume_per_set':
            val = m.setsCount > 0 ? Math.round(m.volume / m.setsCount) : 0;
            break;
          case 'density':
            val = m.durationMin > 0 ? Math.round((m.volume / m.durationMin) * 10) / 10 : 0;
            break;
        }

        return {
          id: m.date.toISOString(),
          label: format(m.date, 'yyyy/MM'),
          dateStr: format(m.date, 'yyyy年M月'),
          value: val,
        };
      });
    }

    return [];
  }, [history, chartScale, chartMetric]);

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
  const currentMetricOption = METRIC_OPTIONS.find(o => o.id === chartMetric) || METRIC_OPTIONS[0];

  const getMetricTitle = useCallback((metric: ExerciseChartMetric) => {
    switch (metric) {
      case 'volume':
        return t('ui.history.chart_title', { unit: settings.weightUnit }) || `最近の総挙上重量 (${settings.weightUnit})`;
      case '1rm':
        return t('ui.history.chart_1rm_title', { unit: settings.weightUnit }) || `最近の推定1RM最大値 (${settings.weightUnit})`;
      case 'sets':
        return t('ui.history.chart_title_sets') || '最近の総セット数 (セット)';
      case 'avg_volume_per_set':
        return t('ui.history.chart_title_avg_volume_per_set', { unit: settings.weightUnit }) || `1セット平均負荷 (${settings.weightUnit}/セット)`;
      case 'density':
        return t('ui.history.chart_title_density', { unit: settings.weightUnit }) || `トレーニング密度 (${settings.weightUnit}/分)`;
      default:
        return t('ui.history.chart_title', { unit: settings.weightUnit });
    }
  }, [settings.weightUnit, t]);

  const getMetricUnitLabel = useCallback((metric: ExerciseChartMetric) => {
    switch (metric) {
      case 'volume':
      case '1rm':
        return settings.weightUnit;
      case 'sets':
        return 'セット';
      case 'avg_volume_per_set':
        return `${settings.weightUnit}/セット`;
      case 'density':
        return `${settings.weightUnit}/分`;
      default:
        return settings.weightUnit;
    }
  }, [settings.weightUnit]);

  return (
    <>
      {chartPoints.length > 0 && (
        <View style={styles.chartContainer}>
          {/* Header Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
            <Text style={styles.chartTitle}>
              {getMetricTitle(chartMetric)}
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
            <TouchableOpacity
              style={styles.metricSelectButton}
              onPress={() => setMetricModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name={currentMetricOption.icon} size={15} color={Theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.metricSelectText}>
                {t(currentMetricOption.titleKey)}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Theme.colors.textMuted} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

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
                <Text style={styles.summaryUnit}> {getMetricUnitLabel(chartMetric)}</Text>
              </Text>
            </View>
          )}

          {/* SVG Line & Area Chart */}
          <View style={styles.chartWrapper}>
            <ScrollView
              key={`${chartMetric}_${chartScale}`}
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

      {/* Metric Selector Modal */}
      <Modal
        visible={isMetricModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMetricModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMetricModalVisible(false)}
        >
          <View style={styles.metricModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.metricModalHeader}>
              <Text style={styles.metricModalTitle}>{t('ui.history.metric_select_title') || '表示する指標を選択'}</Text>
              <TouchableOpacity onPress={() => setMetricModalVisible(false)}>
                <Ionicons name="close" size={22} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {METRIC_OPTIONS.map(option => {
              const isSelected = chartMetric === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.metricOptionItem, isSelected && styles.metricOptionItemActive]}
                  onPress={() => {
                    setChartMetric(option.id);
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.metricIconContainer, isSelected && styles.metricIconContainerActive]}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? Theme.colors.primary : Theme.colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.metricOptionTitle, isSelected && styles.metricOptionTitleActive]}>
                        {t(option.titleKey)}
                      </Text>
                      {option.badge && (
                        <View style={[styles.recommendBadge, option.id === 'avg_volume_per_set' && styles.recommendBadgeStar]}>
                          <Text style={[styles.recommendBadgeText, option.id === 'avg_volume_per_set' && styles.recommendBadgeTextStar]}>
                            {option.badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.metricOptionSub}>{t(option.subKey)}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={Theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

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
  metricSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricSelectText: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
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

  // Metric Modal Styles
  metricModalContent: {
    width: '90%',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  metricOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Theme.borderRadius.md,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  metricOptionItemActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.08)',
    borderColor: Theme.colors.primary,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricIconContainerActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
  },
  metricOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  metricOptionTitleActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  metricOptionSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  recommendBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  recommendBadgeText: {
    color: Theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  recommendBadgeStar: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  recommendBadgeTextStar: {
    color: '#ffd700',
  },
});

