import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MealLog, NutritionGoals } from '../../src/db/types';

interface Props {
  allLogs: MealLog[];
  goals: NutritionGoals;
}

export default function NutritionHistoryChart({ allLogs, goals }: Props) {
  const targetCal = goals.calories || 2000;

  // 直近14日間のデータ集計
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      map.set(dateStr, 0);
    }

    allLogs.forEach((log) => {
      if (map.has(log.date)) {
        map.set(log.date, (map.get(log.date) || 0) + (log.calories || 0));
      }
    });

    return Array.from(map.entries()).map(([date, totalCal]) => {
      const label = date.slice(5).replace('-', '/');
      return { date, label, totalCal };
    });
  }, [allLogs]);

  const maxCal = Math.max(targetCal * 1.3, ...dailyData.map((d) => d.totalCal), 2500);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📈 直近14日間のカロリー推移</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chartContainer}>
          {/* 目標ライン */}
          <View
            style={[
              styles.goalLine,
              { bottom: `${Math.min(100, (targetCal / maxCal) * 100)}%` },
            ]}
          />
          <Text
            style={[
              styles.goalLabel,
              { bottom: `${Math.min(95, (targetCal / maxCal) * 100)}%` },
            ]}
          >
            目標 {targetCal} kcal
          </Text>

          {/* バー一覧 */}
          <View style={styles.barsRow}>
            {dailyData.map((item) => {
              const heightPct = Math.min(100, (item.totalCal / maxCal) * 100);
              const isOver = item.totalCal > targetCal;

              return (
                <View key={item.date} style={styles.barCol}>
                  <Text style={styles.barVal}>{item.totalCal > 0 ? Math.round(item.totalCal) : ''}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${heightPct}%`,
                          backgroundColor: isOver ? '#ef4444' : '#10b981',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barDate}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1c1c1c',
  },
  title: { fontSize: 15, fontWeight: '700', color: '#c8c8c8', marginBottom: 12 },
  chartContainer: { height: 160, width: 440, position: 'relative', paddingTop: 20 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderColor: '#f59e0b88',
    borderStyle: 'dashed',
    zIndex: 2,
  },
  goalLabel: {
    position: 'absolute',
    right: 0,
    fontSize: 9,
    color: '#f59e0b',
    fontWeight: '700',
    zIndex: 3,
  },
  barsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%' },
  barCol: { width: 26, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barVal: { fontSize: 8, color: '#94a3b8', marginBottom: 2 },
  barTrack: { width: 14, height: 100, backgroundColor: '#0f172a', borderRadius: 7, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 7 },
  barDate: { fontSize: 9, color: '#64748b', marginTop: 4 },
});
