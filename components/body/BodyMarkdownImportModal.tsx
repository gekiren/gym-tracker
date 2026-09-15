import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Theme, useAppTheme } from '../../src/theme';
import { parseBodyCompositionMarkdown, ParsedBodyRecord } from '../../src/utils/markdownBodyParser';
import { useBodyStore } from '../../src/store/bodyStore';

const TEMPLATE_TABLE = `| 測定日 | 体重(kg) | 骨格筋量(kg) | 体脂肪率(%) |
| :--- | ---: | ---: | ---: |
| 2026/09/10 | 70.5 | 33.2 | 15.2 |
| 2026/09/11 | 70.2 | 33.3 | 15.0 |
| 2026/09/12 | 70.8 | 33.1 | 15.4 |`;

const TEMPLATE_LIST = `## ⚖️ 体組成 (2026-09-14)
- 体重: 70.5 kg
- 体脂肪率: 15.2 %
- 骨格筋量: 33.2 kg
- 除脂肪体重 (LBM): 59.8 kg
- メモ: 朝測定`;

interface BodyMarkdownImportModalProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onImportSuccess?: (count: number) => void;
}

export default function BodyMarkdownImportModal({
  visible,
  selectedDate,
  onClose,
  onImportSuccess,
}: BodyMarkdownImportModalProps) {
  const { colors, backgroundTheme } = useAppTheme();
  const isPureBlack = backgroundTheme === 'pureBlack';

  const [mdText, setMdText] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const importBodyLogs = useBodyStore((state) => state.importBodyLogs);

  // モーダルオープン時の初期化
  useEffect(() => {
    if (visible) {
      setMdText('');
      setShowHelp(false);
      setIsImporting(false);
    }
  }, [visible]);

  // Markdownのリアルタイム解析
  const parsedLogs: ParsedBodyRecord[] = useMemo(() => {
    if (!mdText.trim()) return [];
    return parseBodyCompositionMarkdown(mdText, selectedDate);
  }, [mdText, selectedDate]);

  // クリップボードからの貼り付け
  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setMdText(text);
      } else {
        Alert.alert('クリップボードが空です', 'Markdownテキストをコピーしてから貼り付けてください。');
      }
    } catch (e: any) {
      Alert.alert('エラー', 'クリップボードの読み込みに失敗しました。');
    }
  };

  // テンプレートの挿入
  const handleInsertTemplate = (template: string) => {
    setMdText(template);
    setShowHelp(false);
  };

  // 取り込み実行ハンドラー
  const handleExecuteImport = async () => {
    if (parsedLogs.length === 0) {
      Alert.alert('確認', '取り込み可能な体組成データが見つかりませんでした。テキストをご確認ください。');
      return;
    }

    setIsImporting(true);
    try {
      const count = await importBodyLogs(
        parsedLogs.map((item) => ({
          date: item.date,
          weight: item.weight,
          body_fat_rate: item.body_fat_rate,
          muscle_mass: item.muscle_mass,
          lbm: item.lbm,
          height: item.height,
          neck: item.neck,
          waist: item.waist,
          hip: item.hip,
          wrist: item.wrist,
          ankle: item.ankle,
          memo: item.memo,
          source: 'manual',
        })),
        selectedDate
      );

      setIsImporting(false);
      Alert.alert(
        '取込完了 🎉',
        `${count}日分の体組成データを取り込み、保存しました。`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              if (onImportSuccess) onImportSuccess(count);
            },
          },
        ]
      );
    } catch (e: any) {
      setIsImporting(false);
      Alert.alert('取込エラー', e.message || '体組成データの取り込みに失敗しました。');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: isPureBlack ? '#0a0a0a' : Theme.colors.card },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconBg}>
                <Ionicons name="document-text" size={20} color="#38bdf8" />
              </View>
              <Text style={styles.title}>体組成 Markdown 取込</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.description}>
              Obsidianデイリーノート、InBody履歴テーブル、またはメモ帳からMarkdownを貼り付けて、当日または複数日分の体組成データをまとめて取り込めます。
            </Text>

            {/* Quick Actions */}
            <View style={styles.actionToolbar}>
              <TouchableOpacity
                style={styles.pasteBtn}
                onPress={handlePasteFromClipboard}
                activeOpacity={0.7}
              >
                <Ionicons name="clipboard-outline" size={16} color="#38bdf8" style={{ marginRight: 6 }} />
                <Text style={styles.pasteBtnText}>クリップボードから貼付</Text>
              </TouchableOpacity>

              {mdText.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => setMdText('')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={15} color="#ef4444" style={{ marginRight: 4 }} />
                  <Text style={styles.clearBtnText}>クリア</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.helpToggleBtn}
                onPress={() => setShowHelp((prev) => !prev)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showHelp ? 'chevron-up' : 'help-circle-outline'}
                  size={16}
                  color={Theme.colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.helpToggleText}>
                  {showHelp ? '例を閉じる' : '形式例を見る'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Help & Template Accordion */}
            {showHelp && (
              <View style={styles.helpBox}>
                <Text style={styles.helpTitle}>💡 対応フォーマット例</Text>

                <Text style={styles.templateSectionLabel}>1. テーブル形式 (InBody履歴や複数日)</Text>
                <Text style={styles.templateCode}>{TEMPLATE_TABLE}</Text>
                <TouchableOpacity
                  style={styles.applyTemplateBtn}
                  onPress={() => handleInsertTemplate(TEMPLATE_TABLE)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={14} color="#38bdf8" style={{ marginRight: 4 }} />
                  <Text style={styles.applyTemplateBtnText}>このテーブル例を挿入</Text>
                </TouchableOpacity>

                <Text style={[styles.templateSectionLabel, { marginTop: 12 }]}>
                  2. リスト・見出し形式 (Obsidianデイリーノート等)
                </Text>
                <Text style={styles.templateCode}>{TEMPLATE_LIST}</Text>
                <TouchableOpacity
                  style={styles.applyTemplateBtn}
                  onPress={() => handleInsertTemplate(TEMPLATE_LIST)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={14} color="#38bdf8" style={{ marginRight: 4 }} />
                  <Text style={styles.applyTemplateBtnText}>このリスト例を挿入</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input Area */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Markdownテキストをここに貼り付けてください...&#10;例:&#10;| 測定日 | 体重 | 体脂肪率 | 骨格筋量 |&#10;| 2026-09-14 | 70.5 | 15.2 | 33.2 |"
                placeholderTextColor={Theme.colors.textMuted}
                multiline
                numberOfLines={7}
                value={mdText}
                onChangeText={setMdText}
                textAlignVertical="top"
              />
            </View>

            {/* Preview Section */}
            {mdText.trim().length > 0 && (
              <View style={styles.previewSection}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>解析プレビュー</Text>
                  {parsedLogs.length > 0 ? (
                    <View style={styles.badgeSuccess}>
                      <Ionicons name="checkmark-circle" size={14} color="#4ade80" style={{ marginRight: 4 }} />
                      <Text style={styles.badgeSuccessText}>{parsedLogs.length}日分を検出</Text>
                    </View>
                  ) : (
                    <View style={styles.badgeWarning}>
                      <Ionicons name="alert-circle" size={14} color="#fbbf24" style={{ marginRight: 4 }} />
                      <Text style={styles.badgeWarningText}>体組成データ未検出</Text>
                    </View>
                  )}
                </View>

                {parsedLogs.length > 0 ? (
                  <View style={styles.previewList}>
                    {parsedLogs.map((log, idx) => (
                      <View key={`${log.date}_${idx}`} style={styles.previewCard}>
                        <View style={styles.cardTopRow}>
                          <View style={styles.dateChip}>
                            <Ionicons name="calendar-outline" size={13} color="#38bdf8" style={{ marginRight: 4 }} />
                            <Text style={styles.dateChipText}>{log.date}</Text>
                          </View>
                          {log.date === selectedDate && (
                            <Text style={styles.currentDateBadge}>選択中</Text>
                          )}
                        </View>

                        <View style={styles.statsRow}>
                          {log.weight !== undefined && (
                            <View style={styles.statItem}>
                              <Text style={styles.statItemLabel}>体重</Text>
                              <Text style={styles.statItemValue}>{log.weight} kg</Text>
                            </View>
                          )}
                          {log.body_fat_rate !== undefined && (
                            <View style={styles.statItem}>
                              <Text style={styles.statItemLabel}>体脂肪率</Text>
                              <Text style={[styles.statItemValue, { color: '#fb923c' }]}>
                                {log.body_fat_rate} %
                              </Text>
                            </View>
                          )}
                          {log.muscle_mass !== undefined && (
                            <View style={styles.statItem}>
                              <Text style={styles.statItemLabel}>骨格筋量</Text>
                              <Text style={[styles.statItemValue, { color: '#4ade80' }]}>
                                {log.muscle_mass} kg
                              </Text>
                            </View>
                          )}
                          {log.lbm !== undefined && (
                            <View style={styles.statItem}>
                              <Text style={styles.statItemLabel}>LBM</Text>
                              <Text style={[styles.statItemValue, { color: '#38bdf8' }]}>
                                {log.lbm} kg
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* 各種測定値やメモ */}
                        {(log.height || log.waist || log.memo) && (
                          <View style={styles.cardSubDetails}>
                            {log.height && <Text style={styles.subDetailText}>身長: {log.height}cm</Text>}
                            {log.waist && <Text style={styles.subDetailText}>ウエスト: {log.waist}cm</Text>}
                            {log.memo && <Text style={styles.subDetailText}>メモ: {log.memo}</Text>}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDataHint}>
                    日付や「体重」「体脂肪率」などの数値を含むMarkdownテキストを入力してください。
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>キャンセル</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.importBtn,
                parsedLogs.length === 0 || isImporting ? styles.importBtnDisabled : null,
              ]}
              onPress={handleExecuteImport}
              disabled={parsedLogs.length === 0 || isImporting}
              activeOpacity={0.8}
            >
              {isImporting ? (
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              ) : (
                <Ionicons name="download-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.importBtnText}>
                {isImporting
                  ? '取り込み中...'
                  : parsedLogs.length > 0
                  ? `${parsedLogs.length}日分を取り込む`
                  : '取り込む'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '90%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 20,
  },
  description: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    lineHeight: 19,
    marginBottom: 14,
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  pasteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38bdf8',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  helpToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  helpToggleText: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 8,
  },
  templateSectionLabel: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: Theme.colors.textMuted,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 6,
    lineHeight: 16,
  },
  applyTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 6,
  },
  applyTemplateBtnText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  inputWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  textInput: {
    padding: 14,
    fontSize: 13,
    color: Theme.colors.text,
    minHeight: 130,
    maxHeight: 200,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  previewSection: {
    marginTop: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeSuccessText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  badgeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeWarningText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  previewList: {
    gap: 8,
  },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  currentDateBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statItemLabel: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  statItemValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  cardSubDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  subDetailText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  noDataHint: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelBtnText: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  importBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});
