import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { useAppTheme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { translateStance } from '../../src/i18n';
import {
  ExerciseChartSummaryRow,
  getExerciseChartSummary,
  getExercisePRTimeline,
  getExerciseDetailCache,
  patchExerciseDetailCache,
} from '../../src/db/database';
import {
  ExerciseChartMetric,
  ExerciseChartScale,
  resolveEffectiveChartStance,
} from '../../src/utils/exerciseDetailPrefs';

export type { ExerciseChartMetric };

interface ExerciseChartsProps {
  exerciseId: number;
  chartSummary: ExerciseChartSummaryRow[];
  availableStances: string[];
  isLoadingChart?: boolean;
  settings: any;
  chartScale: ExerciseChartScale;
  setChartScale: (scale: ExerciseChartScale) => void;
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
  exerciseId,
  chartSummary,
  availableStances: rawAvailableStances,
  isLoadingChart = false,
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
  const { colors, spacing } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const chartScrollRef = useRef<ScrollView>(null);
  const exercisePref = useSettingsStore(
    useCallback(
      (state) => state.settings.exerciseChartPreferences[String(exerciseId)],
      [exerciseId]
    )
  );
  const globalMetric = useSettingsStore(state => state.settings.lastExerciseChartMetric);
  const setExerciseChartPreference = useSettingsStore(state => state.setExerciseChartPreference);
  const chartMetric: ExerciseChartMetric = exercisePref?.metric ?? globalMetric ?? 'volume';
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isMetricModalVisible, setMetricModalVisible] = useState(false);
  const [stanceSummaryMap, setStanceSummaryMap] = useState<Record<string, ExerciseChartSummaryRow[]>>({});
  const [isLoadingStance, setIsLoadingStance] = useState(false);
  const [prTimeline, setPrTimeline] = useState<{ date: string; weight: number }[] | null>(null);
  const [isLoadingPrTimeline, setIsLoadingPrTimeline] = useState(false);

  const availableStances = useMemo<string[]>(() => {
    if (!rawAvailableStances || rawAvailableStances.length === 0) return [];
    return [...rawAvailableStances].sort((a, b) => {
      if (a === 'default') return -1;
      if (b === 'default') return 1;
      return translateStance(a).localeCompare(translateStance(b));
    });
  }, [rawAvailableStances]);

  const showStanceSelector =
    availableStances.length > 1 || (availableStances.length === 1 && availableStances[0] !== 'default');
  const savedStance = exercisePref?.stance ?? 'all';
  const selectedStance = resolveEffectiveChartStance(
    savedStance,
    availableStances,
    isLoadingChart,
    showStanceSelector
  );

  useEffect(() => {
    setStanceSummaryMap({});
  }, [exerciseId]);

  const cachedStanceRows =
    selectedStance !== 'all'
      ? getExerciseDetailCache(exerciseId)?.chartSummaryByStance?.[selectedStance]
      : undefined;
  const resolvedStanceRows =
    selectedStance !== 'all' ? (stanceSummaryMap[selectedStance] ?? cachedStanceRows) : undefined;

  // スタンス別の軽量グラフ集計をオンデマンド取得（キャッシュ優先）
  useEffect(() => {
    if (isLoadingChart || selectedStance === 'all') {
      setIsLoadingStance(false);
      return;
    }
    if (stanceSummaryMap[selectedStance] !== undefined) {
      setIsLoadingStance(false);
      return;
    }

    if (cachedStanceRows !== undefined) {
      setStanceSummaryMap(prev => ({ ...prev, [selectedStance]: cachedStanceRows }));
      setIsLoadingStance(false);
      return;
    }

    let isActive = true;
    setIsLoadingStance(true);
    getExerciseChartSummary(exerciseId, selectedStance)
      .then(rows => {
        if (!isActive) return;
        setStanceSummaryMap(prev => ({ ...prev, [selectedStance]: rows }));
        patchExerciseDetailCache(exerciseId, {
          chartSummaryByStance: { [selectedStance]: rows },
        });
      })
      .catch(err => {
        console.warn('Failed to fetch stance chart summary:', err);
        if (isActive) {
          setStanceSummaryMap(prev => ({ ...prev, [selectedStance]: [] }));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingStance(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [exerciseId, isLoadingChart, selectedStance, stanceSummaryMap, cachedStanceRows]);

  // PR推移モーダル表示時にオンデマンド取得
  useEffect(() => {
    if (!showChartModal || selectedChartReps === null || selectedChartVariation === null) {
      setPrTimeline(null);
      return;
    }

    let isActive = true;
    setIsLoadingPrTimeline(true);
    getExercisePRTimeline(exerciseId, selectedChartReps, selectedChartVariation, 10)
      .then(timeline => {
        if (isActive) {
          setPrTimeline(timeline);
        }
      })
      .catch(err => {
        console.warn('Failed to fetch PR timeline:', err);
        if (isActive) {
          setPrTimeline([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingPrTimeline(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [exerciseId, showChartModal, selectedChartReps, selectedChartVariation]);

  // chartScale、chartMetric、selectedStanceが変更されたら選択位置をリセット
  useEffect(() => {
    setSelectedIndex(null);
  }, [chartScale, chartMetric, selectedStance]);

  const activeSummary = useMemo(() => {
    if (selectedStance === 'all') return chartSummary || [];
    return resolvedStanceRows || [];
  }, [selectedStance, chartSummary, resolvedStanceRows]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (!activeSummary || activeSummary.length === 0) return [];

    const processedHistory = activeSummary.map(row => {
      const setsCount = row.sets_count || 0;
      const totalSecs = row.total_secs || 0;
      const durationMin = totalSecs > 0 ? totalSecs / 60 : (setsCount > 0 ? setsCount * 2 : 0);

      return {
        start_time: row.start_time,
        volume: row.volume || 0,
        setsCount,
        max1Rm: row.max_1rm || 0,
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
  }, [activeSummary, chartScale, chartMetric]);

  const repChartData = useMemo(() => {
    if (!prTimeline || prTimeline.length === 0) return null;

    const displayTimeline = prTimeline.slice(-10);

    return {
      timeline: displayTimeline,
      chartData: {
        labels: displayTimeline.map((item, idx) => {
          if (displayTimeline.length <= 6) return item.date;
          if (idx === 0 || idx === displayTimeline.length - 1 || idx === Math.floor(displayTimeline.length / 2)) {
            return item.date;
          }
          return '';
        }),
        datasets: [
          {
            data: displayTimeline.map(item => item.weight)
          }
        ]
      }
    };
  }, [prTimeline]);

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

  const chartThemeColor = colors.primary;
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

  const shouldShowChartContainer = !isLoadingChart && chartSummary && chartSummary.length > 0 && (chartPoints.length > 0 || selectedStance !== 'all');

  return (
    <>
      {isLoadingChart && (
        <View style={styles.chartContainer}>
          <View style={styles.chartPlaceholder}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      )}
      {shouldShowChartContainer && (
        <View style={styles.chartContainer}>
          {/* Header Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text style={styles.chartTitle}>
              {getMetricTitle(chartMetric)}
            </Text>
            <TouchableOpacity 
              style={styles.calendarBtn}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Selectors Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: showStanceSelector ? spacing.sm : spacing.md }}>
            <TouchableOpacity
              style={styles.metricSelectButton}
              onPress={() => setMetricModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name={currentMetricOption.icon} size={15} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.metricSelectText}>
                {t(currentMetricOption.titleKey)}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
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

          {/* Stance Filter Chips */}
          {showStanceSelector && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.stanceChipsScroll}
              contentContainerStyle={styles.stanceChipsContainer}
            >
              <TouchableOpacity
                style={[styles.stanceChip, selectedStance === 'all' && styles.stanceChipActive]}
                onPress={() => setExerciseChartPreference(exerciseId, { stance: 'all' })}
                activeOpacity={0.7}
              >
                <Text style={[styles.stanceChipText, selectedStance === 'all' && styles.stanceChipTextActive]}>
                  {t('ui.exercise_detail.stance_all')}
                </Text>
              </TouchableOpacity>

              {availableStances.map(stance => {
                const isSelected = selectedStance === stance;
                const label = stance === 'default'
                  ? t('ui.exercise_detail.stance_none')
                  : translateStance(stance);
                return (
                  <TouchableOpacity
                    key={stance}
                    style={[styles.stanceChip, isSelected && styles.stanceChipActive]}
                    onPress={() => setExerciseChartPreference(exerciseId, { stance })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.stanceChipText, isSelected && styles.stanceChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

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
            {isLoadingStance || (selectedStance !== 'all' && resolvedStanceRows === undefined) ? (
              <View style={styles.emptyStanceBox}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : chartPoints.length === 0 ? (
              <View style={styles.emptyStanceBox}>
                <Ionicons name="analytics-outline" size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyStanceText}>
                  {t('ui.exercise_detail.no_stance_chart_data')}
                </Text>
              </View>
            ) : (
            <ScrollView
              key={`${chartMetric}_${chartScale}_${selectedStance}`}
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
                          fill={isSelected ? chartThemeColor : colors.card}
                          stroke={isSelected ? '#ffffff' : chartThemeColor}
                          strokeWidth={isSelected ? 2 : 2.5}
                        />

                        {/* X-Axis Date Label */}
                        <SvgText
                          x={c.x}
                          y={svgHeight - 10}
                          fill={isSelected ? chartThemeColor : colors.textMuted}
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
            )}
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMetricModalVisible(false)}
        >
          <Pressable style={styles.metricModalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.metricModalHeader}>
              <Text style={styles.metricModalTitle}>{t('ui.history.metric_select_title') || '表示する指標を選択'}</Text>
              <TouchableOpacity
                onPress={() => setMetricModalVisible(false)}
                style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {METRIC_OPTIONS.map(option => {
              const isSelected = chartMetric === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.metricOptionItem, isSelected && styles.metricOptionItemActive]}
                  onPress={() => {
                    setExerciseChartPreference(exerciseId, { metric: option.id });
                    setMetricModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.metricIconContainer, isSelected && styles.metricIconContainerActive]}>
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={isSelected ? colors.primary : colors.textMuted}
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
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* PR Progression Chart Modal */}
      <Modal
        visible={showChartModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChartModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowChartModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalTitle}>
                  {selectedChartReps ? t('ui.exercise_detail.progression_chart_title', { reps: selectedChartReps }) : ''}
                </Text>
                {selectedChartVariation !== null && (
                  <View style={styles.modalStanceBadge}>
                    <Text style={styles.modalStanceBadgeText}>
                      {selectedChartVariation === 'default'
                        ? t('ui.exercise_detail.stance_none')
                        : `${t('ui.active_workout.stance_label')}: ${translateStance(selectedChartVariation)}`}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShowChartModal(false)}
                style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {(() => {
              if (isLoadingPrTimeline) {
                return (
                  <View style={{ padding: 36, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                );
              }
              const res = repChartData;
              if (!res) {
                return (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: colors.textMuted }}>No history found for this rep target.</Text>
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
                      <Text style={[styles.analysisValue, { color: colors.primary }]}>{currentPRWeight} {settings.weightUnit}</Text>
                    </View>
                    <View style={styles.analysisCard}>
                      <Text style={styles.analysisLabel}>{t('ui.exercise_detail.improvement_value')}</Text>
                      <Text style={[styles.analysisValue, { color: diff >= 0 ? colors.success : colors.danger }]}>
                        {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} {settings.weightUnit}
                      </Text>
                    </View>
                  </View>

                  <LineChart
                    data={chartData}
                    width={Dimensions.get('window').width * 0.8}
                    height={220}
                    chartConfig={{
                      backgroundColor: colors.card,
                      backgroundGradientFrom: colors.card,
                      backgroundGradientTo: colors.card,
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      propsForDots: {
                        r: "5",
                        strokeWidth: "2",
                        stroke: colors.primary
                      }
                    }}
                    bezier
                    style={{ borderRadius: 12, marginVertical: 16 }}
                  />
                </ScrollView>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  spacing: ReturnType<typeof useAppTheme>['spacing']
) => StyleSheet.create({
  chartContainer: { paddingHorizontal: spacing.lg, marginVertical: spacing.md },
  chartPlaceholder: {
    minHeight: 260,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
  metricSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricSelectText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  scaleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    alignSelf: 'flex-start',
  },
  scaleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 8,
  },
  scaleButtonActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.14)',
  },
  scaleButtonText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  scaleButtonTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  calendarBtn: {
    backgroundColor: colors.card,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stanceChipsScroll: {
    marginBottom: spacing.md,
  },
  stanceChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  stanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  stanceChipActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.14)',
    borderColor: colors.primary,
  },
  stanceChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  stanceChipTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  emptyStanceBox: {
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStanceText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryDate: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryVal: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryUnit: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chartWrapper: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, maxHeight: '95%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalStanceBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.25)',
  },
  modalStanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  analysisRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  analysisCard: { flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 10, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  analysisLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  analysisValue: { fontSize: 14, fontWeight: 'bold', color: colors.text },

  // Metric Modal Styles
  metricModalContent: {
    width: '90%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
  },
  metricOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricOptionItemActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.08)',
    borderColor: colors.primary,
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
    color: colors.text,
  },
  metricOptionTitleActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  metricOptionSub: {
    fontSize: 12,
    color: colors.textMuted,
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
    color: colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  recommendBadgeStar: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  recommendBadgeTextStar: {
    color: '#ffd700',
  },
});

