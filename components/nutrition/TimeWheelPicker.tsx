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
const VISIBLE_ITEMS = 3; // 画面内に表示する項目数
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 138px

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {});
  }
};

interface WheelColumnProps {
  data: number[];
  selectedValue: number;
  onSelect: (val: number) => void;
  unit: string;
  padZero?: boolean;
}

function WheelColumn({
  data,
  selectedValue,
  onSelect,
  unit,
  padZero = true,
}: WheelColumnProps) {
  const flatListRef = useRef<FlatList<number>>(null);
  const isUserScrollingRef = useRef(false);

  // 初期位置合わせ
  useEffect(() => {
    const idx = data.indexOf(selectedValue);
    if (idx >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: idx * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      const val = data[clampedIndex];
      if (val !== undefined && val !== selectedValue) {
        onSelect(val);
        triggerHaptic();
      }
      isUserScrollingRef.current = false;
    },
    [data, selectedValue, onSelect]
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      const val = data[clampedIndex];
      if (val !== undefined && val !== selectedValue) {
        onSelect(val);
        triggerHaptic();
      }
    },
    [data, selectedValue, onSelect]
  );

  const handleItemPress = (item: number, index: number) => {
    flatListRef.current?.scrollToOffset({
      offset: index * ITEM_HEIGHT,
      animated: true,
    });
    onSelect(item);
    triggerHaptic();
  };

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  return (
    <View style={styles.wheelColumnContainer}>
      <Text style={styles.columnUnitText}>{unit}</Text>
      <View style={styles.wheelWrapper}>
        {/* 中央のハイライト枠 */}
        <View pointerEvents="none" style={styles.selectionHighlight} />

        <FlatList
          ref={flatListRef}
          data={data}
          keyExtractor={(item) => String(item)}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          contentContainerStyle={{
            paddingVertical: ITEM_HEIGHT, // 上下に1項目分の余白で中央配置
          }}
          onScrollBeginDrag={() => {
            isUserScrollingRef.current = true;
          }}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollEndDrag={handleScrollEndDrag}
          renderItem={({ item, index }) => {
            const isSelected = item === selectedValue;
            const text = padZero ? String(item).padStart(2, '0') : String(item);
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
  const [tempHour, setTempHour] = useState(12);
  const [tempMinute, setTempMinute] = useState(0);

  // "HH:mm" からパース
  const parseCurrentTime = (timeStr: string) => {
    const [hStr, mStr] = (timeStr || '12:00').split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    return {
      hour: isNaN(h) ? 12 : Math.max(0, Math.min(23, h)),
      minute: isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
    };
  };

  const openModal = () => {
    const { hour, minute } = parseCurrentTime(value);
    setTempHour(hour);
    setTempMinute(minute);
    setModalVisible(true);
    triggerHaptic();
  };

  const handleSave = () => {
    const formatted = `${String(tempHour).padStart(2, '0')}:${String(tempMinute).padStart(2, '0')}`;
    onChange(formatted);
    setModalVisible(false);
    triggerHaptic();
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  // プリセット適用
  const applyPresetMinutesAgo = (minsAgo: number) => {
    const now = new Date();
    if (minsAgo > 0) {
      now.setMinutes(now.getMinutes() - minsAgo);
    }
    const h = now.getHours();
    const m = now.getMinutes();
    setTempHour(h);
    setTempMinute(m);
    triggerHaptic();
  };

  const displayTime = value || '12:00';
  const { hour: curH } = parseCurrentTime(displayTime);
  const isPm = curH >= 12;
  const h12 = curH % 12 === 0 ? 12 : curH % 12;
  const ampmStr = isPm ? '午後' : '午前';

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
            {ampmStr} {h12}:{displayTime.split(':')[1] || '00'}
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
                  <Text style={styles.previewText}>
                    {String(tempHour).padStart(2, '0')}:
                    {String(tempMinute).padStart(2, '0')}
                  </Text>
                  <Text style={styles.previewSubText}>
                    {tempHour >= 12 ? '午後' : '午前'}{' '}
                    {tempHour % 12 === 0 ? 12 : tempHour % 12}:
                    {String(tempMinute).padStart(2, '0')}
                  </Text>
                </View>

                {/* クイックプリセットボタン */}
                <View style={styles.presetRow}>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    onPress={() => applyPresetMinutesAgo(0)}
                  >
                    <Text style={styles.presetBtnText}>現在時刻</Text>
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

                {/* ドラムロールホイールエリア */}
                <View style={styles.wheelsContainer}>
                  <WheelColumn
                    key={`hour-${tempHour}`}
                    data={HOURS}
                    selectedValue={tempHour}
                    onSelect={setTempHour}
                    unit="時 (00-23)"
                  />

                  <Text style={styles.colonSeparator}>:</Text>

                  <WheelColumn
                    key={`min-${tempMinute}`}
                    data={MINUTES}
                    selectedValue={tempMinute}
                    onSelect={setTempMinute}
                    unit="分 (00-59)"
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
                    <Ionicons name="checkmark" size={18} color="#ffffff" style={{ marginRight: 4 }} />
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
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
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
    marginBottom: 12,
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
    paddingVertical: 8,
    backgroundColor: '#1e293b55',
    borderRadius: 12,
    marginBottom: 14,
  },
  previewText: {
    fontSize: 32,
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
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 14,
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
    marginBottom: 18,
  },
  wheelColumnContainer: {
    width: 90,
    alignItems: 'center',
  },
  columnUnitText: {
    fontSize: 11,
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
    left: 4,
    right: 4,
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
    fontSize: 28,
    fontWeight: '800',
    color: '#38bdf8',
    marginTop: 18,
    marginHorizontal: 4,
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

