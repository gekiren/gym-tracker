import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';

interface Props {
  value: string; // "HH:mm" (24時間制: 例 "08:30", "19:45")
  onChange: (time: string) => void;
  label?: string;
}

const ITEM_HEIGHT = 46;
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 138px

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTE_TENS = Array.from({ length: 6 }, (_, i) => i); // 0..5
const MINUTE_ONES = Array.from({ length: 10 }, (_, i) => i); // 0..9

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {});
  }
};

const REPEAT_COUNT = 40;
const MIDDLE_SET = Math.floor(REPEAT_COUNT / 2); // 20

interface WheelColumnProps {
  data: number[];
  selectedValue: number;
  onSelect: (val: number) => void;
  unit: string;
  padZero?: boolean;
  columnWidth?: number;
}

function WheelColumn({
  data,
  selectedValue,
  onSelect,
  unit,
  padZero = false,
  columnWidth = 72,
}: WheelColumnProps) {
  const flatListRef = useRef<FlatList<{ key: string; val: number; indexInBase: number }>>(null);

  // 仮想的なリピートデータ生成
  const repeatedItems = useRef(
    Array.from({ length: data.length * REPEAT_COUNT }, (_, i) => ({
      key: `item-${i}`,
      val: data[i % data.length],
      indexInBase: i % data.length,
    }))
  ).current;

  // 初期位置合わせ（中央セットへ）
  useEffect(() => {
    const baseIdx = data.indexOf(selectedValue);
    if (baseIdx >= 0 && flatListRef.current) {
      const targetIdx = MIDDLE_SET * data.length + baseIdx;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: targetIdx * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, []);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(rawIndex, repeatedItems.length - 1));
      const item = repeatedItems[clampedIndex];
      if (item) {
        if (item.val !== selectedValue) {
          onSelect(item.val);
          triggerHaptic();
        }

        // 端に近づいたら中央セットへシームレスに位置リセット
        if (rawIndex < data.length * 6 || rawIndex > data.length * 34) {
          const recenteredIndex = MIDDLE_SET * data.length + item.indexInBase;
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: recenteredIndex * ITEM_HEIGHT,
              animated: false,
            });
          }, 30);
        }
      }
    },
    [data, repeatedItems, selectedValue, onSelect]
  );

  const handleItemPress = (item: { val: number; indexInBase: number }, flatIndex: number) => {
    flatListRef.current?.scrollToOffset({
      offset: flatIndex * ITEM_HEIGHT,
      animated: true,
    });
    if (item.val !== selectedValue) {
      onSelect(item.val);
      triggerHaptic();
    }
  };

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  return (
    <View style={[styles.wheelColumnContainer, { width: columnWidth }]}>
      <Text style={styles.columnUnitText}>{unit}</Text>
      <View style={styles.wheelWrapper}>
        {/* 中央のハイライト枠 */}
        <View pointerEvents="none" style={styles.selectionHighlight} />

        <FlatList
          ref={flatListRef}
          data={repeatedItems}
          keyExtractor={(item) => item.key}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT, // 上下に1項目分の余白で中央配置
          }}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          renderItem={({ item, index }) => {
            const isSelected = item.val === selectedValue;
            const text = padZero ? String(item.val).padStart(2, '0') : String(item.val);
            return (
              <TouchableOpacity
                style={styles.wheelItem}
                onPress={() => handleItemPress(item, index)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.wheelItemText,
                    isSelected && styles.wheelItemTextSelected,
                  ]}
                >
                  {text}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );
}

export default function TimeWheelPicker({
  value,
  onChange,
  label = '食事時間',
}: Props) {
  const { backgroundTheme } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';

  const [modalVisible, setModalVisible] = useState(false);

  // 一時選択ステート
  const [tempIsPm, setTempIsPm] = useState(false);
  const [tempHour12, setTempHour12] = useState(12);
  const [tempTens, setTempTens] = useState(0);
  const [tempOnes, setTempOnes] = useState(0);

  // 24時間制 "HH:mm" からパース
  const parseTo12HourState = (timeStr: string) => {
    const [hStr, mStr] = (timeStr || '12:00').split(':');
    const h24 = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;

    const isPm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const tens = Math.floor((m % 60) / 10);
    const ones = (m % 60) % 10;

    return { isPm, h12, tens, ones };
  };

  const openModal = () => {
    const { isPm, h12, tens, ones } = parseTo12HourState(value);
    setTempIsPm(isPm);
    setTempHour12(h12);
    setTempTens(tens);
    setTempOnes(ones);
    setModalVisible(true);
    triggerHaptic();
  };

  const calculate24HourTime = (
    pm: boolean,
    h12: number,
    tens: number,
    ones: number
  ) => {
    let finalH24 = 0;
    if (pm) {
      finalH24 = h12 === 12 ? 12 : h12 + 12;
    } else {
      finalH24 = h12 === 12 ? 0 : h12;
    }
    const finalMin = tens * 10 + ones;
    return `${String(finalH24).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
  };

  const handleSave = () => {
    const result24 = calculate24HourTime(
      tempIsPm,
      tempHour12,
      tempTens,
      tempOnes
    );
    onChange(result24);
    setModalVisible(false);
    triggerHaptic();
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleToggleAmPm = (pm: boolean) => {
    setTempIsPm(pm);
    triggerHaptic();
  };

  // プリセット適用
  const applyPresetMinutesAgo = (minsAgo: number) => {
    const now = new Date();
    if (minsAgo > 0) {
      now.setMinutes(now.getMinutes() - minsAgo);
    }
    const h24 = now.getHours();
    const m = now.getMinutes();

    const isPm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const tens = Math.floor(m / 10);
    const ones = m % 10;

    setTempIsPm(isPm);
    setTempHour12(h12);
    setTempTens(tens);
    setTempOnes(ones);
    triggerHaptic();
  };

  const displayTime = value || '12:00';
  const { isPm: curIsPm, h12: curH12 } = parseTo12HourState(displayTime);
  const ampmDisplayStr = curIsPm ? '午後' : '午前';

  // プレビュー用計算
  const currentPreview24 = calculate24HourTime(
    tempIsPm,
    tempHour12,
    tempTens,
    tempOnes
  );

  return (
    <View style={styles.container}>
      {/* インラインのタップ可能な時間表示カード */}
      <TouchableOpacity
        style={[
          styles.triggerCard,
          isPureBlack && { backgroundColor: '#0a0a0a', borderColor: '#1f1f1f' },
        ]}
        onPress={openModal}
        activeOpacity={0.7}
      >
        <View style={styles.triggerLeft}>
          <Text style={styles.triggerLabel}>⏰ {label}</Text>
          <Text style={styles.triggerSubText}>
            {ampmDisplayStr} {curH12}:{displayTime.split(':')[1] || '00'}
          </Text>
        </View>

        <View style={styles.triggerRight}>
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>{displayTime}</Text>
          </View>
          <Ionicons name="create-outline" size={18} color="#38bdf8" />
        </View>
      </TouchableOpacity>

      {/* 専用のドラムロール式時間設定モーダル */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalCard,
                  isPureBlack && { backgroundColor: '#080808', borderColor: '#262626' },
                ]}
              >
                {/* モーダルヘッダー */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Ionicons name="time-outline" size={20} color="#38bdf8" />
                    <Text style={styles.modalTitle}>食事時間を設定</Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleCancel}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {/* 現在選択中の時間の大きなプレビュー */}
                <View style={styles.previewContainer}>
                  <Text style={styles.previewText}>{currentPreview24}</Text>
                  <Text style={styles.previewSubText}>
                    {tempIsPm ? '午後' : '午前'} {tempHour12}:
                    {String(tempTens * 10 + tempOnes).padStart(2, '0')}
                  </Text>
                </View>

                {/* AM / PM 切替ボタン */}
                <View style={styles.ampmRow}>
                  <TouchableOpacity
                    style={[
                      styles.ampmBtn,
                      !tempIsPm && styles.ampmBtnActive,
                      isPureBlack && !tempIsPm && { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' },
                    ]}
                    onPress={() => handleToggleAmPm(false)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.ampmBtnText,
                        !tempIsPm && styles.ampmBtnTextActive,
                      ]}
                    >
                      🌅 AM (午前)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.ampmBtn,
                      tempIsPm && styles.ampmBtnActive,
                      isPureBlack && tempIsPm && { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' },
                    ]}
                    onPress={() => handleToggleAmPm(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.ampmBtnText,
                        tempIsPm && styles.ampmBtnTextActive,
                      ]}
                    >
                      🌙 PM (午後)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* クイックプリセットボタン */}
                <View style={styles.presetRow}>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPress={() => applyPresetMinutesAgo(0)}
                  >
                    <Text style={styles.presetBtnText}>現在</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPress={() => applyPresetMinutesAgo(15)}
                  >
                    <Text style={styles.presetBtnText}>15分前</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPress={() => applyPresetMinutesAgo(30)}
                  >
                    <Text style={styles.presetBtnText}>30分前</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPress={() => applyPresetMinutesAgo(60)}
                  >
                    <Text style={styles.presetBtnText}>1時間前</Text>
                  </TouchableOpacity>
                </View>

                {/* ドラムロールホイールエリア（時、十の位、一の位） */}
                <View style={styles.wheelsContainer}>
                  {/* 時 (1〜12) */}
                  <WheelColumn
                    key={`h12-${tempHour12}`}
                    data={HOURS_12}
                    selectedValue={tempHour12}
                    onSelect={setTempHour12}
                    unit="時"
                    columnWidth={74}
                  />

                  <Text style={styles.colonSeparator}>:</Text>

                  {/* 分 (十の位: 0〜5) */}
                  <WheelColumn
                    key={`tens-${tempTens}`}
                    data={MINUTE_TENS}
                    selectedValue={tempTens}
                    onSelect={setTempTens}
                    unit="分の十位"
                    columnWidth={70}
                  />

                  {/* 分 (一の位: 0〜9) */}
                  <WheelColumn
                    key={`ones-${tempOnes}`}
                    data={MINUTE_ONES}
                    selectedValue={tempOnes}
                    onSelect={setTempOnes}
                    unit="分の一位"
                    columnWidth={70}
                  />
                </View>

                {/* アクションボタン */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={handleCancel}
                  >
                    <Text style={styles.cancelBtnText}>キャンセル</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleSave}
                  >
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color="#ffffff"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.confirmBtnText}>決定</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  triggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  triggerLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  triggerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  triggerSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  triggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBadge: {
    backgroundColor: '#0369a133',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  timeBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38bdf8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#1e293b55',
    borderRadius: 12,
    marginBottom: 12,
  },
  previewText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 2,
  },
  previewSubText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  ampmRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  ampmBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  ampmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  ampmBtnTextActive: {
    color: '#ffffff',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  wheelsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b88',
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
    gap: 4,
  },
  wheelColumnContainer: {
    alignItems: 'center',
  },
  columnUnitText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  wheelWrapper: {
    height: WHEEL_HEIGHT,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  selectionHighlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 2,
    right: 2,
    height: ITEM_HEIGHT,
    backgroundColor: '#38bdf822',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    zIndex: 1,
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#64748b',
  },
  wheelItemTextSelected: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
  },
  colonSeparator: {
    fontSize: 26,
    fontWeight: '800',
    color: '#38bdf8',
    marginTop: 14,
    marginHorizontal: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  confirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});


