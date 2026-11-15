import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAppTheme } from '../../src/theme';
import { useGoogleDriveSyncStore } from '../../src/store/googleDriveSyncStore';
import {
  approvePendingProposal,
  checkDriveForProposals,
  connectGoogleDriveAccount,
  dismissPendingProposal,
  DRIVE_FILES,
  importProposalsFromLocalFile,
  loadAppliedHistory,
  loadDriveSyncSettings,
  loadRestorePauseState,
  loadSavedAdvices,
  resolveRestorePause,
  saveDriveSyncSettings,
  uploadAppRecordsToDrive,
} from '../../src/services/googleDriveSyncService';
import { buildAgentGuideMarkdown } from '../../src/services/googleDrive/drivePayloadBuilder';
import { normalizeAdviceEntries } from '../../src/services/googleDrive/driveProposalApplier';

function formatDisplayDateTime(iso?: string): string {
  if (!iso) return '未実行';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

export default function GoogleDriveSyncSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const settings = useGoogleDriveSyncStore((s) => s.settings);
  const activity = useGoogleDriveSyncStore((s) => s.activity);
  const restorePause = useGoogleDriveSyncStore((s) => s.restorePause);
  const pendingProposal = useGoogleDriveSyncStore((s) => s.pendingProposal);
  const advices = useGoogleDriveSyncStore((s) => s.advices);
  const appliedHistory = useGoogleDriveSyncStore((s) => s.appliedHistory);
  const lastStatusMessage = useGoogleDriveSyncStore((s) => s.lastStatusMessage);

  const [folderInput, setFolderInput] = useState(settings.folderName || 'TreNote_AI_Sync');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    setFolderInput(settings.folderName || 'TreNote_AI_Sync');
  }, [settings.folderName]);

  useEffect(() => {
    Promise.all([
      loadDriveSyncSettings(),
      loadRestorePauseState(),
      loadSavedAdvices(),
      loadAppliedHistory(),
    ])
      .then(([, , savedAdvices, savedHistory]) => {
        const store = useGoogleDriveSyncStore.getState();
        store.setAdvices(savedAdvices);
        store.setAppliedHistory(savedHistory);
      })
      .catch((err) => {
        console.warn('[GoogleDriveSyncScreen] Initial load failed:', err);
      });
  }, []);

  const isBusy = activity !== 'idle' || isConnecting;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await connectGoogleDriveAccount();
      if (res.success) {
        Alert.alert(
          '連携完了',
          `Googleドライブ (${res.email || '認証済み'}) と同期フォルダの準備が完了しました。`
        );
      } else if (res.error) {
        Alert.alert('連携エラー', res.error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualUpload = async () => {
    if (restorePause?.paused) {
      Alert.alert(
        'バックアップ復元後の確認',
        '現在はバックアップ復元による保護一時停止中です。現在のアプリ記録で Googleドライブを上書きアップロードしますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '上書きして再開',
            onPress: async () => {
              const res = await resolveRestorePause('upload_now');
              if (res.success) {
                Alert.alert('完了', '現在の記録をアップロードし、保護モードを解除しました。');
              } else if (res.error) {
                Alert.alert('エラー', res.error);
              }
            },
          },
        ]
      );
      return;
    }

    const res = await uploadAppRecordsToDrive({ interactive: true, reason: 'manual_button' });
    if (res.success) {
      Alert.alert('アップロード完了', '最新のアプリ記録を Googleドライブへ保存しました。');
    } else if (res.error) {
      Alert.alert('アップロードエラー', res.error);
    }
  };

  const handleManualCheck = async () => {
    const res = await checkDriveForProposals({
      interactive: true,
      force: true,
      reason: 'manual_button',
    });
    if (res.status === 'applied') {
      Alert.alert('AI提案を反映しました', res.summary || '最新の提案をアプリへ反映しました。');
    } else if (res.status === 'pending_confirm') {
      Alert.alert(
        '新しいAI提案を検出しました',
        `${res.summary || ''}\n\n画面上部の「確認待ちのAI提案」カードから内容を確認して反映できます。`
      );
    } else if (res.status === 'no_update') {
      Alert.alert('新着なし', '新しい pending 状態の AI提案はありませんでした。');
    } else if (res.status === 'error' && res.error) {
      Alert.alert('読み込みエラー', res.error);
    }
  };

  const handleLocalImport = async () => {
    const res = await importProposalsFromLocalFile();
    if (res.status === 'applied') {
      Alert.alert('反映完了', res.summary || 'JSONファイルの提案を反映しました。');
    } else if (res.status === 'pending_confirm') {
      Alert.alert('提案を読み込みました', '画面上部の確認カードから反映を実行してください。');
    } else if (res.status === 'error' && res.error) {
      Alert.alert('読み込みエラー', res.error);
    }
  };

  const handleApprovePending = async () => {
    const res = await approvePendingProposal();
    if (res.success) {
      Alert.alert('反映完了', res.summary || 'AI提案を反映しました。');
    } else if (res.error) {
      Alert.alert('エラー', res.error);
    }
  };

  const handleDismissPending = async () => {
    await dismissPendingProposal(true);
  };

  const handleSaveFolderName = async () => {
    const cleaned = folderInput.trim() || 'TreNote_AI_Sync';
    await saveDriveSyncSettings({ folderName: cleaned, folderId: undefined });
    setFolderInput(cleaned);
    Alert.alert('保存完了', `同期フォルダ名を「${cleaned}」に更新しました。`);
  };

  const handleCopyGuide = async () => {
    await Clipboard.setStringAsync(buildAgentGuideMarkdown());
    Alert.alert('コピー完了', 'AIエージェント向け接続ガイド（AI_AGENT_GUIDE.md）をコピーしました。');
  };

  const pendingAdvices = pendingProposal
    ? normalizeAdviceEntries(pendingProposal.payload)
    : [];

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Googleドライブ AI双方向同期</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── 復元保護バナー ── */}
        {restorePause?.paused && (
          <View style={[styles.card, styles.warningCard]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#f59e0b" />
              <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>
                自動アップロード一時停止中（復元保護）
              </Text>
            </View>
            <Text style={styles.helperText}>
              {formatDisplayDateTime(restorePause.restoredAt)} にバックアップ復元が実行されたため、ドライブ上の新しい記録を上書きしないよう自動アップロードを停止しています。
            </Text>
            <View style={styles.buttonColumn}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#f59e0b' }]}
                onPress={() => resolveRestorePause('upload_now')}
                disabled={isBusy}
              >
                <Text style={[styles.primaryButtonText, { color: '#111827' }]}>
                  復元データでドライブを上書きして再開
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => resolveRestorePause('resume_without_upload')}
                disabled={isBusy}
              >
                <Text style={styles.secondaryButtonText}>
                  上書きせず今後の記録更新から再開
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 確認待ちの AI 提案カード ── */}
        {pendingProposal && (
          <View style={[styles.card, styles.proposalCard]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="sparkles" size={20} color="#38bdf8" />
              <Text style={[styles.cardTitle, { color: '#38bdf8' }]}>
                確認待ちの AI トレーナー提案
              </Text>
            </View>
            <Text style={styles.metaText}>
              提案元: {pendingProposal.payload.agentName || 'AI Agent'} / ID: {pendingProposal.payload.proposalId}
            </Text>
            <Text style={styles.proposalSummaryText}>{pendingProposal.previewSummary}</Text>

            {pendingAdvices.length > 0 && (
              <View style={styles.advicePreviewBox}>
                <Text style={styles.advicePreviewTitle}>
                  {pendingAdvices[0].title || 'トレーナーアドバイス'}
                </Text>
                <Text style={styles.advicePreviewBody} numberOfLines={5}>
                  {pendingAdvices[0].message}
                </Text>
              </View>
            )}

            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.rowButton, styles.secondaryButton]}
                onPress={handleDismissPending}
                disabled={isBusy}
              >
                <Text style={styles.secondaryButtonText}>スキップ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rowButton, styles.primaryButton]}
                onPress={handleApprovePending}
                disabled={isBusy}
              >
                <Text style={styles.primaryButtonText}>アプリに反映する</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 接続ステータス & 手動操作カード ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="logo-google" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>ドライブ接続・同期状況</Text>
          </View>

          <View style={styles.statusList}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>接続アカウント</Text>
              <Text style={styles.statusValue}>
                {settings.connectedEmail || '未連携'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>最終アップロード</Text>
              <Text style={styles.statusValue}>
                {formatDisplayDateTime(settings.lastUploadAt)}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>最終AI提案チェック</Text>
              <Text style={styles.statusValue}>
                {formatDisplayDateTime(settings.lastDownloadAt)}
              </Text>
            </View>
          </View>

          {lastStatusMessage && (
            <View style={styles.statusBanner}>
              {isBusy && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
              <Text style={styles.statusBannerText}>{lastStatusMessage}</Text>
            </View>
          )}

          {settings.lastError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
              <Text style={styles.errorBannerText}>{settings.lastError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              settings.connectedEmail ? styles.outlinePrimaryButton : null,
            ]}
            onPress={handleConnect}
            disabled={isBusy}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color={settings.connectedEmail ? colors.primary : '#fff'} />
            ) : (
              <Text
                style={[
                  styles.primaryButtonText,
                  settings.connectedEmail ? { color: colors.primary } : null,
                ]}
              >
                {settings.connectedEmail ? 'Googleドライブを再認証・再確認' : 'Googleドライブと連携する'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.rowButton, styles.secondaryButton]}
              onPress={handleManualUpload}
              disabled={isBusy}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={colors.text} />
              <Text style={styles.secondaryButtonText}>今すぐ送信</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rowButton, styles.secondaryButton]}
              onPress={handleManualCheck}
              disabled={isBusy}
            >
              <Ionicons name="cloud-download-outline" size={16} color={colors.text} />
              <Text style={styles.secondaryButtonText}>AI提案を確認</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.textLinkButton}
            onPress={handleLocalImport}
            disabled={isBusy}
          >
            <Ionicons name="document-attach-outline" size={15} color={colors.textMuted} />
            <Text style={styles.textLinkLabel}>端末やDriveからJSONファイルを直接選択して読み込む</Text>
          </TouchableOpacity>
        </View>

        {/* ── 自動同期・反映モード設定 ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>同期動作設定</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI双方向同期を有効化</Text>
              <Text style={styles.settingDesc}>Googleドライブ経由の記録共有とAI提案受信を使用します</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(v) => { void saveDriveSyncSettings({ enabled: v }); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>記録の随時自動アップロード</Text>
              <Text style={styles.settingDesc}>保存10秒後・バックグラウンド移行時に自動更新</Text>
            </View>
            <Switch
              value={settings.autoUpload}
              onValueChange={(v) => { void saveDriveSyncSettings({ autoUpload: v }); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI提案の随時自動読み込み</Text>
              <Text style={styles.settingDesc}>起動・画面復帰・関連画面表示・5分ごとに確認</Text>
            </View>
            <Switch
              value={settings.autoDownload}
              onValueChange={(v) => { void saveDriveSyncSettings({ autoDownload: v }); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI向けMarkdownレポート出力</Text>
              <Text style={styles.settingDesc}>JSONに加えて {DRIVE_FILES.SUMMARY_MD} を出力</Text>
            </View>
            <Switch
              value={settings.includeMarkdownSummary}
              onValueChange={(v) => { void saveDriveSyncSettings({ includeMarkdownSummary: v }); }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <View style={styles.subSection}>
            <Text style={styles.settingLabel}>AI提案の反映方法</Text>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  settings.applyMode === 'confirm' && styles.segmentBtnActive,
                ]}
                onPress={() => saveDriveSyncSettings({ applyMode: 'confirm' })}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    settings.applyMode === 'confirm' && styles.segmentBtnTextActive,
                  ]}
                >
                  確認ポップアップ後に反映
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  settings.applyMode === 'auto' && styles.segmentBtnActive,
                ]}
                onPress={() => saveDriveSyncSettings({ applyMode: 'auto' })}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    settings.applyMode === 'auto' && styles.segmentBtnTextActive,
                  ]}
                >
                  自動で即時反映
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.subSection}>
            <Text style={styles.settingLabel}>Googleドライブ同期フォルダ名</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={folderInput}
                onChangeText={setFolderInput}
                placeholder="TreNote_AI_Sync"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity style={styles.saveSmallBtn} onPress={handleSaveFolderName}>
                <Text style={styles.saveSmallBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── 最新 AI トレーナーアドバイス ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#34d399" />
            <Text style={styles.cardTitle}>AIトレーナーからのアドバイス</Text>
          </View>
          {advices.length === 0 ? (
            <Text style={styles.helperText}>
              まだAIトレーナーからのアドバイスはありません。Googleドライブの「{DRIVE_FILES.PROPOSALS_JSON}」からアドバイスを読み込むとここに表示されます。
            </Text>
          ) : (
            <View style={styles.adviceList}>
              {advices.slice(0, 5).map((adv) => (
                <View key={adv.id} style={styles.adviceItem}>
                  <View style={styles.adviceTopRow}>
                    <Text style={styles.adviceTitle}>{adv.title || 'アドバイス'}</Text>
                    <Text style={styles.metaText}>
                      {adv.date || formatDisplayDateTime(adv.receivedAt)}
                    </Text>
                  </View>
                  {adv.focusAreas && adv.focusAreas.length > 0 && (
                    <View style={styles.chipRow}>
                      {adv.focusAreas.map((area, idx) => (
                        <View key={`${adv.id}_${idx}`} style={styles.chip}>
                          <Text style={styles.chipText}>{area}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={styles.adviceMessage}>{adv.message}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── AIエージェント連携仕様・ガイド ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="code-slash-outline" size={20} color="#a78bfa" />
            <Text style={styles.cardTitle}>AIエージェント用ファイル構成</Text>
          </View>
          <Text style={styles.helperText}>
            外部のAIエージェント（Claude / Gemini / 自作スクリプト等）には同期フォルダ内の下記ファイルを共有してください。
          </Text>
          <View style={styles.fileSpecList}>
            <Text style={styles.fileSpecItem}>• {DRIVE_FILES.SUMMARY_MD}（記録サマリー）</Text>
            <Text style={styles.fileSpecItem}>• {DRIVE_FILES.RECORDS_JSON}（詳細JSON）</Text>
            <Text style={styles.fileSpecItem}>• {DRIVE_FILES.PROPOSALS_JSON}（提案書込用）</Text>
            <Text style={styles.fileSpecItem}>• {DRIVE_FILES.GUIDE_MD}（AI用仕様書）</Text>
          </View>
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.rowButton, styles.secondaryButton]}
              onPress={() => setShowGuideModal(true)}
            >
              <Text style={styles.secondaryButtonText}>仕様を見る</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rowButton, styles.secondaryButton]}
              onPress={handleCopyGuide}
            >
              <Ionicons name="copy-outline" size={16} color={colors.text} />
              <Text style={styles.secondaryButtonText}>ガイドをコピー</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 適用履歴 ── */}
        {appliedHistory.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>AI提案の適用履歴</Text>
            <View style={styles.historyList}>
              {appliedHistory.slice(0, 8).map((h) => (
                <View key={h.proposalId} style={styles.historyItem}>
                  <Text style={styles.historySummary}>{h.summary}</Text>
                  <Text style={styles.metaText}>
                    {formatDisplayDateTime(h.appliedAt)} • ID: {h.proposalId}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* AI_AGENT_GUIDE プレビューモーダル */}
      <Modal
        visible={showGuideModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGuideModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.cardTitle}>AI_AGENT_GUIDE.md</Text>
              <TouchableOpacity
                onPress={() => setShowGuideModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalGuideText}>{buildAgentGuideMarkdown()}</Text>
            </ScrollView>
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.rowButton, styles.secondaryButton]}
                onPress={() => setShowGuideModal(false)}
              >
                <Text style={styles.secondaryButtonText}>閉じる</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rowButton, styles.primaryButton]}
                onPress={handleCopyGuide}
              >
                <Text style={styles.primaryButtonText}>全文コピー</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
      paddingTop: 52,
      paddingBottom: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
    },
    content: {
      padding: 16,
      gap: 16,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    warningCard: {
      borderColor: 'rgba(245, 158, 11, 0.5)',
      backgroundColor: 'rgba(245, 158, 11, 0.08)',
    },
    proposalCard: {
      borderColor: 'rgba(56, 189, 248, 0.5)',
      backgroundColor: 'rgba(56, 189, 248, 0.08)',
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    helperText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    metaText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    statusList: {
      gap: 8,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusLabel: {
      color: colors.textMuted,
      fontSize: 13,
    },
    statusValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(79, 172, 254, 0.1)',
      borderRadius: 8,
      padding: 10,
    },
    statusBannerText: {
      color: colors.text,
      fontSize: 12,
      flex: 1,
      lineHeight: 17,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      backgroundColor: 'rgba(248, 113, 113, 0.12)',
      borderRadius: 8,
      padding: 10,
    },
    errorBannerText: {
      color: '#f87171',
      fontSize: 12,
      flex: 1,
      lineHeight: 17,
    },
    buttonColumn: {
      gap: 8,
    },
    rowButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    rowButton: {
      flex: 1,
    },
    primaryButton: {
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    outlinePrimaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    secondaryButton: {
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    textLinkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 6,
    },
    textLinkLabel: {
      color: colors.textMuted,
      fontSize: 12,
      textDecorationLine: 'underline',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 4,
    },
    settingInfo: {
      flex: 1,
      gap: 2,
    },
    settingLabel: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    settingDesc: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
    },
    subSection: {
      gap: 8,
      paddingTop: 4,
    },
    segmentedRow: {
      flexDirection: 'row',
      gap: 8,
    },
    segmentBtn: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    segmentBtnActive: {
      borderColor: colors.primary,
      backgroundColor: 'rgba(79, 172, 254, 0.16)',
    },
    segmentBtnText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    segmentBtnTextActive: {
      color: colors.primary,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    textInput: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
      paddingHorizontal: 12,
      fontSize: 14,
    },
    saveSmallBtn: {
      minHeight: 44,
      minWidth: 64,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    saveSmallBtnText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '700',
    },
    proposalSummaryText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    advicePreviewBox: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    advicePreviewTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    advicePreviewBody: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    adviceList: {
      gap: 10,
    },
    adviceItem: {
      backgroundColor: colors.background,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 6,
    },
    adviceTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    adviceTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      backgroundColor: 'rgba(52, 211, 153, 0.14)',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    chipText: {
      color: '#34d399',
      fontSize: 11,
      fontWeight: '600',
    },
    adviceMessage: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
    fileSpecList: {
      gap: 4,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fileSpecItem: {
      color: colors.text,
      fontSize: 12,
      fontFamily: 'monospace',
    },
    historyList: {
      gap: 8,
    },
    historyItem: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
      gap: 2,
    },
    historySummary: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      maxHeight: '85%',
      gap: 12,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalScroll: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalGuideText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
    },
  });
