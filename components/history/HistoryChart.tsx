import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, Rect, G } from 'react-native-svg';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { Theme } from '../../src/theme';
import { getWorkoutPRStatsMap, WorkoutPRStat } from '../../src/db/database';

interface HistoryChartProps {
  workouts: any[];
  chartScale: 'day' | 'week' | 'month' | 'year';
  setChartScale: (scale: 'day' | 'week' | 'month' | 'year') => void;
  chartMetric: 'volume' | 'calories';
  setChartMetric: (metric: 'volume' | 'calories') => void;
  weightUnit: string;
  t: (key: string, options?: any) => string;
}

interface ChartPoint {
  id: string;
  label: string;
  dateStr: string;
  value: number; // Actual Volume or Calories
  targetVolume: number; // Sum of PR Max Volume for exercises done
  ratio: number; // Percentage (e.g. 93.7)
  isPR: boolean;
}

// Linear Path Generator (点と点を直線で結ぶ)
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
  t,
}) => {
  const chartScrollRef = useRef<ScrollView>(null);
  const [prStatsMap, setPrStatsMap] = useState<Record<number, WorkoutPRStat>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    getWorkoutPRStatsMap().then(map => {
      if (isMounted) setPrStatsMap(map);
    });
    return () => { isMounted = false; };
  }, [workouts]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (workouts.length === 0) return [];

    const getValue = (w: any) => {
      const val = chartMetric === 'volume' ? w.volume : w.calories;
      return (val && val > 0) ? val : 0;
    };

    if (chartScale === 'day') {
      const wRev = [...workouts].reverse().slice(-40);
      return wRev.map(w => {
        const prStat = prStatsMap[w.id];
        const val = getValue(w);
        const targetVol = prStat ? prStat.prTargetVolume : val;
        const ratio = prStat ? prStat.prRatio : (targetVol > 0 ? (val / targetVol) * 100 : 100);
        const dateObj = new Date(w.start_time);

        return {
          id: String(w.id),
          label: format(dateObj, 'MM/dd'),
          dateStr: format(dateObj, 'MM/dd (eee)'),
          value: val,
          targetVolume: targetVol,
          ratio: Math.round(ratio * 10) / 10,
          isPR: ratio >= 100 && val > 0,
        };
      });
    }

    if (chartScale === 'week') {
      const weeklyData: { [key: string]: { date: Date; val: number; target: number } } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const key = weekStart.toISOString();
        if (!weeklyData[key]) {
          weeklyData[key] = { date: weekStart, val: 0, target: 0 };
        }
        const prStat = prStatsMap[w.id];
        const val = getValue(w);
        weeklyData[key].val += val;
        weeklyData[key].target += prStat ? prStat.prTargetVolume : val;
      });

      const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
      return sortedWeeks.map(w => {
        const ratio = w.target > 0 ? (w.val / w.target) * 100 : 100;
        return {
          id: w.date.toISOString(),
          label: format(w.date, 'MM/dd'),
          dateStr: `${format(w.date, 'MM/dd')}週`,
          value: w.val,
          targetVolume: w.target,
          ratio: Math.round(ratio * 10) / 10,
          isPR: ratio >= 100 && w.val > 0,
        };
      });
    }

    if (chartScale === 'month') {
      const monthlyData: { [key: string]: { date: Date; val: number; target: number } } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const monthStart = startOfMonth(date);
        const key = monthStart.toISOString();
        if (!monthlyData[key]) {
          monthlyData[key] = { date: monthStart, val: 0, target: 0 };
        }
        const prStat = prStatsMap[w.id];
        const val = getValue(w);
        monthlyData[key].val += val;
        monthlyData[key].target += prStat ? prStat.prTargetVolume : val;
      });

      const sortedMonths = Object.values(monthlyData).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
      return sortedMonths.map(m => {
        const ratio = m.target > 0 ? (m.val / m.target) * 100 : 100;
        return {
          id: m.date.toISOString(),
          label: format(m.date, 'yyyy/MM'),
          dateStr: format(m.date, 'yyyy年M月'),
          value: m.val,
          targetVolume: m.target,
          ratio: Math.round(ratio * 10) / 10,
          isPR: ratio >= 100 && m.val > 0,
        };
      });
    }

    if (chartScale === 'year') {
      const yearlyData: { [key: string]: { date: Date; val: number; target: number } } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const key = yearStart.toISOString();
        if (!yearlyData[key]) {
          yearlyData[key] = { date: yearStart, val: 0, target: 0 };
        }
        const prStat = prStatsMap[w.id];
        const val = getValue(w);
        yearlyData[key].val += val;
        yearlyData[key].target += prStat ? prStat.prTargetVolume : val;
      });

      const sortedYears = Object.values(yearlyData).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-40);
      return sortedYears.map(y => {
        const ratio = y.target > 0 ? (y.val / y.target) * 100 : 100;
        return {
          id: y.date.toISOString(),
          label: format(y.date, 'yyyy'),
          dateStr: format(y.date, 'yyyy年'),
          value: y.val,
          targetVolume: y.target,
          ratio: Math.round(ratio * 10) / 10,
          isPR: ratio >= 100 && y.val > 0,
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
  const maxVal = Math.max(1, ...chartPoints.map(p => p.value));

  const coords = chartPoints.map((p, idx) => {
    const x = (idx + 0.5) * pointWidth;
    let y: number;

    if (chartMetric === 'volume') {
      const ratioNorm = Math.min(130, p.ratio) / maxRatio;
      y = svgHeight - paddingBottom - (ratioNorm * drawHeight);
    } else {
      const valNorm = p.value / maxVal;
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

  return (
    <View style={styles.chartContainer}>
      {/* Header & Titles */}
      <Text style={styles.chartTitle}>
        {chartMetric === 'volume' 
          ? t('ui.history.chart_title', { unit: weightUnit }) 
          : t('ui.history.chart_title_calories')}
      </Text>

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

        {/* Metric Selector */}
        <View style={styles.scaleContainer}>
          {(['volume', 'calories'] as const).map(metric => (
            <TouchableOpacity
              key={metric}
              style={[styles.scaleButton, chartMetric === metric && styles.scaleButtonActive]}
              onPress={() => {
                setChartMetric(metric);
                setSelectedIndex(null);
              }}
            >
              <Text style={[styles.scaleButtonText, chartMetric === metric && styles.scaleButtonTextActive]}>
                {metric === 'volume' ? t('ui.history.volume_label') : (t('ui.common.calories') || 'Calories')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active Selected Point Summary Card */}
      {activePoint && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryDate}>{activePoint.dateStr}</Text>
          <View style={styles.summaryValRow}>
            <Text style={styles.summaryVal}>
              {activePoint.value.toLocaleString()} 
              <Text style={styles.summaryUnit}> {chartMetric === 'volume' ? weightUnit : 'kcal'}</Text>
            </Text>

            {chartMetric === 'volume' && (
              <View style={[styles.badge, activePoint.isPR && styles.badgePR]}>
                <Text style={[styles.badgeText, activePoint.isPR && styles.badgeTextPR]}>
                  {activePoint.isPR ? `PR! (比 ${activePoint.ratio}%)` : `PR比 ${activePoint.ratio}%`}
                </Text>
              </View>
            )}
          </View>
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

              {/* 100% PR Target Baseline */}
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

              {/* Linear Line Path (点と点を直接直線で結ぶ) */}
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
                const isPR = c.point.isPR;

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

                    {/* PR Badge */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    marginBottom: Theme.spacing.xl,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: Theme.spacing.md,
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
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    justifyContent: 'space-between',
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
});


