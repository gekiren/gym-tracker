import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';

interface Props {
  value: string; // "HH:mm" (24時間制: 例 "08:30", "19:45")
  onChange: (time: string) => void;
  label?: string;
}

interface DigitColumnProps {
  value: number;
  min: number;
  max: number;
  padZero?: boolean;
  onChange: (val: number) => void;
  isPureBlack?: boolean;
}

// 各桁の上下スワイプ＆ボタン対応ホイールカラム
function DigitColumn({
  value,
  min,
  max,
  padZero = false,
  onChange,
  isPureBlack,
}: DigitColumnProps) {
  const handleStep = useCallback((step: number) => {
    // step: +1 (上へ/次へ) または -1 (下へ/前へ)
    let next = value + step;
    if (next > max) next = min;
    if (next < min) next = max;
    onChange(next);
  }, [value, min, max, onChange]);

  const accumulatedDyRef = useRef<number>(0);
  const stepThreshold = 20; // 20pxスワイプごとに1ステップ変化

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        accumulatedDyRef.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const delta = -gestureState.dy - accumulatedDyRef.current;
        if (Math.abs(delta) >= stepThreshold) {
          const steps = Math.trunc(delta / stepThreshold);
          handleStep(steps);
          accumulatedDyRef.current += steps * stepThreshold;
        }
      },
      onPanResponderRelease: () => {
        accumulatedDyRef.current = 0;
      },
      onPanResponderTerminate: () => {
        accumulatedDyRef.current = 0;
      },
    })
  ).current;

  // 表示用の前後の数値
  const prevVal = value === min ? max : value - 1;
  const nextVal = value === max ? min : value + 1;

  const format = (v: number) => (padZero && v < 10 ? `0${v}` : String(v));

  return (
    <View style={styles.columnContainer}>
      {/* 上タップボタン */}
      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={() => handleStep(1)}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-up" size={16} color="#60a5fa" />
      </TouchableOpacity>

      {/* スワイプエリア */}
      <View
        {...panResponder.panHandlers}
        style={[
          styles.wheelCard,
          isPureBlack && { backgroundColor: '#050505', borderColor: '#262626' },
        ]}
      >
        <Text style={styles.ghostDigit}>{format(nextVal)}</Text>
        <View style={styles.activeDigitWrapper}>
          <Text style={styles.activeDigit}>{format(value)}</Text>
        </View>
        <Text style={styles.ghostDigit}>{format(prevVal)}</Text>
      </View>

      {/* 下タップボタン */}
      <TouchableOpacity
        style={styles.arrowBtn}
        onPress={() => handleStep(-1)}
        activeOpacity={0.6}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-down" size={16} color="#60a5fa" />
      </TouchableOpacity>
    </View>
  );
}

export default function TimeWheelPicker({ value, onChange, label = '時間設定' }: Props) {
  const { backgroundTheme } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';

  // "HH:mm" のパース
  const [hourStr, minStr] = (value || '12:00').split(':');
  const h24 = parseInt(hourStr, 10) || 0;
  const m = parseInt(minStr, 10) || 0;

  const isPm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const minuteTens = Math.floor((m % 60) / 10);
  const minuteOnes = (m % 60) % 10;

  // 12時間制・AM/PMから24時間制文字列を生成して親へ通知
  const updateTime = (newIsPm: boolean, newH12: number, newTens: number, newOnes: number) => {
    let finalH24 = 0;
    if (newIsPm) {
      finalH24 = newH12 === 12 ? 12 : newH12 + 12;
    } else {
      finalH24 = newH12 === 12 ? 0 : newH12;
    }
    const finalMin = newTens * 10 + newOnes;
    const result = `${String(finalH24).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
    onChange(result);
  };

  const handleToggleAmPm = (pm: boolean) => {
    updateTime(pm, h12, minuteTens, minuteOnes);
  };

  const handleChangeHour = (newH: number) => {
    updateTime(isPm, newH, minuteTens, minuteOnes);
  };

  const handleChangeTens = (newTens: number) => {
    updateTime(isPm, h12, newTens, minuteOnes);
  };

  const handleChangeOnes = (newOnes: number) => {
    updateTime(isPm, h12, minuteTens, newOnes);
  };

  return (
    <View style={styles.container}>
      {Boolean(label) && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>⏰ {label}</Text>
          <Text style={styles.display24h}>
            {String(h24).padStart(2, '0')}:{String(m).padStart(2, '0')} (24H)
          </Text>
        </View>
      )}

      <View
        style={[
          styles.pickerContainer,
          isPureBlack && { backgroundColor: '#0a0a0a', borderColor: '#1f1f1f' },
        ]}
      >
        {/* AM / PM 切替ボタン */}
        <View style={styles.ampmColumn}>
          <TouchableOpacity
            style={[
              styles.ampmBtn,
              !isPm && styles.ampmBtnActive,
              isPureBlack && !isPm && { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' },
            ]}
            onPress={() => handleToggleAmPm(false)}
            activeOpacity={0.7}
          >
            <Text style={[styles.ampmText, !isPm && styles.ampmTextActive]}>AM</Text>
            <Text style={[styles.ampmSubText, !isPm && styles.ampmSubTextActive]}>午前</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.ampmBtn,
              isPm && styles.ampmBtnActive,
              isPureBlack && isPm && { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' },
            ]}
            onPress={() => handleToggleAmPm(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.ampmText, isPm && styles.ampmTextActive]}>PM</Text>
            <Text style={[styles.ampmSubText, isPm && styles.ampmSubTextActive]}>午後</Text>
          </TouchableOpacity>
        </View>

        {/* 時間 (1〜12) */}
        <View style={styles.unitGroup}>
          <Text style={styles.unitLabel}>時</Text>
          <DigitColumn
            value={h12}
            min={1}
            max={12}
            padZero={false}
            onChange={handleChangeHour}
            isPureBlack={isPureBlack}
          />
        </View>

        <Text style={styles.separator}>:</Text>

        {/* 分の十の位 (0〜5) */}
        <View style={styles.unitGroup}>
          <Text style={styles.unitLabel}>分 (十の位)</Text>
          <DigitColumn
            value={minuteTens}
            min={0}
            max={5}
            padZero={false}
            onChange={handleChangeTens}
            isPureBlack={isPureBlack}
          />
        </View>

        {/* 分の一の位 (0〜9) */}
        <View style={styles.unitGroup}>
          <Text style={styles.unitLabel}>分 (一の位)</Text>
          <DigitColumn
            value={minuteOnes}
            min={0}
            max={9}
            padZero={false}
            onChange={handleChangeOnes}
            isPureBlack={isPureBlack}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  display24h: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    backgroundColor: '#0369a122',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  ampmColumn: {
    flexDirection: 'column',
    gap: 6,
    marginRight: 6,
  },
  ampmBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  ampmBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  ampmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  ampmTextActive: {
    color: '#ffffff',
  },
  ampmSubText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#475569',
    marginTop: 1,
  },
  ampmSubTextActive: {
    color: '#e0f2fe',
  },
  unitGroup: {
    alignItems: 'center',
  },
  unitLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  columnContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtn: {
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelCard: {
    width: 48,
    height: 74,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    overflow: 'hidden',
  },
  ghostDigit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    opacity: 0.6,
  },
  activeDigitWrapper: {
    backgroundColor: '#38bdf81a',
    width: '90%',
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDigit: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  separator: {
    fontSize: 22,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
    marginHorizontal: -2,
  },
});
