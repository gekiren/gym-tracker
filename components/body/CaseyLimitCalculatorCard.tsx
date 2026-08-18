import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';
import { BodyCompositionLog, CaseyLimitResult } from '../../src/types/bodyComposition';
import { calculateCaseyMuscularLimit } from '../../src/utils/bodyCalculators';

import { useBodyStore } from '../../src/store/bodyStore';

interface CaseyLimitCalculatorCardProps {
  currentLog: BodyCompositionLog | null;
  latestLog: BodyCompositionLog | null;
  onSaveMeasurements: (
    wrist: number,
    ankle: number,
    targetFatRate: number,
    height: number
  ) => void;
  onOpenGuide: () => void;
}

export default function CaseyLimitCalculatorCard({
  currentLog,
  latestLog,
  onSaveMeasurements,
  onOpenGuide,
}: CaseyLimitCalculatorCardProps) {
  const savedMeasurements = useBodyStore((state) => state.savedMeasurements);
  const saveLastMeasurements = useBodyStore((state) => state.saveLastMeasurements);

  const initialHeight = currentLog?.height || savedMeasurements.height || latestLog?.height || 175;

  const [wristStr, setWristStr] = useState(
    currentLog?.wrist
      ? String(currentLog.wrist)
      : savedMeasurements.wrist
      ? String(savedMeasurements.wrist)
      : latestLog?.wrist
      ? String(latestLog.wrist)
      : ''
  );
  const [ankleStr, setAnkleStr] = useState(
    currentLog?.ankle
      ? String(currentLog.ankle)
      : savedMeasurements.ankle
      ? String(savedMeasurements.ankle)
      : latestLog?.ankle
      ? String(latestLog.ankle)
      : ''
  );
  const [targetFatStr, setTargetFatStr] = useState(
    savedMeasurements.targetFatRate ? String(savedMeasurements.targetFatRate) : '10'
  );
  const [heightStr, setHeightStr] = useState(String(initialHeight));

  const [showPartSizes, setShowPartSizes] = useState(false);
  const [result, setResult] = useState<CaseyLimitResult | null>(null);

  // currentLog や savedMeasurements, latestLog が更新された時に同期
  useEffect(() => {
    const valWrist = currentLog?.wrist ?? savedMeasurements.wrist ?? latestLog?.wrist;
    if (valWrist !== undefined && valWrist !== null) {
      setWristStr(String(valWrist));
    }
    const valAnkle = currentLog?.ankle ?? savedMeasurements.ankle ?? latestLog?.ankle;
    if (valAnkle !== undefined && valAnkle !== null) {
      setAnkleStr(String(valAnkle));
    }
    if (savedMeasurements.targetFatRate) {
      setTargetFatStr(String(savedMeasurements.targetFatRate));
    }
    const valHeight = currentLog?.height ?? savedMeasurements.height ?? latestLog?.height;
    if (valHeight !== undefined && valHeight !== null) {
      setHeightStr(String(valHeight));
    }
  }, [currentLog, savedMeasurements, latestLog]);

  // 入力変更ハンドラ（即時State更新 ＆ バックグラウンド永続化）
  const handleWristChange = (val: string) => {
    setWristStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      saveLastMeasurements({ wrist: num });
    }
  };

  const handleAnkleChange = (val: string) => {
    setAnkleStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      saveLastMeasurements({ ankle: num });
    }
  };

  const handleTargetFatChange = (val: string) => {
    setTargetFatStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      saveLastMeasurements({ targetFatRate: num });
    }
  };

  const handleHeightChange = (val: string) => {
    setHeightStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      saveLastMeasurements({ height: num });
    }
  };

  // 入力値変更時に自動再計算
  useEffect(() => {
    const wrist = parseFloat(wristStr);
    const ankle = parseFloat(ankleStr);
    const targetFat = parseFloat(targetFatStr) || 10;
    const h = parseFloat(heightStr);

    if (wrist > 0 && ankle > 0 && h > 0) {
      const res = calculateCaseyMuscularLimit({
        height: h,
        wrist,
        ankle,
        targetBodyFatRate: targetFat,
      });
      setResult(res);
    } else {
      setResult(null);
    }
  }, [wristStr, ankleStr, targetFatStr, heightStr]);

  const handleSave = () => {
    const wrist = parseFloat(wristStr);
    const ankle = parseFloat(ankleStr);
    const targetFat = parseFloat(targetFatStr) || 10;
    const h = parseFloat(heightStr) || 175;
    if (wrist > 0 && ankle > 0) {
      onSaveMeasurements(wrist, ankle, targetFat, h);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBg, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
            <Ionicons name="sparkles" size={22} color="#a78bfa" />
          </View>
          <View>
            <Text style={styles.cardTitle}>筋肥大 生理的限界モデル</Text>
            <Text style={styles.cardSubtitle}>Dr. Casey Butt's Maximum Muscular Potential</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.guideBtn} onPress={onOpenGuide} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={20} color={Theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Input Fields */}
      <View style={styles.inputsGrid}>
        {/* 手首囲 */}
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>手首最小囲 (Wrist)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="17.0"
              placeholderTextColor={Theme.colors.textMuted}
              value={wristStr}
              onChangeText={handleWristChange}
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
        </View>

        {/* 足首囲 */}
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>足首最小囲 (Ankle)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="22.0"
              placeholderTextColor={Theme.colors.textMuted}
              value={ankleStr}
              onChangeText={handleAnkleChange}
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
        </View>

        {/* 目標体脂肪率 */}
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>想定体脂肪率</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={Theme.colors.textMuted}
              value={targetFatStr}
              onChangeText={handleTargetFatChange}
            />
            <Text style={styles.inputUnit}>%</Text>
          </View>
        </View>

        {/* 身長 */}
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>身長 (Height)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="175.0"
              placeholderTextColor={Theme.colors.textMuted}
              value={heightStr}
              onChangeText={handleHeightChange}
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
        </View>
      </View>

      {/* Result Display */}
      {result ? (
        <View style={styles.resultBox}>
          {/* Main Maximums */}
          <View style={styles.limitGrid}>
            <View style={styles.limitBox}>
              <Text style={styles.limitLabel}>理論的最大限界体重</Text>
              <View style={styles.valueRow}>
                <Text style={styles.limitValue}>{result.maxBodyWeight.toFixed(1)}</Text>
                <Text style={styles.limitUnit}>kg</Text>
              </View>
              <Text style={styles.subHint}>体脂肪 {result.targetBodyFatRate}% 想定</Text>
            </View>

            <View style={styles.limitBox}>
              <Text style={styles.limitLabel}>最大限界除脂肪量 (LBM)</Text>
              <View style={styles.valueRow}>
                <Text style={[styles.limitValue, { color: '#a78bfa' }]}>
                  {result.maxLbm.toFixed(1)}
                </Text>
                <Text style={styles.limitUnit}>kg</Text>
              </View>
              <Text style={styles.subHint}>骨格筋＋内臓・骨</Text>
            </View>

            <View style={styles.limitBox}>
              <Text style={styles.limitLabel}>現実的到達上限 (95%)</Text>
              <View style={styles.valueRow}>
                <Text style={[styles.limitValue, { color: '#38bdf8' }]}>
                  {result.realisticWeight95.toFixed(1)}
                </Text>
                <Text style={styles.limitUnit}>kg</Text>
              </View>
              <Text style={styles.subHint}>LBM {result.realisticLbm95.toFixed(1)} kg</Text>
            </View>

            <View style={styles.limitBox}>
              <Text style={styles.limitLabel}>理論限界FFMI</Text>
              <View style={styles.valueRow}>
                <Text style={[styles.limitValue, { color: '#4ade80' }]}>
                  {result.limitFfmi.toFixed(1)}
                </Text>
                <Text style={styles.limitUnit}>pt</Text>
              </View>
              <Text style={styles.subHint}>正規化除脂肪指数</Text>
            </View>
          </View>

          {/* Part Sizes Toggle Button */}
          <TouchableOpacity
            style={styles.togglePartsBtn}
            onPress={() => setShowPartSizes((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPartSizes ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#a78bfa"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.togglePartsText}>
              {showPartSizes ? '各部位の最大サイズ予測を閉じる' : '各部位の最大サイズ予測を見る'}
            </Text>
          </TouchableOpacity>

          {/* Part Sizes Breakdown */}
          {showPartSizes && (
            <View style={styles.partsContainer}>
              <View style={styles.partRow}>
                <Text style={styles.partName}>胸囲 (Chest)</Text>
                <Text style={styles.partVal}>{result.maxChest} cm</Text>
              </View>
              <View style={styles.partRow}>
                <Text style={styles.partName}>上腕囲 (Biceps)</Text>
                <Text style={styles.partVal}>{result.maxBiceps} cm</Text>
              </View>
              <View style={styles.partRow}>
                <Text style={styles.partName}>前腕囲 (Forearm)</Text>
                <Text style={styles.partVal}>{result.maxForearm} cm</Text>
              </View>
              <View style={styles.partRow}>
                <Text style={styles.partName}>大腿囲 (Thigh)</Text>
                <Text style={styles.partVal}>{result.maxThigh} cm</Text>
              </View>
              <View style={styles.partRow}>
                <Text style={styles.partName}>下腿囲 (Calf)</Text>
                <Text style={styles.partVal}>{result.maxCalf} cm</Text>
              </View>
              <View style={styles.partRow}>
                <Text style={styles.partName}>首囲 (Neck)</Text>
                <Text style={styles.partVal}>{result.maxNeck} cm</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7}>
            <Ionicons name="save-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.saveBtnText}>骨格測定値・目標値を保存</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholderBox}>
          <Ionicons name="information-circle-outline" size={18} color={Theme.colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.placeholderText}>
            手首と足首の最小周囲長を入力すると、骨格フレームに基づくナチュラル筋肥大の限界値が計算されます。
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  guideBtn: {
    padding: 6,
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  inputItem: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 8,
  },
  inputUnit: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginLeft: 4,
  },
  resultBox: {
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    borderRadius: Theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  limitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  limitBox: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Theme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  limitLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  limitValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  limitUnit: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  subHint: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  togglePartsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    borderRadius: Theme.borderRadius.md,
    marginBottom: 10,
  },
  togglePartsText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
  },
  partsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: Theme.borderRadius.md,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  partName: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  partVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.md,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  placeholderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 12,
    borderRadius: Theme.borderRadius.md,
  },
  placeholderText: {
    flex: 1,
    fontSize: 12,
    color: Theme.colors.textMuted,
    lineHeight: 16,
  },
});
