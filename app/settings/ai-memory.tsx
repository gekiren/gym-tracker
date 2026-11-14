import React, { useState, useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { AiCoachSection } from '../../components/profile/AiCoachSection';

export default function AiMemorySettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const aiCompanionMemory = settings.aiCompanionMemory;
  const setAiCompanionMemory = useSettingsStore((state) => state.setAiCompanionMemory);
  const [memoryText, setMemoryText] = useState(aiCompanionMemory || '');
  const [isSaving, setIsSaving] = useState(false);

  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;
  const isBasic = !isPremium && !isEarly;
  const maxTokens = (isPremium || isEarly) ? 20 : 5;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setAiCompanionMemory(memoryText);
      Alert.alert('保存完了', 'AIアシスタントのパーソナライズ記憶を更新しました。');
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
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AIアシスタント</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* AI Quota Section */}
          <AiCoachSection
            aiTokensBalance={settings.aiTokensBalance}
            maxTokens={maxTokens}
            isBasic={isBasic}
            t={t}
          />

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
              placeholderTextColor={colors.textMuted}
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
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={styles.clearButtonText}>記憶をすべて消去</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 54,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    content: {
      padding: 16,
      paddingBottom: 60,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
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
      color: colors.primary,
    },
    infoText: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 19,
    },
    editorCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
    },
    charCount: {
      fontSize: 12,
      color: colors.textMuted,
    },
    textInput: {
      minHeight: 180,
      maxHeight: 350,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonContainer: {
      gap: 12,
      marginTop: 8,
    },
    saveButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      paddingVertical: 14,
      borderRadius: 12,
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
      minHeight: 48,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 59, 48, 0.3)',
      backgroundColor: 'rgba(255, 59, 48, 0.08)',
    },
    clearButtonText: {
      color: colors.danger,
      fontSize: 14,
      fontWeight: '600',
    },
  });
