import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { BodyCompositionLog, Gender, NavyBodyFatResult } from '../../src/types/bodyComposition';
import { calculateNavyBodyFat } from '../../src/utils/bodyCalculators';

import { useBodyStore } from '../../src/store/bodyStore';

interface NavyFatCalculatorCardProps {
  currentLog: BodyCompositionLog | null;
  latestLog: BodyCompositionLog | null;
  onApplyBodyFat: (
    bodyFatRate: number,
    neck: number,
    waist: number,
    hip?: number,
    height?: number
  ) => void;
  onOpenGuide: () => void;
}

export default function NavyFatCalculatorCard({
  currentLog,
  latestLog,
  onApplyBodyFat,
  onOpenGuide,
}: NavyFatCalculatorCardProps) {
  const { colors, spacing } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, spacing), [colors, spacing]);
  const savedMeasurements = useBodyStore((state) => state.savedMeasurements);
  const saveLastMeasurements = useBodyStore((state) => state.saveLastMeasurements);

  const gender: Gender = currentLog?.gender || latestLog?.gender || 'male';
  const initialHeight = currentLog?.height || savedMeasurements.height || latestLog?.height || 170;
  const weight = currentLog?.weight || latestLog?.weight || 70;

  const [neckStr, setNeckStr] = useState(
    currentLog?.neck
      ? String(currentLog.neck)
      : savedMeasurements.neck
      ? String(savedMeasurements.neck)
      : latestLog?.neck
      ? String(latestLog.neck)
      : ''
  );
  const [waistStr, setWaistStr] = useState(
    currentLog?.waist
      ? String(currentLog.waist)
      : savedMeasurements.waist
      ? String(savedMeasurements.waist)
      : latestLog?.waist
      ? String(latestLog.waist)
      : ''
  );
  const [hipStr, setHipStr] = useState(
    currentLog?.hip
      ? String(currentLog.hip)
      : savedMeasurements.hip
      ? String(savedMeasurements.hip)
      : latestLog?.hip
      ? String(latestLog.hip)
      : ''
  );
  const [heightStr, setHeightStr] = useState(String(initialHeight));

  const [result, setResult] = useState<NavyBodyFatResult | null>(null);

  // 日付が切り替わった時（または初期ロード時）のみローカル入力値を同期
  const lastDateRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (lastDateRef.current !== currentLog?.date) {
      lastDateRef.current = currentLog?.date;
      const valNeck = currentLog?.neck ?? savedMeasurements.neck ?? latestLog?.neck;
      setNeckStr(valNeck !== undefined && valNeck !== null ? String(valNeck) : '');

      const valWaist = currentLog?.waist ?? savedMeasurements.waist ?? latestLog?.waist;
      setWaistStr(valWaist !== undefined && valWaist !== null ? String(valWaist) : '');

      const valHip = currentLog?.hip ?? savedMeasurements.hip ?? latestLog?.hip;
      setHipStr(valHip !== undefined && valHip !== null ? String(valHip) : '');

      const valHeight = currentLog?.height ?? savedMeasurements.height ?? latestLog?.height;
      setHeightStr(valHeight !== undefined && valHeight !== null ? String(valHeight) : '170');
    }
  }, [currentLog?.date]);

  // 入力変更ハンドラ（即時State更新 ＆ バックグラウンド永続化）
  const handleNeckChange = (val: string) => {
    const sanitized = val.replace(',', '.');
    setNeckStr(sanitized);
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num > 0) {
      saveLastMeasurements({ neck: num });
    }
  };

  const handleWaistChange = (val: string) => {
    const sanitized = val.replace(',', '.');
    setWaistStr(sanitized);
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num > 0) {
      saveLastMeasurements({ waist: num });
    }
  };

  const handleHipChange = (val: string) => {
    const sanitized = val.replace(',', '.');
    setHipStr(sanitized);
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num > 0) {
      saveLastMeasurements({ hip: num });
    }
  };

  const handleHeightChange = (val: string) => {
    const sanitized = val.replace(',', '.');
    setHeightStr(sanitized);
    const num = parseFloat(sanitized);
    if (!isNaN(num) && num > 0) {
      saveLastMeasurements({ height: num });
    }
  };

  // 入力値変更時に自動再計算
  useEffect(() => {
    const neck = parseFloat(neckStr);
    const waist = parseFloat(waistStr);
    const hip = parseFloat(hipStr);
    const h = parseFloat(heightStr);

    if (neck > 0 && waist > 0 && h > 0) {
      if (gender === 'female' && (!hip || hip <= 0)) {
        setResult(null);
        return;
      }
      const res = calculateNavyBodyFat({
        gender,
        height: h,
        neck,
        waist,
        hip: gender === 'female' ? hip : undefined,
        weight,
      });
      setResult(res);
    } else {
      setResult(null);
    }
  }, [neckStr, waistStr, hipStr, heightStr, gender, weight]);

  const handleApply = () => {
    if (!result) return;
    const neck = parseFloat(neckStr);
    const waist = parseFloat(waistStr);
    const hip = gender === 'female' ? parseFloat(hipStr) : undefined;
    const h = parseFloat(heightStr);
    onApplyBodyFat(result.bodyFatRate, neck, waist, hip, isNaN(h) || h <= 0 ? undefined : h);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBg, { backgroundColor: 'rgba(251, 146, 60, 0.15)' }]}>
            <Ionicons name="calculator-outline" size={22} color="#fb923c" />
          </View>
          <View>
            <Text style={styles.cardTitle}>米海軍式 体脂肪率推定</Text>
            <Text style={styles.cardSubtitle}>US Navy Circumference Method</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.guideBtn}
          onPress={onOpenGuide}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Input Fields */}
      <View style={styles.inputsGrid}>
        {/* 首回り */}
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>首回り (Neck)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              keyboardType="decimal-pad"
              placeholder="38.0"
              placeholderTextColor={colors.textMuted}
              value={neckStr}
              onChangeText={handleNeckChange}
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
        </View>

        {/* ウエスト */}
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>ウエスト (Waist)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              keyboardType="decimal-pad"
              placeholder="80.0"
              placeholderTextColor={colors.textMuted}
              value={waistStr}
              onChangeText={handleWaistChange}
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>
        </View>

        {/* ヒップ (女性のみ) */}
        {gender === 'female' && (
          <View style={styles.inputItem}>
            <Text style={styles.inputLabel}>ヒップ (Hip)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                keyboardType="decimal-pad"
                placeholder="90.0"
                placeholderTextColor={colors.textMuted}
                value={hipStr}
                onChangeText={handleHipChange}
              />
              <Text style={styles.inputUnit}>cm</Text>
            </View>
          </View>
        )}

        {/* 身長 */}
        <View style={styles.inputItem}>
          <Text style={styles.inputLabel}>身長 (Height)</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              keyboardType="decimal-pad"
              placeholder="175.0"
              placeholderTextColor={colors.textMuted}
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
          <View style={styles.resultMainRow}>
            <View>
              <Text style={styles.resultLabel}>推定体脂肪率</Text>
              <Text style={styles.categoryText}>{result.categoryLabel}</Text>
            </View>
            <View style={styles.resultValueWrap}>
              <Text style={styles.resultValue}>{result.bodyFatRate.toFixed(1)}</Text>
              <Text style={styles.resultUnit}>%</Text>
            </View>
          </View>

          <View style={styles.resultDetailsRow}>
            {result.lbm !== null && (
              <Text style={styles.detailItem}>
                除脂肪: <Text style={styles.detailBold}>{result.lbm} kg</Text>
              </Text>
            )}
            {result.fatMass !== null && (
              <Text style={styles.detailItem}>
                脂肪量: <Text style={styles.detailBold}>{result.fatMass} kg</Text>
              </Text>
            )}
            {result.ffmi !== null && (
              <Text style={styles.detailItem}>
                FFMI: <Text style={styles.detailBold}>{result.ffmi.toFixed(1)}</Text>
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.7}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.applyBtnText}>今日の記録に反映する</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.placeholderBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.placeholderText}>
            首回りとウエスト（女性はヒップ）を入力すると自動計算されます。
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  spacing: ReturnType<typeof useAppTheme>['spacing']
) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  guideBtn: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 10,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 8,
  },
  inputUnit: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },
  resultBox: {
    backgroundColor: 'rgba(251, 146, 60, 0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.25)',
  },
  resultMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fb923c',
    marginTop: 2,
  },
  resultValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fb923c',
  },
  resultUnit: {
    fontSize: 16,
    color: '#fb923c',
    fontWeight: 'bold',
  },
  resultDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(251, 146, 60, 0.15)',
    marginBottom: 12,
  },
  detailItem: {
    fontSize: 12,
    color: colors.textMuted,
  },
  detailBold: {
    color: colors.text,
    fontWeight: 'bold',
  },
  applyBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ea580c',
    paddingVertical: 10,
    borderRadius: 12,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  placeholderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: 12,
    borderRadius: 12,
  },
  placeholderText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
