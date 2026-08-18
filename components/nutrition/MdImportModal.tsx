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
import * as Clipboard from 'expo-clipboard';
import { MealLog } from '../../src/db/types';
import { useAppTheme } from '../../src/theme';
import { getDefaultMealType } from '../../src/utils/nutritionUtils';

export const AI_NUTRITION_PROMPT = `あなたはスポーツ栄養学に精通したAI栄養士です。
ユーザーから送信された「食事のテキストメモ」「食事の写真」「食品の栄養成分表示ラベルの写真」を解析し、アプリへ一括取り込み可能なMarkdownフォーマットで食事ログを出力してください。

【出力フォーマットルール】
1. 1品目につき1行で記述してください。
2. 必ず以下の形式を厳格に守って出力してください。
   - 料理名: 〇〇kcal, P:〇g, F:〇g, C:〇g, 塩:〇g, 繊:〇g

【記述ルールと注意点】
- 「料理名」は具体的かつ簡潔に記載してください（例: 鶏胸肉サラダ、白米200g）。
- 数値は半角数字で記載し、単位（kcal, g）を必ず付けてください。
- P（タンパク質）、F（脂質）、C（炭水化物）は必須項目です。
- 塩（塩分/食塩相当量）および 繊（食物繊維）が写真やテキストから推測可能な場合は記載してください。不明または微量な場合は省略しても構いません。
- 写真に複数の品目が写っている場合は、品目ごとに改行して出力してください。
- コピペしやすくするため、挨拶や前置き文・解説文言は一切含めず、出力フォーマットのテキストのみを出力してください。

【出力例】
- 鶏胸肉サラダ: 250kcal, P:30g, F:5g, C:10g
- 白米200g: 330kcal, P:5g, F:1g, C:75g
- 鮭の塩焼き: 200kcal, P:22g, F:12g, C:0g, 塩:1.5g
- 納豆1パック: 100kcal, P:8g, F:5g, C:6g, 塩:0.5g, 繊:3g`;

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
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = async () => {
    try {
      await Clipboard.setStringAsync(AI_NUTRITION_PROMPT);
      setCopied(true);
      Alert.alert(
        'コピー完了 📋',
        'AI栄養士用のプロンプトをクリップボードにコピーしました！\n\nChatGPTやClaude等の外部AIに写真やテキストを添付してこのプロンプトを渡すことで、アプリへ一括取り込み可能な形式のテキストが生成されます。'
      );
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      Alert.alert('コピーエラー', 'クリップボードへのコピーに失敗しました。');
    }
  };

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
          meal_type: getDefaultMealType(now),
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
            {/* AIプロンプトコピーボタン領域 */}
            <View style={[styles.promptCard, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f' }]}>
              <View style={styles.promptHeader}>
                <Text style={styles.promptTitle}>🤖 外部AI用プロンプト</Text>
                <Text style={styles.promptSubtitle}>ChatGPTやClaudeに食事写真・メモを解析させる専用プロンプト</Text>
              </View>
              <TouchableOpacity
                style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
                onPress={handleCopyPrompt}
                activeOpacity={0.8}
              >
                <Text style={styles.copyBtnText}>
                  {copied ? '✓ クリップボードにコピーしました' : '📋 AIプロンプトをコピー'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.hint, isPureBlack && { backgroundColor: '#080808', borderColor: '#1f1f1f', borderWidth: 1 }]}>
              取り込み形式例:{'\n'}
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
  promptCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  promptHeader: {
    marginBottom: 8,
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 2,
  },
  promptSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
  },
  copyBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnSuccess: {
    backgroundColor: '#059669',
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  hint: { fontSize: 12, color: '#94a3b8', backgroundColor: '#1e293b', padding: 10, borderRadius: 8, lineHeight: 18, marginBottom: 12 },
  textArea: { backgroundColor: '#1e293b', borderRadius: 10, borderWidth: 1, borderColor: '#334155', color: '#f8fafc', padding: 12, fontSize: 13, minHeight: 140, textAlignVertical: 'top', marginBottom: 16 },
  importBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  importBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

