import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal, Platform, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { pickAndImportCSV } from '../src/utils/csvImporter';
import { importWorkoutFromSelectedFile, importWorkoutFromMarkdownText } from '../src/services/workoutImportService';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';
import { saveSetting, getDB, closeDB, initDB, getSettings } from '../src/db/database';
import { getSyncDiagnosticsLogs } from '../src/services/lifelogSyncService';
import { showReviewDialog } from '../src/services/reviewService';
import { saveCrashLog, readCrashLog } from '../src/services/crashReporterService';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useOTAUpdateStore } from '../src/store/otaUpdateStore';
import * as Clipboard from 'expo-clipboard';
import { getAIDebugLogs, clearAIDebugLogs } from '../src/utils/debugLogStore';
import { useRewardedInterstitialAd } from 'react-native-google-mobile-ads';
import { AD_CONFIG } from '../src/config/adConfig';

export default function DeveloperMenuScreen() {
  const isProduction = process.env.APP_ENV === 'production';
  if (isProduction && !__DEV__) {
    return null; // Render absolutely nothing in production builds to satisfy store policy
  }

  const { t } = useTranslation();
  const enableAiDebugContext = useSettingsStore(state => state.settings.enableAiDebugContext);
  const setEnableAiDebugContext = useSettingsStore(state => state.setEnableAiDebugContext);

  const [isChecking, setIsChecking] = useState(false);
  const [lastAckId, setLastAckId] = useState<string>('Loading...');
  const [channelOverride, setChannelOverride] = useState<string>('Loading...');

  // Ad testing hooks and states
  const [loadingAd, setLoadingAd] = useState(false);
  const shouldShowImmediateAd = useRef(false);
  const adUnitId = AD_CONFIG.getRewardedInterstitialAdUnitId();
  const { isLoaded, load, show, error } = useRewardedInterstitialAd(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  useEffect(() => {
    if (shouldShowImmediateAd.current && isLoaded) {
      shouldShowImmediateAd.current = false;
      setLoadingAd(false);
      show();
    }
  }, [isLoaded, show]);

  useEffect(() => {
    if (shouldShowImmediateAd.current && error) {
      shouldShowImmediateAd.current = false;
      setLoadingAd(false);
      Alert.alert('広告ロードエラー', error.message || String(error));
    }
  }, [error]);

  const handleResetAdSkipCount = async () => {
    try {
      await saveSetting('ad_skip_count', '0');
      Alert.alert('リセット完了', '広告スキップ残数を0に設定しました。次回ワークアウト完了時に広告が表示されます。');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    }
  };

  const handleShowAdImmediately = () => {
    setLoadingAd(true);
    shouldShowImmediateAd.current = true;
    load();
  };

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        const settings = await getSettings();
        setLastAckId(settings['last_acknowledged_update_id'] || 'None');
        setChannelOverride(settings['ota_channel_override'] || 'production');
      } catch (e) {
        console.warn('Failed to load developer menu settings:', e);
        setLastAckId('Error');
        setChannelOverride('Error');
      }
    };
    loadSettingsData();
  }, []);

  const handleSwitchChannelAndCheckUpdate = async (targetChannel: string) => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      if (__DEV__) {
        Alert.alert('開発モード', '開発モードでは本番用のOTAアップデート確認はスキップされます。');
        setIsChecking(false);
        return;
      }
      if (!Updates.isEnabled) {
         Alert.alert('アップデート未対応', 'このビルドでは expo-updates が無効化されています。');
         setIsChecking(false);
         return;
      }

      // 1. Set the request headers override
      await Updates.setUpdateRequestHeadersOverride({ 'expo-channel-name': targetChannel });
      
      // 2. Save settings to DB
      await saveSetting('ota_channel_override', targetChannel);
      setChannelOverride(targetChannel);

      // 3. Check for update
      const updateCheckResult = await Updates.checkForUpdateAsync();
      
      if (!updateCheckResult.isAvailable) {
        Alert.alert(
          'アップデートはありません',
          `チャンネル「${targetChannel}」には、適用可能な新しいアップデートはありません。`
        );
        setIsChecking(false);
        return;
      }

      // 4. Defensive check: runtimeVersion check
      const updateManifest = updateCheckResult.manifest;
      const manifestRuntime = typeof updateManifest === 'object' && updateManifest !== null
        ? (updateManifest as any).runtimeVersion || (updateManifest as any).extra?.expoClient?.runtimeVersion
        : undefined;
      const currentRuntime = Updates.runtimeVersion;

      if (manifestRuntime && currentRuntime && manifestRuntime !== currentRuntime) {
        Alert.alert(
          '互換性エラー (ランタイム不一致)',
          `適用しようとしたアップデートのランタイムバージョン(${manifestRuntime})が、現在のネイティブアプリのランタイムバージョン(${currentRuntime})と一致しないため、クラッシュ防止のため適用を拒否しました。`
        );
        setIsChecking(false);
        return;
      }

      // 5. Ask user before downloading & applying
      Alert.alert(
        'アップデートが見つかりました',
        `チャンネル「${targetChannel}」のアップデートをダウンロードして適用しますか？\n(適用後、アプリは再起動されます)`,
        [
          { text: 'キャンセル', style: 'cancel', onPress: () => setIsChecking(false) },
          {
            text: '適用する',
            style: 'default',
            onPress: async () => {
              try {
                // 6. Fetch update
                await Updates.fetchUpdateAsync();
                
                try {
                  // 7. Reload
                  await Updates.reloadAsync();
                } catch (reloadErr: any) {
                  console.warn('Reload failed, asking user to manual restart:', reloadErr);
                  Alert.alert(
                    'ダウンロード完了',
                    'アップデートのダウンロードが完了しました。変更を適用するため、アプリを一度終了（タスクキル）して手動で再起動してください。',
                    [{ text: 'OK', onPress: () => setIsChecking(false) }]
                  );
                }
              } catch (fetchErr: any) {
                console.error('Fetch update failed:', fetchErr);
                Alert.alert('エラー', `アップデートの取得に失敗しました。\n${fetchErr?.message || String(fetchErr)}`);
                setIsChecking(false);
              }
            }
          }
        ]
      );
    } catch (err: any) {
      console.error('Channel switch / check update error:', err);
      Alert.alert('エラー', `切替およびアップデート確認中にエラーが発生しました。\n${err?.message || String(err)}`);
      setIsChecking(false);
    }
  };

  const handleShowOtaPopup = () => {
    useOTAUpdateStore.getState().showModal();
  };

  const handleSimulateOtaLaunch = async () => {
    try {
      await saveSetting('simulate_ota_popup', '1');
      Alert.alert('シミュレーション設定', '次回起動時にOTAアップデート適用後の挙動（ポップアップ表示）を擬似的に実行します。アプリを再起動するかリロードしてください。');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    }
  };

  const handleResetOtaAck = async () => {
    try {
      await saveSetting('last_acknowledged_update_id', '');
      setLastAckId('None');
      Alert.alert('リセット完了', '検証済みOTA IDを初期化しました。');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    }
  };

  const handleBackup = async () => {
    try {
      // Flush WAL to the main gymtracker.db file before copying
      const conn = getDB();
      await conn.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');

      const dbDir = FileSystem.documentDirectory + 'SQLite/';
      const dbUri = dbDir + 'gymtracker.db';

      // Check if DB file exists
      const fileInfo = await FileSystem.getInfoAsync(dbUri);
      if (!fileInfo.exists) {
        Alert.alert(t('ui.common.error'), 'Database file not found.');
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const dateStr = `${year}${month}${date}_${hours}${minutes}${seconds}`;

      // Copy to temporary cache location for sharing
      const backupUri = FileSystem.cacheDirectory + `trenote_backup_${dateStr}.db`;
      await FileSystem.copyAsync({
        from: dbUri,
        to: backupUri
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupUri, {
          mimeType: 'application/octet-stream',
          dialogTitle: t('ui.developer_menu.backup_title'),
          UTI: 'public.database'
        });
      } else {
        Alert.alert(t('ui.common.error'), 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert(t('ui.common.error'), 'Failed to create backup.');
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      t('ui.developer_menu.restore_alert_title'),
      t('ui.developer_menu.restore_alert_message'),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        {
          text: t('ui.developer_menu.restore_alert_confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Pick a file
              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
              });

              if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
              }

              const selectedFile = result.assets[0];
              const sourceUri = selectedFile.uri;

              // Close database connection
              try {
                await closeDB();
              } catch (closeErr) {
                console.warn('Failed to close DB before restore:', closeErr);
              }

              // OSのファイルロックが解放されるのを確実に待つためにディレイを挿入
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Ensure the SQLite directory exists
              const dbDir = FileSystem.documentDirectory + 'SQLite/';
              const dbUri = dbDir + 'gymtracker.db';
              const walUri = dbUri + '-wal';
              const shmUri = dbUri + '-shm';
              const journalUri = dbUri + '-journal';
              
              const dirInfo = await FileSystem.getInfoAsync(dbDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
              }

              // Delete old DB file to prevent lock/overwrite conflicts
              try {
                const dbInfo = await FileSystem.getInfoAsync(dbUri);
                if (dbInfo.exists) {
                  await FileSystem.deleteAsync(dbUri);
                }
              } catch (dbErr) {
                console.warn('Failed to delete old DB file:', dbErr);
              }

              // Delete old journal file if exists
              try {
                const journalInfo = await FileSystem.getInfoAsync(journalUri);
                if (journalInfo.exists) {
                  await FileSystem.deleteAsync(journalUri);
                }
              } catch (journalErr) {
                console.warn('Failed to delete journal file:', journalErr);
              }

              try {
                const walInfo = await FileSystem.getInfoAsync(walUri);
                if (walInfo.exists) {
                  await FileSystem.deleteAsync(walUri);
                }
              } catch (walErr) {
                console.warn('Failed to delete WAL file:', walErr);
              }

              try {
                const shmInfo = await FileSystem.getInfoAsync(shmUri);
                if (shmInfo.exists) {
                  await FileSystem.deleteAsync(shmUri);
                }
              } catch (shmErr) {
                console.warn('Failed to delete SHM file:', shmErr);
              }

              // 2. Overwrite gymtracker.db with the selected file
              await FileSystem.copyAsync({
                from: sourceUri,
                to: dbUri
              });

              // 3. Inform user and reload the app
              Alert.alert(
                t('ui.developer_menu.restore_success_title'),
                t('ui.developer_menu.restore_success_message'),
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      try {
                        await Updates.reloadAsync();
                      } catch (reloadErr) {
                        // Fallback if Updates.reloadAsync fails (e.g. in Expo Go)
                        Alert.alert('Info', 'Please restart the app manually to apply changes.');
                      }
                    }
                  }
                ]
              );

            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert(
                t('ui.developer_menu.restore_error_title'),
                t('ui.developer_menu.restore_error_message') + '\n\n' + (error instanceof Error ? error.message : String(error))
              );
            }
          }
        }
      ]
    );
  };

  const handleCheckUpdate = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      if (__DEV__) {
        Alert.alert(
          t('ui.developer_menu.update_up_to_date_title'),
          t('ui.developer_menu.update_up_to_date_msg') + ' (Development Mode)'
        );
        setIsChecking(false);
        return;
      }

      if (!Updates.isEnabled) {
        Alert.alert(
          'アップデート未対応',
          `このビルドでは expo-updates が無効化されています。\nChannel: ${Updates.channel ?? 'N/A'}\nネイティブビルドの設定を確認してください。`
        );
        setIsChecking(false);
        return;
      }



      const updateResult = await Updates.checkForUpdateAsync();
      if (updateResult.isAvailable) {
        Alert.alert(
          t('ui.developer_menu.update_available_title'),
          t('ui.developer_menu.update_available_msg'),
          [
            { text: t('ui.common.cancel'), style: 'cancel', onPress: () => setIsChecking(false) },
            {
              text: t('ui.developer_menu.restore_alert_confirm'),
              style: 'default',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  try {
                    await Updates.reloadAsync();
                  } catch (reloadErr) {
                    console.warn('Reload failed, asking user to manual restart:', reloadErr);
                    Alert.alert(
                      t('ui.developer_menu.update_available_title'),
                      'アップデートのダウンロードが完了しました。変更を適用するため、アプリを一度終了（タスクキル）して手動で再起動してください。',
                      [{ text: 'OK', onPress: () => setIsChecking(false) }]
                    );
                  }
                } catch (fetchErr) {
                  console.error('Fetch update failed:', fetchErr);
                  const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
                  Alert.alert(t('ui.common.error'), `Failed to download update:\n${msg}`);
                  setIsChecking(false);
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          t('ui.developer_menu.update_up_to_date_title'),
          t('ui.developer_menu.update_up_to_date_msg')
        );
        setIsChecking(false);
      }
    } catch (error) {
      console.warn('Check update error:', error);
      Alert.alert(
        t('ui.developer_menu.update_check_error_title'),
        t('ui.developer_menu.update_check_error_msg') + `\n\nDetail: ${error instanceof Error ? error.message : String(error)}\nChannel: ${Updates.channel ?? 'N/A'}`
      );
      setIsChecking(false);
    }
  };

  const handleChangeTier = async (tier: 'basic' | 'early' | 'premium' | 'expired_limited') => {
    try {
      if (tier === 'basic') {
        await saveSetting('is_early_adopter', 'false');
        await saveSetting('premium_until', '');
        await saveSetting('ai_tokens_balance', '5');
        useSettingsStore.getState().setIsEarlyAdopter(false);
        useSettingsStore.getState().setPremiumUntil('');
        useSettingsStore.getState().setAITokensBalance(5);
        Alert.alert('プラン変更', 'ベーシックプランに変更しました。（AI Coachトークンを5に設定しました）');
      } else if (tier === 'early') {
        await saveSetting('is_early_adopter', 'true');
        await saveSetting('premium_until', '');
        await saveSetting('ai_tokens_balance', '20');
        useSettingsStore.getState().setIsEarlyAdopter(true);
        useSettingsStore.getState().setPremiumUntil('');
        useSettingsStore.getState().setAITokensBalance(20);
        Alert.alert('プラン変更', 'アーリーアダプターに変更しました。（AI Coachトークンを20に設定しました）');
      } else if (tier === 'premium') {
        await saveSetting('is_early_adopter', 'false');
        await saveSetting('premium_until', 'perpetual');
        await saveSetting('ai_tokens_balance', '20');
        useSettingsStore.getState().setIsEarlyAdopter(false);
        useSettingsStore.getState().setPremiumUntil('perpetual');
        useSettingsStore.getState().setAITokensBalance(20);
        Alert.alert('プラン変更', 'プレミアムプランに変更しました。（AI Coachトークンを20に設定しました）');
      } else if (tier === 'expired_limited') {
        const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
        await saveSetting('is_early_adopter', 'false');
        await saveSetting('premium_until', pastDate);
        await saveSetting('ai_tokens_balance', '20');
        useSettingsStore.getState().setIsEarlyAdopter(false);
        useSettingsStore.getState().setPremiumUntil(pastDate);
        useSettingsStore.getState().setAITokensBalance(20);
        Alert.alert('期限切れシミュレーション', '過去の期限を持つお試しプレミアムを設定しました。設定画面に移動するか、アプリを再起動すると期限切れ処理が実行されます。');
      }
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    }
  };

  const [isImportingCSV, setIsImportingCSV] = useState(false);
  const [isImportingMD, setIsImportingMD] = useState(false);
  const [showMDTextModal, setShowMDTextModal] = useState(false);
  const [mdInputText, setMdInputText] = useState('');

  const handleImportMDFile = async () => {
    if (isImportingMD) return;
    setIsImportingMD(true);
    try {
      const result = await importWorkoutFromSelectedFile();
      if (result.success) {
        Alert.alert(
          'MDインポート成功',
          `Markdown ワークアウト記録を取り込みました！\n\n・タイトル: ${result.title}\n・日付: ${result.date}\n・種目数: ${result.exerciseCount}\n・総セット数: ${result.setCount}`
        );
      } else if (result.error !== 'ファイル選択がキャンセルされました。') {
        Alert.alert('インポート失敗', result.error || 'エラーが発生しました。');
      }
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    } finally {
      setIsImportingMD(false);
    }
  };

  const handleImportMDTextSubmit = async () => {
    if (!mdInputText.trim()) {
      Alert.alert('入力エラー', 'Markdown テキストを入力してください。');
      return;
    }
    setIsImportingMD(true);
    try {
      const result = await importWorkoutFromMarkdownText(mdInputText);
      if (result.success) {
        setShowMDTextModal(false);
        setMdInputText('');
        Alert.alert(
          'MDインポート成功',
          `Markdown ワークアウト記録を取り込みました！\n\n・タイトル: ${result.title}\n・日付: ${result.date}\n・種目数: ${result.exerciseCount}\n・総セット数: ${result.setCount}`
        );
      } else {
        Alert.alert('インポート失敗', result.error || 'パースに失敗しました。');
      }
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    } finally {
      setIsImportingMD(false);
    }
  };

  const handleImportCSV = async () => {
    if (isImportingCSV) return;
    setIsImportingCSV(true);
    try {
      const result = await pickAndImportCSV();
      if (result.success) {
        Alert.alert(
          'インポート成功',
          `他社CSVデータの移行が完了しました！\n\n・ワークアウト数: ${result.workoutsCount}\n・総セット数: ${result.setsCount}\n・新規追加種目: ${result.exercisesCreated}`
        );
      } else {
        if (result.error === 'CANCELED') {
          setIsImportingCSV(false);
          return;
        }
        Alert.alert(
          'インポート失敗',
          `エラーが発生しました。\n詳細: ${result.error}`
        );
      }
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    } finally {
      setIsImportingCSV(false);
    }
  };

  const handleResetReviewFlag = async () => {
    try {
      await saveSetting('has_shown_review_prompt', '0');
      Alert.alert('リセット完了', 'レビュー促進ポップアップの表示フラグをリセットしました（未表示状態にしました）。');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    }
  };

  const handleResetCrashConsent = async () => {
    try {
      await saveSetting('crash_report_consent', 'unset');
      useSettingsStore.getState().setCrashConsent('unset');
      Alert.alert('リセット完了', 'クラッシュレポート同意ステータスを未設定（unset）に戻しました。');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    }
  };

  const handleGenerateDummyCrashLog = async () => {
    try {
      await saveCrashLog(new Error('擬似クラッシュテストエラー'), true);
      useWorkoutStore.getState().setHasUnsentCrashLog(true);
      Alert.alert('生成完了', 'ローカルストレージにダミーのクラッシュログを生成し、Zustandフラグを有効化しました。アプリ再起動時または次回ホーム表示時に確認ダイアログが表示されます。');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    }
  };

  const handleSimulateCrash = () => {
    Alert.alert(
      '擬似クラッシュの実行',
      '未キャッチエラーをスローしてアプリをクラッシュさせます。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: 'クラッシュさせる', 
          style: 'destructive',
          onPress: () => {
            throw new Error('デベロッパーメニューから手動実行された擬似クラッシュエラー');
          }
        }
      ]
    );
  };

  const handleCopyCrashLog = async () => {
    try {
      const log = await readCrashLog();
      if (!log) {
        Alert.alert('ログなし', '現在ローカルストレージに未送信のクラッシュログはありません。');
        return;
      }
      await Clipboard.setStringAsync(JSON.stringify(log, null, 2));
      Alert.alert('コピー完了', 'クラッシュログの内容をクリップボードにコピーしました。チャット画面に貼り付けてAIに送信してください。');
    } catch (e: any) {
      Alert.alert('エラー', e?.message || String(e));
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t('ui.developer_menu.title'),
          headerStyle: { backgroundColor: Theme.colors.background },
          headerTintColor: Theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="bug-outline" size={48} color={Theme.colors.primary} style={{ marginBottom: 12 }} />
          <Text style={styles.title}>{t('ui.developer_menu.title')}</Text>
          <Text style={styles.subtitle}>Developer-only database utilities & EAS Updates</Text>
        </View>

        {/* EAS Update Info Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="git-branch-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>{t('ui.developer_menu.update_info_title')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('ui.developer_menu.update_type_label')}</Text>
            <Text style={styles.infoValue}>
              {Updates.isEmbeddedLaunch 
                ? t('ui.developer_menu.update_type_embedded') 
                : t('ui.developer_menu.update_type_ota')}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('ui.developer_menu.update_id_label')}</Text>
            <Text style={[styles.infoValue, { fontSize: 11, fontFamily: 'monospace' }]} numberOfLines={1}>
              {Updates.updateId || 'Embedded / None'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Runtime Version</Text>
            <Text style={styles.infoValue}>{Updates.runtimeVersion || 'N/A'}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Last Acknowledged ID</Text>
            <Text style={[styles.infoValue, { fontSize: 11, fontFamily: 'monospace' }]} numberOfLines={1}>
              {lastAckId}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Channel</Text>
            <Text style={[styles.infoValue, { fontSize: 12, fontFamily: 'monospace' }]}>
              {Updates.channel || 'N/A'}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Updates Enabled</Text>
            <Text style={[styles.infoValue, { color: Updates.isEnabled ? '#4faf54' : '#ff4d4f' }]}>
              {Updates.isEnabled ? 'Yes ✅' : 'No ❌'}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.btnOutline, { marginTop: Theme.spacing.md }]} 
            onPress={handleCheckUpdate}
            disabled={isChecking}
          >
            <Ionicons name="refresh-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.btnOutlineText}>
              {isChecking ? t('ui.developer_menu.update_checking') : t('ui.developer_menu.update_check_btn')}
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 16 }}>
            <Text style={[styles.cardDesc, { marginBottom: 12, fontWeight: 'bold' }]}>OTAチャンネル切替 (Channel Surfing):</Text>
            <Text style={[styles.cardDesc, { fontSize: 13, marginBottom: 8 }]}>
              現在の適用設定: <Text style={{ color: Theme.colors.primary, fontWeight: 'bold' }}>{channelOverride}</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {['development', 'staging', 'production'].map((ch) => (
                <TouchableOpacity
                  key={ch}
                  style={[
                    styles.btnOutline,
                    { flex: 1, paddingVertical: 8 },
                    channelOverride === ch && { borderColor: Theme.colors.success, backgroundColor: 'rgba(76, 175, 80, 0.1)' }
                  ]}
                  onPress={() => handleSwitchChannelAndCheckUpdate(ch)}
                  disabled={isChecking}
                >
                  <Text style={[styles.btnOutlineText, channelOverride === ch && { color: Theme.colors.success }, { fontSize: 12 }]}>
                    {ch === 'development' ? 'Dev' : ch === 'staging' ? 'Staging' : 'Prod'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Synchronisation Diagnostics Logs Section */}
          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 16 }}>
            <Text style={[styles.cardDesc, { marginBottom: 8, fontWeight: 'bold' }]}>📋 同期診断ログ (Sync Diagnostics):</Text>
            <TouchableOpacity 
              style={[styles.btnOutline, { marginTop: 4 }]} 
              onPress={async () => {
                const logs = getSyncDiagnosticsLogs();
                if (logs.length === 0) {
                  Alert.alert('同期診断ログ', 'まだ同期ログが記録されていません。習慣画面でアイテム追加・タップ操作を行ってから再度お試しください。');
                } else {
                  const logText = logs.join('\n');
                  await Clipboard.setStringAsync(logText);
                  Alert.alert('同期診断ログ (クリップボードにコピーしました)', logText.slice(0, 800) + (logText.length > 800 ? '\n...' : ''));
                }
              }}
            >
              <Ionicons name="document-text-outline" size={18} color={Theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.btnOutlineText}>同期ログを表示 / コピー</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 16 }}>
            <Text style={[styles.cardDesc, { marginBottom: 12 }]}>OTAポップアップの検証・デバッグ：</Text>
            <View style={{ flexDirection: 'column', gap: 10 }}>
              <TouchableOpacity style={styles.btnOutline} onPress={handleShowOtaPopup}>
                <Ionicons name="eye-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.btnOutlineText}>ポップアップを手動表示</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={handleSimulateOtaLaunch}>
                  <Ionicons name="sparkles-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.btnOutlineText, { fontSize: 13 }]}>次回起動時シミュレート</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.btnOutline, { flex: 1, borderColor: '#ff4d4f', backgroundColor: 'rgba(255, 77, 79, 0.05)' }]} onPress={handleResetOtaAck}>
                  <Ionicons name="trash-outline" size={20} color="#ff4d4f" style={{ marginRight: 4 }} />
                  <Text style={[styles.btnOutlineText, { color: '#ff4d4f', fontSize: 13 }]}>検証済みIDリセット</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
         </View>

        {/* Account Tier Testing Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>プラン制限のテスト (アカウント種別変更)</Text>
          </View>
          <Text style={styles.cardDesc}>
            アプリのプランを手動で切り替えて、機能制限やUIの表示テストを行えます。
          </Text>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <TouchableOpacity 
              style={[styles.btnOutline, { borderColor: '#4faf54', backgroundColor: 'rgba(79, 175, 84, 0.05)' }]} 
              onPress={() => handleChangeTier('basic')}
            >
              <Ionicons name="close-circle-outline" size={20} color="#4faf54" style={{ marginRight: 8 }} />
              <Text style={[styles.btnOutlineText, { color: '#4faf54' }]}>ベーシックプランに設定 (制限あり)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnOutline, { borderColor: '#e6a23c', backgroundColor: 'rgba(230, 162, 60, 0.05)' }]} 
              onPress={() => handleChangeTier('early')}
            >
              <Ionicons name="gift-outline" size={20} color="#e6a23c" style={{ marginRight: 8 }} />
              <Text style={[styles.btnOutlineText, { color: '#e6a23c' }]}>アーリーアダプターに設定 (制限なし)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnOutline, { borderColor: '#e6c23c', backgroundColor: 'rgba(230, 194, 60, 0.05)' }]} 
              onPress={() => handleChangeTier('premium')}
            >
              <Ionicons name="ribbon-outline" size={20} color="#e6c23c" style={{ marginRight: 8 }} />
              <Text style={[styles.btnOutlineText, { color: '#e6c23c' }]}>プレミアムプランに設定 (制限なし)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnOutline, { borderColor: '#c084fc', backgroundColor: 'rgba(192, 132, 252, 0.05)' }]} 
              onPress={() => handleChangeTier('expired_limited')}
            >
              <Ionicons name="time-outline" size={20} color="#c084fc" style={{ marginRight: 8 }} />
              <Text style={[styles.btnOutlineText, { color: '#c084fc' }]}>お試しプレミアムの期限切れをシミュレート</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ads Testing Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="megaphone-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>広告表示のテスト (Ads Testing)</Text>
          </View>
          <Text style={styles.cardDesc}>
            ワークアウト完了時に表示されるリワードインタースティシャル広告のテストユーティリティです。
          </Text>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <TouchableOpacity 
              style={styles.btnOutline} 
              onPress={handleResetAdSkipCount}
            >
              <Ionicons name="refresh-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.btnOutlineText}>次回ワークアウト完了時に強制表示 (スキップ残数リセット)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnOutline, { borderColor: Theme.colors.success, backgroundColor: 'rgba(76, 175, 80, 0.05)' }]} 
              onPress={handleShowAdImmediately}
              disabled={loadingAd}
            >
              <Ionicons name="play-outline" size={20} color={Theme.colors.success} style={{ marginRight: 8 }} />
              <Text style={[styles.btnOutlineText, { color: Theme.colors.success }]}>
                {loadingAd ? '広告ロード中...' : 'その場でリワード広告を表示 (ロード＆再生)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CSV Import Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="swap-horizontal-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>他社CSVインポートテスト</Text>
          </View>
          <Text style={styles.cardDesc}>
            「筋トレMemo」などでエクスポートしたCSVファイルを読み込み、ワークアウト履歴を本アプリへ移行します（デバッグ・検証用）。
          </Text>
          <TouchableOpacity 
            style={styles.btnPrimary} 
            onPress={handleImportCSV}
            disabled={isImportingCSV}
          >
            <Ionicons name="document-text-outline" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.btnPrimaryText}>
              {isImportingCSV ? 'インポート中...' : 'CSVファイルを選択して移行'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Review Dialog Testing Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="star-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>レビュー促進ポップアップテスト</Text>
          </View>
          <Text style={styles.cardDesc}>
            完了ワークアウトが10回以上になった際に表示される「レビュー・フィードバック促進ポップアップ」の動作テストを行えます。
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={() => showReviewDialog(10)}>
              <Ionicons name="play-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.btnOutlineText}>ダイアログ起動</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { flex: 1, borderColor: '#ff4d4f', backgroundColor: 'rgba(255, 77, 79, 0.05)' }]} onPress={handleResetReviewFlag}>
              <Ionicons name="refresh-outline" size={20} color="#ff4d4f" style={{ marginRight: 4 }} />
              <Text style={[styles.btnOutlineText, { color: '#ff4d4f' }]}>フラグ初期化</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Crash Opt-in Testing Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bug-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>クラッシュレポート機能テスト</Text>
          </View>
          <Text style={styles.cardDesc}>
            アプリ起動時のクラッシュレポート自動送信同意機能（オプトイン）のデバッグテストを行えます。
          </Text>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <TouchableOpacity style={styles.btnOutline} onPress={handleGenerateDummyCrashLog}>
              <Ionicons name="document-text-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.btnOutlineText}>ダミークラッシュログ生成</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnOutline} onPress={handleCopyCrashLog}>
              <Ionicons name="copy-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.btnOutlineText}>クラッシュログをコピー</Text>
            </TouchableOpacity>
            
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={handleResetCrashConsent}>
                <Ionicons name="refresh-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.btnOutlineText}>同意状態リセット</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btnOutline, { flex: 1, borderColor: '#ff4d4f', backgroundColor: 'rgba(255, 77, 79, 0.05)' }]} onPress={handleSimulateCrash}>
                <Ionicons name="skull-outline" size={20} color="#ff4d4f" style={{ marginRight: 4 }} />
                <Text style={[styles.btnOutlineText, { color: '#ff4d4f' }]}>JSクラッシュ実行</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Maintenance: Markdown Workout Importer */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>🛠️ メンテナンス: MDワークアウト復元</Text>
          </View>
          <Text style={styles.cardDesc}>
            Obsidian等で保存されたワークアウト記録の Markdown (.md) ファイル、または MDテキストから SQLite DB へワークアウトを追加・復元します。
          </Text>
          <View style={{ flexDirection: 'column', gap: 10 }}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleImportMDFile} disabled={isImportingMD}>
              <Ionicons name="document-attach-outline" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.btnPrimaryText}>{isImportingMD ? '処理中...' : 'MDファイルを選択してインポート'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnOutline} onPress={() => setShowMDTextModal(true)}>
              <Ionicons name="create-outline" size={20} color={Theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.btnOutlineText}>MDテキストを貼り付けてインポート</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modal for MD Text Input */}
        <Modal
          visible={showMDTextModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowMDTextModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: Theme.colors.card, borderRadius: 12, padding: 20, maxHeight: '80%', borderWidth: 1, borderColor: Theme.colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: Theme.colors.text }}>MDテキストからの取り込み</Text>
                <TouchableOpacity onPress={() => setShowMDTextModal(false)}>
                  <Ionicons name="close" size={24} color={Theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: Theme.colors.textMuted, marginBottom: 10 }}>
                ワークアウト記録の Markdown 本言（Frontmatter、見出し、セットテーブル等）を下に貼り付けてください。
              </Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: 12,
                  height: 220,
                  textAlignVertical: 'top',
                  fontSize: 13,
                  fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                  borderWidth: 1,
                  borderColor: Theme.colors.border,
                  marginBottom: 16
                }}
                multiline={true}
                placeholder={`# 🏋️ ベンチプレスDay (2026-07-23)\n- **日付**: 2026-07-23 18:30\n\n### 1. [[ベンチプレス]]\n| Set | Stance | Weight | Reps | RPE | Time/Rest |\n|---|---|---|---|---|---|\n| 1 | Normal | 80 kg | 10 | @8 | 60s / rest 90s |`}
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={mdInputText}
                onChangeText={setMdInputText}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.btnOutline, { flex: 1 }]} onPress={() => setShowMDTextModal(false)}>
                  <Text style={styles.btnOutlineText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={handleImportMDTextSubmit} disabled={isImportingMD}>
                  <Text style={styles.btnPrimaryText}>{isImportingMD ? '処理中...' : 'インポート実行'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* AI Coach Debug Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="bug-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>AIコーチ 送信コンテキストデバッグ</Text>
          </View>
          <Text style={styles.cardDesc}>
            AI Coach 画面上に、実際にAIへ送信されたプロンプト（リアルタイム記録・過去履歴）のプレビュー表示エリアを出力します。
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>デバッグ可視化UIを表示</Text>
            <Switch
              value={enableAiDebugContext}
              onValueChange={(val) => setEnableAiDebugContext(val)}
              trackColor={{ false: '#333', true: Theme.colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Export Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-upload-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>{t('ui.developer_menu.backup_title')}</Text>
          </View>
          <Text style={styles.cardDesc}>{t('ui.developer_menu.backup_desc')}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={handleBackup}>
            <Ionicons name="share-outline" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.btnPrimaryText}>{t('ui.developer_menu.backup_btn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Import Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-download-outline" size={24} color="#ff4d4f" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>{t('ui.developer_menu.restore_title')}</Text>
          </View>
          <Text style={styles.cardDesc}>{t('ui.developer_menu.restore_desc')}</Text>
          <TouchableOpacity style={styles.btnDanger} onPress={handleRestore}>
            <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnDangerText}>{t('ui.developer_menu.restore_btn')}</Text>
          </TouchableOpacity>
        </View>

        {/* AI Debug Log Section (Staging / Dev Only) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics-outline" size={24} color="#38bdf8" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>🤖 AI通信バックデータログ (Staging Debug)</Text>
          </View>
          <Text style={styles.cardDesc}>
            AI解析（食事写真・テキスト・チャット）発生時のHTTP通信、Worker応答Raw JSON、エラーの直近ログを確認・コピーできます。
          </Text>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={async () => {
              const logs = getAIDebugLogs();
              if (logs.length === 0) {
                Alert.alert('AI通信ログ', 'まだ通信ログが記録されていません。食事解析やAIチャットを実行してください。');
                return;
              }
              const jsonStr = JSON.stringify(logs, null, 2);
              await Clipboard.setStringAsync(jsonStr);
              Alert.alert('ログコピー完了', `${logs.length}件の通信バックデータログをクリップボードにコピーしました。`);
            }}
          >
            <Ionicons name="copy-outline" size={20} color="#000" style={{ marginRight: 8 }} />
            <Text style={styles.btnPrimaryText}>📋 全通信バックデータログを全コピー</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnDanger, { marginTop: 10, backgroundColor: '#334155' }]}
            onPress={() => {
              clearAIDebugLogs();
              Alert.alert('クリア', 'AI通信ログをクリアしました。');
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <Text style={[styles.btnDangerText, { color: '#94a3b8' }]}>ログメモリをクリア</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.md,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    marginVertical: Theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  cardDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    lineHeight: 20,
    marginBottom: Theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    backgroundColor: 'rgba(79, 172, 254, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.sm,
  },
  btnOutlineText: {
    color: Theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  btnPrimary: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.sm,
  },
  btnPrimaryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDanger: {
    backgroundColor: '#ff4d4f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.sm,
  },
  btnDangerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
