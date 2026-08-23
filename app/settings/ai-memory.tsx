import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Theme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/settingsStore';

export default function AiMemorySettingsScreen() {
  const aiCompanionMemory = useSettingsStore((state) => state.settings.aiCompanionMemory);
  const setAiCompanionMemory = useSettingsStore((state) => state.setAiCompanionMemory);
  const [memoryText, setMemoryText] = useState(aiCompanionMemory || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setAiCompanionMemory(memoryText);
      Alert.alert('保存完了', 'AI音声アシスタントの記憶・プロフィールを更新しました。');
    } catch (e: any) {
      Alert.alert('エラー', `保存に失敗しました: ${e?.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert(
      '記憶の初期化',
      'AIがこれまでに学習・記録したすべての記憶を消去しますか？\nこの操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '消去する',
          style: 'destructive',
          onPress: async () => {
            try {
              setMemoryText('');
              await setAiCompanionMemory('');
              Alert.alert('消去完了', 'AIの記憶をすべて消去しました。');
            } catch (e: any) {
              Alert.alert('エラー', `消去に失敗しました: ${e?.message || e}`);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AIの記憶・プロフィール</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.iconRow}>
              <Ionicons name="sparkles" size={20} color="#4facfe" />
              <Text style={styles.infoTitle}>パーソナライズ記憶について</Text>
            </View>
            <Text style={styles.infoText}>
              音声AIアシスタントとの対話を通じて、あなたの好みや生活習慣、怪我・体調の注意点などがここに自動蓄積されます。
              次回の会話時、AIはこの内容を踏まえてパーソナライズされた回答を行います。
            </Text>
          </View>

          {/* Editor Card */}
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>記憶内容（直接編集可能）</Text>
              <Text style={styles.charCount}>{memoryText.length} 文字</Text>
            </View>
            <TextInput
              style={styles.textInput}
              multiline
              value={memoryText}
              onChangeText={setMemoryText}
              placeholder={'例:\n・右肩を痛めているため高重量プレスは避ける\n・水筒の容量は600ml\n・朝型でトレーニングは午前中に行うことが多い'}
              placeholderTextColor={Theme.colors.textMuted}
              textAlignVertical="top"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>記憶を保存する</Text>
            </TouchableOpacity>

            {memoryText.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
                <Text style={styles.clearButtonText}>記憶をすべて消去</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 54,
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  content: {
    padding: Theme.spacing.md,
    paddingBottom: 60,
  },
  infoCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.25)',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4facfe',
  },
  infoText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 19,
  },
  editorCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: 12,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editorTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  charCount: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  textInput: {
    minHeight: 180,
    maxHeight: 350,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    color: Theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  clearButtonText: {
    color: Theme.colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
