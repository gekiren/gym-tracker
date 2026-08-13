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
  onClose: () => void;
  onImport: (logs: Omit<MealLog, 'id'>[]) => Promise<void>;
  selectedDate: string;
}

export default function MdImportModal({ visible, onClose, onImport, selectedDate }: Props) {
  const { backgroundTheme } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';

  const [mdText, setMdText] = useState('');

  const handleParseAndImport = async () => {
    if (!mdText.trim()) {
      Alert.alert('入力エラー', 'Markdownテキストを入力してください。');
      return;
    }

    const lines = mdText.split('\n');
    const parsedLogs: Omit<MealLog, 'id'>[] = [];
    const now = new Date();

    // 簡易MDパーサー: "- 料理名: 500kcal, P:20g, F:10g, C:60g, 塩:2g, 繊:5g"
    for (const line of lines) {
      const clean = line.replace(/^[-*+]\s*/, '').trim();
      if (!clean) continue;

      const nameMatch = clean.match(/^([^:：]+)[:：]/);
      const name = nameMatch ? nameMatch[1].trim() : clean.split(',')[0].trim();

      const calMatch = clean.match(/(\d+(?:\.\d+)?)\s*kcal/i);
      const pMatch = clean.match(/P[:：]?\s*(\d+(?:\.\d+)?)\s*g/i);
      const fMatch = clean.match(/F[:：]?\s*(\d+(?:\.\d+)?)\s*g/i);
      const cMatch = clean.match(/C[:：]?\s*(\d+(?:\.\d+)?)\s*g/i);
      const sMatch = clean.match(/(?:塩|Na)[:：]?\s*(\d+(?:\.\d+)?)\s*g/i);
      const fiMatch = clean.match(/(?:繊|繊維)[:：]?\s*(\d+(?:\.\d+)?)\s*g/i);

      if (name) {
        parsedLogs.push({
          date: selectedDate,
          meal_type: 'dinner',
          meal_time: now.toTimeString().slice(0, 5),
          name,
          calories: calMatch ? parseFloat(calMatch[1]) : 0,
          protein: pMatch ? parseFloat(pMatch[1]) : 0,
          fat: fMatch ? parseFloat(fMatch[1]) : 0,
          carbs: cMatch ? parseFloat(cMatch[1]) : 0,
          sodium: sMatch ? parseFloat(sMatch[1]) : 0,
          fiber: fiMatch ? parseFloat(fiMatch[1]) : 0,
          created_at: now.getTime(),
        });
      }
    }

    if (parsedLogs.length === 0) {
      Alert.alert('解析エラー', '有効な食事ログ形式が検出できませんでした。');
      return;
    }

    try {
      await onImport(parsedLogs);
      setMdText('');
      onClose();
      Alert.alert('成功', `${parsedLogs.length}件の食事ログを取り込みました。`);
    } catch {
      Alert.alert('取り込みエラー', '保存に失敗しました。');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, isPureBlack && { backgroundColor: '#000000', borderWidth: 1, borderColor: '#1f1f1f' }]}>
          <View style={[styles.header, isPureBlack && { borderBottomColor: '#1f1f1f' }]}>
            <Text style={styles.title}>📋 Markdown一括取り込み</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={[styles.hint, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f', borderWidth: 1 }]}>
              形式例:{'\n'}
              - 鶏胸肉サラダ: 250kcal, P:30g, F:5g, C:10g{'\n'}
              - 白米200g: 330kcal, P:5g, F:1g, C:75g
            </Text>

            <TextInput
              style={[styles.textArea, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}
              value={mdText}
              onChangeText={setMdText}
              placeholder="ここにMarkdown形式の食事リストを貼り付け..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={8}
            />

            <TouchableOpacity style={styles.importBtn} onPress={handleParseAndImport}>
              <Text style={styles.importBtnText}>🚀 パースして一括取り込み</Text>
            </TouchableOpacity>
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
  body: { padding: 16 },
  hint: { fontSize: 12, color: '#94a3b8', backgroundColor: '#1e293b', padding: 10, borderRadius: 8, lineHeight: 18, marginBottom: 12 },
  textArea: { backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', padding: 12, fontSize: 13, minHeight: 140, textAlignVertical: 'top', marginBottom: 16 },
  importBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  importBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
