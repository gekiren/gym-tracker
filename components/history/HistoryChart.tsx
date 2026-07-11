import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { Theme } from '../../src/theme';

interface HistoryChartProps {
  workouts: any[];
  chartScale: 'day' | 'week' | 'month' | 'year';
  setChartScale: (scale: 'day' | 'week' | 'month' | 'year') => void;
  chartMetric: 'volume' | 'calories';
  setChartMetric: (metric: 'volume' | 'calories') => void;
  weightUnit: string;
  t: (key: string, options?: any) => string;
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

  const chartData = useMemo(() => {
    if (workouts.length === 0) return null;

    const getValue = (w: any) => {
      const val = chartMetric === 'volume' ? w.volume : w.calories;
      return (val && val > 0) ? val : 0;
    };

    if (chartScale === 'day') {
      const wRev = [...workouts].reverse();
      if (wRev.length < 1) return null;
      return {
        labels: wRev.map(w => format(new Date(w.start_time), 'MM/dd')).slice(-50),
        datasets: [
          {
            data: wRev.map(w => getValue(w)).slice(-50)
          }
        ]
      };
    }

    if (chartScale === 'week') {
      const weeklyData: { [key: string]: { date: Date; value: number } } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const key = weekStart.toISOString();
        if (!weeklyData[key]) {
          weeklyData[key] = { date: weekStart, value: 0 };
        }
        weeklyData[key].value += getValue(w);
      });

      const sortedWeeks = Object.values(weeklyData).sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedWeeks.length < 1) return null;

      const recentWeeks = sortedWeeks.slice(-50);
      return {
        labels: recentWeeks.map(w => format(w.date, 'MM/dd')),
        datasets: [
          {
            data: recentWeeks.map(w => w.value)
          }
        ]
      };
    }

    if (chartScale === 'month') {
      const monthlyData: { [key: string]: { date: Date; value: number } } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const monthStart = startOfMonth(date);
        const key = monthStart.toISOString();
        if (!monthlyData[key]) {
          monthlyData[key] = { date: monthStart, value: 0 };
        }
        monthlyData[key].value += getValue(w);
      });

      const sortedMonths = Object.values(monthlyData).sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedMonths.length < 1) return null;

      const recentMonths = sortedMonths.slice(-50);
      return {
        labels: recentMonths.map(w => format(w.date, 'yyyy/MM')),
        datasets: [
          {
            data: recentMonths.map(w => w.value)
          }
        ]
      };
    }

    if (chartScale === 'year') {
      const yearlyData: { [key: string]: { date: Date; value: number } } = {};
      workouts.forEach(w => {
        const date = new Date(w.start_time);
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const key = yearStart.toISOString();
        if (!yearlyData[key]) {
          yearlyData[key] = { date: yearStart, value: 0 };
        }
        yearlyData[key].value += getValue(w);
      });

      const sortedYears = Object.values(yearlyData).sort((a, b) => a.date.getTime() - b.date.getTime());
      if (sortedYears.length < 1) return null;

      const recentYears = sortedYears.slice(-50);
      return {
        labels: recentYears.map(w => format(w.date, 'yyyy')),
        datasets: [
          {
            data: recentYears.map(w => w.value)
          }
        ]
      };
    }

    return null;
  }, [workouts, chartScale, chartMetric]);

  if (!chartData) return null;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>
        {chartMetric === 'volume' 
          ? t('ui.history.chart_title', { unit: weightUnit }) 
          : t('ui.history.chart_title_calories')}
      </Text>
      
      <View style={styles.selectorsRow}>
        {/* Period Selector */}
        <View style={styles.scaleContainer}>
          {(['day', 'week', 'month', 'year'] as const).map(scale => (
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

        {/* Metric Selector */}
        <View style={styles.scaleContainer}>
          {(['volume', 'calories'] as const).map(metric => (
            <TouchableOpacity
              key={metric}
              style={[styles.scaleButton, chartMetric === metric && styles.scaleButtonActive]}
              onPress={() => setChartMetric(metric)}
            >
              <Text style={[styles.scaleButtonText, chartMetric === metric && styles.scaleButtonTextActive]}>
                {metric === 'volume' ? t('ui.history.volume_label') : (t('ui.common.calories') || 'Calories')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.chartWrapper}>
        <ScrollView
          key={`${chartScale}_${chartMetric}`}
          ref={chartScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => chartScrollRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={styles.chartScrollContent}
        >
          <BarChart
            data={chartData}
            width={Math.max(180, chartData.labels.length * 48)}
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
            style={styles.barChartStyle}
          />
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
  chartWrapper: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },
  chartScrollContent: {
    paddingLeft: 15,
    paddingRight: 20,
  },
  barChartStyle: {
    marginLeft: -10,
    paddingRight: 16,
    paddingTop: 12,
  },
});
