import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { MealLog } from '../../src/db/types';
import { useAppTheme } from '../../src/theme';

interface Props {
  visible: boolean;
  historyLogs: MealLog[];
  onClose: () => void;
  onSelect: (log: Omit<MealLog, 'id'>) => Promise<void>;
  selectedDate: string;
}

export default function HistorySelectModal({
  visible,
  historyLogs,
  onClose,
  onSelect,
  selectedDate,
}: Props) {
  const { backgroundTheme } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';

  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = historyLogs.filter((log) =>
    (log.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // ユニークな料理名でグループ化（最新のものを表示）
  const uniqueMap = new Map<string, MealLog>();
  filteredLogs.forEach((log) => {
    const key = (log.name || '').trim().toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, log);
    }
  });
  const displayItems = Array.from(uniqueMap.values());

  const handleSelect = async (item: MealLog) => {
    try {
      const now = new Date();
      await onSelect({
        date: selectedDate,
        meal_type: item.meal_type,
        meal_time: now.toTimeString().slice(0, 5),
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        sodium: item.sodium,
        fiber: item.fiber,
        memo: item.memo,
        created_at: now.getTime(),
      });
      onClose();
    } catch {
      Alert.alert('エラー', '追加に失敗しました。');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, isPureBlack && { backgroundColor: '#000000', borderWidth: 1, borderColor: '#1f1f1f' }]}>
          <View style={[styles.header, isPureBlack && { borderBottomColor: '#1f1f1f' }]}>
            <Text style={styles.title}>⭐ 過去の履歴から再使用</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <TextInput
              style={[styles.searchInput, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="料理名で検索..."
              placeholderTextColor="#475569"
            />
          </View>

          <ScrollView style={styles.body}>
            {displayItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>過去の記録が見つかりません</Text>
              </View>
            ) : (
              displayItems.map((item) => (
                <TouchableOpacity
                  key={`hist-${item.id}`}
                  style={[styles.itemCard, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCal}>{Math.round(item.calories)} kcal</Text>
                  </View>
                  <View style={styles.itemPfcRow}>
                    <Text style={styles.pfcText}>P: {item.protein.toFixed(1)}g</Text>
                    <Text style={styles.pfcText}>F: {item.fat.toFixed(1)}g</Text>
                    <Text style={styles.pfcText}>C: {item.carbs.toFixed(1)}g</Text>
                    <Text style={styles.pfcText}>塩: {item.sodium.toFixed(1)}g</Text>
                    <Text style={styles.pfcText}>繊: {item.fiber.toFixed(1)}g</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-start' },
  sheet: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    marginTop: Platform.OS === 'android' ? 40 : 50,
    marginHorizontal: 8,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  title: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#94a3b8' },
  searchBox: { padding: 12 },
  searchInput: { backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  body: { paddingHorizontal: 12 },
  emptyBox: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 14 },
  itemCard: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#f8fafc', flex: 1 },
  itemCal: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  itemPfcRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pfcText: { fontSize: 11, color: '#94a3b8' },
});
