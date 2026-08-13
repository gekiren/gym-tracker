import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MealLog, NutritionGoals } from '../../src/db/types';
import { useAppTheme } from '../../src/theme';

// ─── PFC比率計算ヘルパー ────────────────────────────────

function calculatePfcRatio(protein: number, fat: number, carbs: number) {
  const pCal = protein * 4;
  const fCal = fat * 9;
  const cCal = carbs * 4;
  const totalCal = pCal + fCal + cCal;
  if (totalCal <= 0) return { pRatio: 0, fRatio: 0, cRatio: 0, pCal: 0, fCal: 0, cCal: 0, totalCal: 0 };
  return {
    pRatio: Math.round((pCal / totalCal) * 100),
    fRatio: Math.round((fCal / totalCal) * 100),
    cRatio: Math.round((cCal / totalCal) * 100),
    pCal: Math.round(pCal),
    fCal: Math.round(fCal),
    cCal: Math.round(cCal),
    totalCal,
  };
}

// ─── 型定義 ─────────────────────────────────────────────

interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium: number;
  fiber: number;
}

interface Props {
  mealLogs: MealLog[];
  userGoals: NutritionGoals;
}

// ─── コンポーネント ──────────────────────────────────────

const MEAL_TYPES = [
  { key: 'breakfast', label: '朝食', icon: '🌅', color: '#f59e0b' },
  { key: 'lunch',     label: '昼食', icon: '☀️',  color: '#10b981' },
  { key: 'dinner',   label: '夕食', icon: '🌙', color: '#6366f1' },
  { key: 'snack',    label: '間食', icon: '☕', color: '#ec4899' },
] as const;

export default function NutritionSummaryCard({ mealLogs, userGoals }: Props) {
  const goals = {
    calories: userGoals.calories || 2000,
    protein:  userGoals.protein  || 60,
    fat:      userGoals.fat      || 55,
    carbs:    userGoals.carbs    || 250,
    sodium:   userGoals.sodium   || 7.5,
    fiber:    userGoals.fiber    || 20,
  };

  const totals: NutritionTotals = useMemo(() =>
    mealLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein:  acc.protein  + (log.protein  || 0),
        fat:      acc.fat      + (log.fat      || 0),
        carbs:    acc.carbs    + (log.carbs    || 0),
        sodium:   acc.sodium   + (log.sodium   || 0),
        fiber:    acc.fiber    + (log.fiber    || 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0, sodium: 0, fiber: 0 }
    ),
    [mealLogs]
  );

  const getPercent = (val: number, max: number) =>
    max > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0;

  const pfc = useMemo(
    () => calculatePfcRatio(totals.protein, totals.fat, totals.carbs),
    [totals.protein, totals.fat, totals.carbs]
  );

  const mealTypeSummary = useMemo(() =>
    MEAL_TYPES.map((t) => {
      const filtered = mealLogs.filter((log) => log.meal_type === t.key);
      const sub = filtered.reduce(
        (acc, log) => ({
          calories: acc.calories + (log.calories || 0),
          protein:  acc.protein  + (log.protein  || 0),
          fat:      acc.fat      + (log.fat      || 0),
          carbs:    acc.carbs    + (log.carbs    || 0),
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      );
      return { ...t, count: filtered.length, ...sub };
    }),
    [mealLogs]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>今日の栄養摂取進捗</Text>

      {/* 総カロリー進捗バー */}
      <View style={styles.mainCalBox}>
        <View style={styles.mainCalTextRow}>
          <Text style={styles.mainCalLabel}>総摂取カロリー</Text>
          <Text style={styles.mainCalVal}>
            {Math.round(totals.calories)}{' '}
            <Text style={styles.unitText}>/ {goals.calories} kcal</Text>
          </Text>
        </View>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${getPercent(totals.calories, goals.calories)}%`, backgroundColor: '#10b981' },
            ]}
          />
        </View>
      </View>

      {/* PFC エネルギー比率 */}
      <View style={styles.pfcRatioBox}>
        <View style={styles.pfcHeaderRow}>
          <Text style={styles.pfcRatioTitle}>PFCエネルギー比率</Text>
          <Text style={styles.pfcIdeaHint}>理想: P 15-25% / F 20-30% / C 50-65%</Text>
        </View>
        <View style={styles.pfcPropBarBg}>
          {pfc.totalCal > 0 ? (
            <>
              {pfc.pRatio > 0 && <View style={[styles.pfcPropSeg, { width: `${pfc.pRatio}%`, backgroundColor: '#06b6d4' }]} />}
              {pfc.fRatio > 0 && <View style={[styles.pfcPropSeg, { width: `${pfc.fRatio}%`, backgroundColor: '#f59e0b' }]} />}
              {pfc.cRatio > 0 && <View style={[styles.pfcPropSeg, { width: `${pfc.cRatio}%`, backgroundColor: '#a855f7' }]} />}
            </>
          ) : (
            <View style={[styles.pfcPropSeg, { width: '100%', backgroundColor: '#334155' }]} />
          )}
        </View>
        <View style={styles.pfcValLegendRow}>
          {[
            { label: 'P (タンパク質)', color: '#06b6d4', ratio: pfc.pRatio, kcal: pfc.pCal },
            { label: 'F (脂質)',       color: '#f59e0b', ratio: pfc.fRatio, kcal: pfc.fCal },
            { label: 'C (炭水化物)',   color: '#a855f7', ratio: pfc.cRatio, kcal: pfc.cCal },
          ].map((item) => (
            <View key={item.label} style={styles.pfcLegendItem}>
              <View style={[styles.pfcDot, { backgroundColor: item.color }]} />
              <Text style={styles.pfcLegendLabel}>{item.label}:</Text>
              <Text style={styles.pfcLegendVal}>{item.ratio}%</Text>
              <Text style={styles.pfcLegendKcal}>({item.kcal}kcal)</Text>
            </View>
          ))}
        </View>
      </View>

      {/* PFC + 塩分 + 食物繊維 目標進捗グリッド */}
      <View style={styles.grid}>
        {[
          { label: 'タンパク質 (P)', val: totals.protein, goal: goals.protein, color: '#06b6d4', fullWidth: true },
          { label: '脂質 (F)',       val: totals.fat,     goal: goals.fat,     color: '#f59e0b', fullWidth: false },
          { label: '炭水化物 (C)',   val: totals.carbs,   goal: goals.carbs,   color: '#a855f7', fullWidth: false },
          { label: '塩分',           val: totals.sodium,  goal: goals.sodium,  color: totals.sodium > goals.sodium ? '#ef4444' : '#f43f5e', fullWidth: false },
          { label: '食物繊維',       val: totals.fiber,   goal: goals.fiber,   color: '#10b981', fullWidth: false },
        ].map((item) => (
          <View key={item.label} style={item.fullWidth ? styles.gridItemFull : styles.gridItem}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemVal}>
                {item.val.toFixed(1)} <Text style={styles.subUnit}>/ {item.goal}g</Text>
              </Text>
            </View>
            <View style={styles.subProgressBg}>
              <View style={[styles.subProgressFill, { width: `${getPercent(item.val, item.goal)}%`, backgroundColor: item.color }]} />
            </View>
          </View>
        ))}
      </View>

      {/* 食事タイプ別内訳 */}
      <View style={styles.mealBreakdownSection}>
        <Text style={styles.mealBreakdownTitle}>🍽️ 食事タイプ別 摂取内訳</Text>
        <View style={styles.mealBreakdownGrid}>
          {mealTypeSummary.map((item) => (
            <View key={item.key} style={styles.mealBreakdownCard}>
              <View style={styles.mealCardHeader}>
                <Text style={styles.mealIconLabel}>{item.icon} {item.label}</Text>
                <Text style={[styles.mealBadge, { borderColor: item.color, color: item.color }]}>
                  {item.count}件
                </Text>
              </View>
              <Text style={styles.mealCalVal}>
                {Math.round(item.calories)} <Text style={styles.mealCalUnit}>kcal</Text>
              </Text>
              <View style={styles.mealPfcMiniRow}>
                <Text style={styles.mealPfcText}><Text style={{ color: '#06b6d4' }}>P:</Text>{item.protein.toFixed(1)}g</Text>
                <Text style={styles.mealPfcText}><Text style={{ color: '#f59e0b' }}>F:</Text>{item.fat.toFixed(1)}g</Text>
                <Text style={styles.mealPfcText}><Text style={{ color: '#a855f7' }}>C:</Text>{item.carbs.toFixed(1)}g</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1c1c1c',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  mainCalBox: { backgroundColor: '#121212', borderRadius: 12, padding: 12, marginBottom: 12 },
  mainCalTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mainCalLabel: { fontSize: 13, fontWeight: '600', color: '#888888' },
  mainCalVal: { fontSize: 18, fontWeight: '700', color: '#10b981' },
  unitText: { fontSize: 12, color: '#888888', fontWeight: '400' },
  progressBg: { height: 10, backgroundColor: '#1c1c1c', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  pfcRatioBox: { backgroundColor: '#121212', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1c1c1c' },
  pfcHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pfcRatioTitle: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  pfcIdeaHint: { fontSize: 10, color: '#888888' },
  pfcPropBarBg: { height: 14, backgroundColor: '#1c1c1c', borderRadius: 7, overflow: 'hidden', flexDirection: 'row', marginBottom: 10 },
  pfcPropSeg: { height: '100%' },
  pfcValLegendRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  pfcLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pfcDot: { width: 8, height: 8, borderRadius: 4 },
  pfcLegendLabel: { fontSize: 11, color: '#888888', fontWeight: '600' },
  pfcLegendVal: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  pfcLegendKcal: { fontSize: 10, color: '#888888' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  gridItem: { width: '48%', backgroundColor: '#121212', borderRadius: 10, padding: 10 },
  gridItemFull: { width: '100%', backgroundColor: '#121212', borderRadius: 10, padding: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  itemVal: { fontSize: 13, fontWeight: '700', color: '#f8fafc' },
  subUnit: { fontSize: 10, color: '#64748b', fontWeight: '400' },
  subProgressBg: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  subProgressFill: { height: '100%', borderRadius: 3 },
  mealBreakdownSection: { marginTop: 4 },
  mealBreakdownTitle: { fontSize: 13, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  mealBreakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealBreakdownCard: { width: '48%', backgroundColor: '#0f172a', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155' },
  mealCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mealIconLabel: { fontSize: 12, fontWeight: '700', color: '#f8fafc' },
  mealBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, borderWidth: 1 },
  mealCalVal: { fontSize: 15, fontWeight: '800', color: '#38bdf8', marginBottom: 4 },
  mealCalUnit: { fontSize: 10, color: '#64748b', fontWeight: '400' },
  mealPfcMiniRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  mealPfcText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
});
