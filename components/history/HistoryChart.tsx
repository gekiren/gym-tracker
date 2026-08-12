import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, Rect, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { Theme } from '../../src/theme';
import { getWorkoutPRStatsMap, WorkoutPRStat } from '../../src/db/database';

export type ChartMetric = 'volume' | 'calories' | 'sets' | 'avg_volume_per_set' | 'density';

interface HistoryChartProps {
  workouts: any[];
  chartScale: 'day' | 'week' | 'month' | 'year';
  setChartScale: (scale: 'day' | 'week' | 'month' | 'year') => void;
  chartMetric: ChartMetric;
  setChartMetric: (metric: ChartMetric) => void;
  weightUnit: string;
  setCalendarVisible?: (visible: boolean) => void;
  t: (key: string, options?: any) => string;
}

interface ChartPoint {
  id: string;
  label: string;
  dateStr: string;
  value: number; // Metric Value
  targetVolume: number; // Sum of PR Max Volume
  ratio: number; // Percentage
  isPR: boolean;
}

interface PeriodAggregate {
  date: Date;
  volume: number;
  calories: number;
  sets: number;
  durationMin: number;
  targetVolume: number;
}

// 運動時間（分）の安全な計算
function getWorkoutDurationMin(w: any): number {
  if (w.start_time && w.end_time) {
    const start = new Date(w.start_time).getTime();
    const end = new Date(w.end_time).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      return (end - start) / 60000;
    }
  }
  return 0;
}

// 単一ワークアウトの指標値計算
function calculateSingleMetricValue(w: any, metric: ChartMetric): number {
  const vol = w.volume && w.volume > 0 ? w.volume : 0;
  const cal = w.calories && w.calories > 0 ? w.calories : 0;
  const sets = w.total_sets && w.total_sets > 0 ? w.total_sets : 0;

  switch (metric) {
    case 'volume':
      return vol;
    case 'calories':
      return cal;
    case 'sets':
      return sets;
    case 'avg_volume_per_set':
      return sets > 0 ? vol / sets : 0;
    case 'density': {
      const durationMin = getWorkoutDurationMin(w);
      return durationMin > 0 ? vol / durationMin : 0;
    }
    default:
      return vol;
  }
}

// 期間集計データの指標値計算
function calculatePeriodMetricValue(item: PeriodAggregate, metric: ChartMetric): number {
  switch (metric) {
    case 'volume':
      return item.volume;
    case 'calories':
      return item.calories;
    case 'sets':
      return item.sets;
    case 'avg_volume_per_set':
      return item.sets > 0 ? item.volume / item.sets : 0;
    case 'density':
      return item.durationMin > 0 ? item.volume / item.durationMin : 0;
    default:
      return item.volume;
  }
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

export const HistoryChart: React.FC<HistoryChartProps> = ({
  workouts,
  chartScale,
  setChartScale,
  chartMetric,
  setChartMetric,
  weightUnit,
  setCalendarVisible,
  t,
}) => {
  const chartScrollRef = useRef<ScrollView>(null);
  const [prStatsMap, setPrStatsMap] = useState<Record<number, WorkoutPRStat>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isMetricModalVisible, setMetricModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getWorkoutPRStatsMap().then(map => {
      if (isMounted) setPrStatsMap(map);
    });
    return () => { isMounted = false; };
  }, [workouts]);

  const METRIC_OPTIONS: { 
    id: ChartMetric; 
    titleKey: string; 
    subKey: string; 
    icon: keyof typeof Ionicons.glyphMap; 
    badge?: string 
  }[] = [
    { id: 'volume', titleKey: 'ui.history.metric_volume', subKey: 'ui.history.metric_volume_sub', icon: 'bar-chart-outline', badge: 'デフォルト' },
    { id: 'calories', titleKey: 'ui.history.metric_calories', subKey: 'ui.history.metric_calories_sub', icon: 'flame-outline' },
    { id: 'sets', titleKey: 'ui.history.metric_sets', subKey: 'ui.history.metric_sets_sub', icon: 'layers-outline' },
    { id: 'avg_volume_per_set', titleKey: 'ui.history.metric_avg_volume_per_set', subKey: 'ui.history.metric_avg_volume_per_set_sub', icon: 'fitness-outline', badge: 'おすすめ' },
    { id: 'density', titleKey: 'ui.history.metric_density', subKey: 'ui.history.metric_density_sub', icon: 'speedometer-outline' },
  ];

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (workouts.length === 0) return [];

    if (chartScale === 'day') {
      const wRev = [...workouts].reverse().slice(-40);
      return wRev.map(w => {
        const prStat = prStatsMap[w.id];
        const val = calculateSingleMetricValue(w, chartMetric);
        const actualVol = w.volume && w.volume > 0 ? w.volume : 0;
        const targetVol = prStat ? prStat.prTargetVolume : actualVol;
        const ratio = prStat ? prStat.prRatio : (targetVol > 0 ? (actualVol / targetVol) * 100 : 100);
        const dateObj = new Date(w.start_time);

        return {
          id: String(w.id),
          label: format(dateObj, 'MM/dd'),
          dateStr: format(dateObj, 'MM/dd (eee)'),
          value: val,
          targetVolume: targetVol,
          ratio: Math.round(ratio * 10) / 10,
          isPR: ratio >= 100 && actualVol > 0,
        };
      });
    }

    if (chartScale === 'week') {
      const weeklyData: { [key: string]: PeriodAggregate } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const key = weekStart.toISOString();
        if (!weeklyData[key]) {
          weeklyData[key] = { date: weekStart, volume: 0, calories: 0, sets: 0, durationMin: 0, targetVolume: 0 };
        }
        const prStat = prStatsMap[w.id];
        const vol = w.volume || 0;
        weeklyData[key].volume += vol;
        weeklyData[key].calories += w.calories || 0;
        weeklyData[key].sets += w.total_sets || 0;
        weeklyData[key].durationMin += getWorkoutDurationMin(w);
        weeklyData[key].targetVolume += prStat ? prStat.prTargetVolume : vol;
      });

      const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
      return sortedWeeks.map(w => {
        const val = calculatePeriodMetricValue(w, chartMetric);
        const ratio = w.targetVolume > 0 ? (w.volume / w.targetVolume) * 100 : 100;
        return {
          id: w.date.toISOString(),
          label: format(w.date, 'MM/dd'),
          dateStr: `${format(w.date, 'MM/dd')}週`,
          value: val,
          targetVolume: w.targetVolume,
          ratio: Math.round(ratio * 10) / 10,
          isPR: ratio >= 100 && w.volume > 0,
        };
      });
    }

    if (chartScale === 'month') {
      const monthlyData: { [key: string]: PeriodAggregate } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const monthStart = startOfMonth(date);
        const key = monthStart.toISOString();
        if (!monthlyData[key]) {
          monthlyData[key] = { date: monthStart, volume: 0, calories: 0, sets: 0, durationMin: 0, targetVolume: 0 };
        }
        const prStat = prStatsMap[w.id];
        const vol = w.volume || 0;
        monthlyData[key].volume += vol;
        monthlyData[key].calories += w.calories || 0;
        monthlyData[key].sets += w.total_sets || 0;
        monthlyData[key].durationMin += getWorkoutDurationMin(w);
        monthlyData[key].targetVolume += prStat ? prStat.prTargetVolume : vol;
      });

      const sortedMonths = Object.values(monthlyData).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
      return sortedMonths.map(m => {
        const val = calculatePeriodMetricValue(m, chartMetric);
        const ratio = m.targetVolume > 0 ? (m.volume / m.targetVolume) * 100 : 100;
        return {
          id: m.date.toISOString(),
          label: format(m.date, 'yyyy/MM'),
          dateStr: format(m.date, 'yyyy年M月'),
          value: val,
          targetVolume: m.targetVolume,
          ratio: Math.round(ratio * 10) / 10,
          isPR: ratio >= 100 && m.volume > 0,
        };
      });
    }

    if (chartScale === 'year') {
      const yearlyData: { [key: string]: PeriodAggregate } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const key = yearStart.toISOString();
        if (!yearlyData[key]) {
          yearlyData[key] = { date: yearStart, volume: 0, calories: 0, sets: 0, durationMin: 0, targetVolume: 0 };
        }
        const prStat = prStatsMap[w.id];
        const vol = w.volume || 0;
        yearlyData[key].volume += vol;
        yearlyData[key].calories += w.calories || 0;
        yearlyData[key].sets += w.total_sets || 0;
        yearlyData[key].durationMin += getWorkoutDurationMin(w);
        yearlyData[key].targetVolume += prStat ? prStat.prTargetVolume : vol;
      });

      const sortedYears = Object.values(yearlyData).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
      return sortedYears.map(y => {
        const val = calculatePeriodMetricValue(y, chartMetric);
        const ratio = y.targetVolume > 0 ? (y.volume / y.targetVolume) * 100 : 100;
        return {
          id: y.date.toISOString(),
          label: format(y.date, 'yyyy'),
          dateStr: format(y.date, 'yyyy年'),
          value: val,
          targetVolume: y.targetVolume,
          ratio: Math.round(ratio * 10) / 10,
          isPR: ratio >= 100 && y.volume > 0,
        };
      });
    }

    return [];
  }, [workouts, chartScale, chartMetric, prStatsMap]);

  const activeIndex = selectedIndex !== null && selectedIndex < chartPoints.length 
    ? selectedIndex 
    : (chartPoints.length > 0 ? chartPoints.length - 1 : null);

  const activePoint = activeIndex !== null ? chartPoints[activeIndex] : null;

  if (chartPoints.length === 0) return null;

  const pointWidth = 64;
  const svgHeight = 180;
  const paddingTop = 45;
  const paddingBottom = 35;
  const drawHeight = svgHeight - paddingTop - paddingBottom;
  const svgWidth = Math.max(Dimensions.get('window').width - 32, chartPoints.length * pointWidth);

  const maxRatio = Math.max(115, ...chartPoints.map(p => p.ratio));
  const maxVal = Math.max(0.001, ...chartPoints.map(p => p.value));

  const coords = chartPoints.map((p, idx) => {
    const x = (idx + 0.5) * pointWidth;
    let y: number;

    if (chartMetric === 'volume') {
      const ratioNorm = Math.min(130, p.ratio) / maxRatio;
      y = svgHeight - paddingBottom - (ratioNorm * drawHeight);
    } else {
      const valNorm = maxVal > 0 ? p.value / maxVal : 0;
      y = svgHeight - paddingBottom - (valNorm * drawHeight);
    }
    return { x, y, point: p, idx };
  });

  const prTargetY = chartMetric === 'volume' 
    ? svgHeight - paddingBottom - ((100 / maxRatio) * drawHeight)
    : null;

  const linearPath = createLinearPath(coords.map(c => ({ x: c.x, y: c.y })));
  const areaPath = coords.length > 0 
    ? `${linearPath} L ${coords[coords.length - 1].x} ${svgHeight - paddingBottom} L ${coords[0].x} ${svgHeight - paddingBottom} Z`
    : '';

  // メトリック別タイトル取得
  const getChartTitleText = () => {
    switch (chartMetric) {
      case 'volume':
        return t('ui.history.chart_title', { unit: weightUnit });
      case 'calories':
        return t('ui.history.chart_title_calories');
      case 'sets':
        return t('ui.history.chart_title_sets') || '最近の総セット数 (セット)';
      case 'avg_volume_per_set':
        return t('ui.history.chart_title_avg_volume_per_set', { unit: weightUnit }) || `1セット平均負荷 (${weightUnit}/セット)`;
      case 'density':
        return t('ui.history.chart_title_density', { unit: weightUnit }) || `トレーニング密度 (${weightUnit}/分)`;
      default:
        return t('ui.history.chart_title', { unit: weightUnit });
    }
  };

  // メトリック別ラベル＆サマリー文字列取得
  const getFormattedSummary = (val: number) => {
    switch (chartMetric) {
      case 'volume':
        return { valStr: Math.round(val).toLocaleString(), unitStr: weightUnit };
      case 'calories':
        return { valStr: Math.round(val).toLocaleString(), unitStr: 'kcal' };
      case 'sets':
        return { valStr: Math.round(val).toLocaleString(), unitStr: t('ui.history.metric_sets') || 'セット' };
      case 'avg_volume_per_set':
        return { 
          valStr: (Math.round(val * 10) / 10).toLocaleString(), 
          unitStr: `${weightUnit}/${t('ui.history.metric_sets') || 'セット'}` 
        };
      case 'density':
        return { 
          valStr: (Math.round(val * 10) / 10).toLocaleString(), 
          unitStr: `${weightUnit}/${t('ui.common.min_unit') || '分'}` 
        };
      default:
        return { valStr: Math.round(val).toLocaleString(), unitStr: weightUnit };
    }
  };

  const currentOption = METRIC_OPTIONS.find(o => o.id === chartMetric) || METRIC_OPTIONS[0];

  return (
    <View style={styles.chartContainer}>
      {/* Header & Titles */}
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>{getChartTitleText()}</Text>
      </View>

      {/* Selectors Row */}
      <View style={styles.selectorsRow}>
        {/* Scale Selector */}
        <View style={styles.scaleContainer}>
          {(['day', 'week', 'month', 'year'] as const).map(scale => (
            <TouchableOpacity
              key={scale}
              style={[styles.scaleButton, chartScale === scale && styles.scaleButtonActive]}
              onPress={() => {
                setChartScale(scale);
                setSelectedIndex(null);
              }}
            >
              <Text style={[styles.scaleButtonText, chartScale === scale && styles.scaleButtonTextActive]}>
                {t(`ui.history.scale_${scale}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metric Selector Button (Opens Modal) */}
        <TouchableOpacity
          style={styles.metricSelectBtn}
          onPress={() => setMetricModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name={currentOption.icon} size={15} color={Theme.colors.primary} style={{ marginRight: 5 }} />
          <Text style={styles.metricSelectBtnText} numberOfLines={1}>
            {t(currentOption.titleKey)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={Theme.colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      {/* Active Selected Point Summary Card & Calendar Button */}
      {activePoint && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryLeftContent}>
            <Text style={styles.summaryDate}>{activePoint.dateStr}</Text>
            <View style={styles.summaryValRow}>
              {(() => {
                const { valStr, unitStr } = getFormattedSummary(activePoint.value);
                return (
                  <Text style={styles.summaryVal}>
                    {valStr}
                    <Text style={styles.summaryUnit}> {unitStr}</Text>
                  </Text>
                );
              })()}

              {chartMetric === 'volume' && (
                <View style={[styles.badge, activePoint.isPR && styles.badgePR]}>
                  <Text style={[styles.badgeText, activePoint.isPR && styles.badgeTextPR]}>
                    {activePoint.isPR ? `PR! (比 ${activePoint.ratio}%)` : `PR比 ${activePoint.ratio}%`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {setCalendarVisible && (
            <TouchableOpacity 
              style={styles.calendarBtnPanel}
              onPress={() => setCalendarVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color={Theme.colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.calendarBtnText}>{t('ui.history.calendar_btn') || 'カレンダー'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Linear Area Line Chart Canvas */}
      <View style={styles.chartWrapper}>
        <ScrollView
          key={`${chartScale}_${chartMetric}`}
          ref={chartScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => chartScrollRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={styles.chartScrollContent}
        >
          <View style={{ width: svgWidth, height: svgHeight, position: 'relative' }}>
            <Svg width={svgWidth} height={svgHeight} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={Theme.colors.primary} stopOpacity={0.35} />
                  <Stop offset="100%" stopColor={Theme.colors.primary} stopOpacity={0.0} />
                </LinearGradient>
              </Defs>

              {/* 100% PR Target Baseline (Volume時のみ) */}
              {prTargetY !== null && (
                <>
                  <Line
                    x1={0}
                    y1={prTargetY}
                    x2={svgWidth}
                    y2={prTargetY}
                    stroke={Theme.colors.primary}
                    strokeOpacity={0.35}
                    strokeDasharray="4,4"
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={svgWidth - 10}
                    y={prTargetY - 6}
                    fill={Theme.colors.primary}
                    fontSize={10}
                    fontWeight="600"
                    opacity={0.7}
                    textAnchor="end"
                  >
                    100% PR Target
                  </SvgText>
                </>
              )}

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
                <Path d={areaPath} fill="url(#areaGrad)" />
              )}

              {/* Linear Line Path */}
              {linearPath !== '' && (
                <Path
                  d={linearPath}
                  fill="none"
                  stroke={Theme.colors.primary}
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* Data Points & Active Ring */}
              {coords.map(c => {
                const isSelected = c.idx === activeIndex;
                const isPR = chartMetric === 'volume' && c.point.isPR;

                return (
                  <G key={c.point.id}>
                    {/* Vertical Guide Line on Active Selection */}
                    {isSelected && (
                      <Line
                        x1={c.x}
                        y1={paddingTop - 10}
                        x2={c.x}
                        y2={svgHeight - paddingBottom}
                        stroke={Theme.colors.primary}
                        strokeOpacity={0.35}
                        strokeDasharray="3,3"
                        strokeWidth={1.5}
                      />
                    )}

                    {/* PR Badge (Volume時のみ) */}
                    {isPR && (
                      <G transform={`translate(${c.x - 16}, ${c.y - 28})`}>
                        <Rect width={32} height={16} rx={4} fill="#fbbf24" />
                        <SvgText
                          x={16}
                          y={11}
                          fill="#000000"
                          fontSize={9}
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          PR!
                        </SvgText>
                      </G>
                    )}

                    {/* Active Halo Outer Ring */}
                    {isSelected && (
                      <Circle
                        cx={c.x}
                        cy={c.y}
                        r={10}
                        fill="none"
                        stroke={Theme.colors.primary}
                        strokeOpacity={0.4}
                        strokeWidth={2}
                      />
                    )}

                    {/* Point Circle */}
                    <Circle
                      cx={c.x}
                      cy={c.y}
                      r={isSelected ? 5.5 : 4}
                      fill={isPR ? '#fbbf24' : (isSelected ? Theme.colors.primary : '#121212')}
                      stroke={isSelected ? '#ffffff' : (isPR ? '#ffffff' : Theme.colors.primary)}
                      strokeWidth={isSelected ? 2 : 2.5}
                    />

                    {/* X-Axis Date Label */}
                    <SvgText
                      x={c.x}
                      y={svgHeight - 10}
                      fill={isSelected ? Theme.colors.primary : (isPR ? '#fbbf24' : Theme.colors.textMuted)}
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

            {/* Transparent Touch Layer Area for 100% Reliable Tapping */}
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

      {/* Metric Selection Modal */}
      <Modal
        visible={isMetricModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMetricModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMetricModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="stats-chart" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>
                  {t('ui.history.metric_select_title') || 'グラフの指標を選択'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setMetricModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {METRIC_OPTIONS.map((option) => {
                const isSelected = chartMetric === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.metricOptionItem, isSelected && styles.metricOptionItemActive]}
                    onPress={() => {
                      setChartMetric(option.id);
                      setSelectedIndex(null);
                      setMetricModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxActive]}>
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={isSelected ? Theme.colors.primary : Theme.colors.textMuted}
                      />
                    </View>
                    <View style={styles.optionTextContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[styles.optionTitle, isSelected && styles.optionTitleActive]}>
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
                      <Text style={styles.optionSub}>{t(option.subKey)}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    marginBottom: Theme.spacing.xl,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 0,
  },
  selectorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  scaleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  scaleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scaleButtonActive: {
    backgroundColor: 'rgba(79,172,254,0.15)',
  },
  scaleButtonText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  scaleButtonTextActive: {
    color: Theme.colors.primary,
    fontWeight: 'bold',
  },
  metricSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: 160,
  },
  metricSelectBtnText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    maxWidth: 100,
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
  summaryLeftContent: {
    flex: 1,
    marginRight: 10,
  },
  summaryDate: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  summaryValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryVal: {
    color: Theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  summaryUnit: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  calendarBtnPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexShrink: 0,
  },
  calendarBtnText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePR: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  badgeText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextPR: {
    color: '#fbbf24',
  },
  chartWrapper: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  chartScrollContent: {
    paddingLeft: 10,
    paddingRight: 10,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metricOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricOptionItemActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    borderColor: Theme.colors.primary,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionIconBoxActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
  },
  optionTextContent: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e5e5e7',
  },
  optionTitleActive: {
    color: Theme.colors.primary,
  },
  optionSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  recommendBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  recommendBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Theme.colors.textMuted,
  },
  recommendBadgeStar: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  recommendBadgeTextStar: {
    color: '#fbbf24',
  },
});



