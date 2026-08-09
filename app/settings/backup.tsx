import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { getDB, closeDB } from '../../src/db/database';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';

export default function BackupSettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore(state => state.settings);

  const isPremium = settings.isPremium;
  const isEarly = settings.isEarlyAdopter;
  const isPaidPremium = isPremium && !isEarly;

  const handleExportBackup = async () => {
    if (!isPaidPremium) {
      alertPremiumOnly();
      return;
    }
    try {
      const conn = getDB();
      await conn.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');

      const dbDir = FileSystem.documentDirectory + 'SQLite/';
      const dbUri = dbDir + 'gymtracker.db';

      const fileInfo = await FileSystem.getInfoAsync(dbUri);
      if (!fileInfo.exists) {
        Alert.alert(t('ui.common.error') || 'エラー', 'データベースファイルが見つかりません。');
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

      const backupUri = FileSystem.cacheDirectory + `trenote_backup_${dateStr}.db`;
      await FileSystem.copyAsync({
        from: dbUri,
        to: backupUri
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupUri, {
          mimeType: 'application/octet-stream',
          dialogTitle: t('ui.developer_menu.backup_title') || 'バックアップデータの保存',
          UTI: 'public.database'
        });
      } else {
        Alert.alert(t('ui.common.error') || 'エラー', 'この端末では共有機能が利用できません。');
      }
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert(t('ui.common.error') || 'エラー', 'バックアップの作成に失敗しました。');
    }
  };

  const handleImportBackup = async () => {
    if (!isPaidPremium) {
      alertPremiumOnly();
      return;
    }

    Alert.alert(
      t('ui.developer_menu.restore_alert_title') || 'データの復元',
      t('ui.developer_menu.restore_alert_message') || '選択したバックアップファイルで現在のデータを上書きします。この操作は取り消せません。続行しますか？',
      [
        { text: t('ui.common.cancel') || 'キャンセル', style: 'cancel' },
        {
          text: t('ui.developer_menu.restore_alert_confirm') || '復元を実行',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
              });

              if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
              }

              const selectedFile = result.assets[0];
              const sourceUri = selectedFile.uri;

              const fileInfo = await FileSystem.getInfoAsync(sourceUri);
              if (!fileInfo.exists || fileInfo.size === 0) {
                throw new Error(t('ui.profile.restore_empty_file_error') || 'ファイルが空であるか壊れています。');
              }

              try {
                await closeDB();
              } catch (closeErr) {
                console.warn('Failed to close DB before restore:', closeErr);
              }

              await new Promise((resolve) => setTimeout(resolve, 500));

              const dbDir = FileSystem.documentDirectory + 'SQLite/';
              const dbUri = dbDir + 'gymtracker.db';
              const walUri = dbUri + '-wal';
              const shmUri = dbUri + '-shm';
              const journalUri = dbUri + '-journal';
              
              const dirInfo = await FileSystem.getInfoAsync(dbDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
              }

              try {
                const dbInfo = await FileSystem.getInfoAsync(dbUri);
                if (dbInfo.exists) await FileSystem.deleteAsync(dbUri);
                const journalInfo = await FileSystem.getInfoAsync(journalUri);
                if (journalInfo.exists) await FileSystem.deleteAsync(journalUri);
                const walInfo = await FileSystem.getInfoAsync(walUri);
                if (walInfo.exists) await FileSystem.deleteAsync(walUri);
                const shmInfo = await FileSystem.getInfoAsync(shmUri);
                if (shmInfo.exists) await FileSystem.deleteAsync(shmUri);
              } catch (delErr) {
                console.warn('Failed to delete old DB files:', delErr);
              }

              await FileSystem.copyAsync({
                from: sourceUri,
                to: dbUri
              });

              Alert.alert(
                t('ui.developer_menu.restore_success_title') || '復元完了',
                t('ui.developer_menu.restore_success_message') || 'データの復元が完了しました。アプリを再起動します。',
                [
                  {
                    text: 'OK',
                    onPress: async () => {
                      try {
                        await Updates.reloadAsync();
                      } catch (reloadErr) {
                        router.replace('/(tabs)');
                      }
                    }
                  }
                ]
              );

            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert(
                t('ui.developer_menu.restore_error_title') || '復元エラー',
                t('ui.developer_menu.restore_error_message') || '復元中にエラーが発生しました。'
              );
            }
          }
        }
      ]
    );
  };

  const alertPremiumOnly = () => {
    Alert.alert(
      t('ui.profile.backup_premium_only_title') || 'PRO機能',
      t('ui.profile.backup_premium_only_desc') || 'バックアップ・復元機能は有料プレミアムプラン限定機能です。',
      [
        { text: t('ui.common.cancel') || 'キャンセル', style: 'cancel' },
        { 
          text: t('ui.profile.upgrade_btn') || 'アップグレード', 
          onPress: () => router.push('/settings/account')
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ui.profile.section_backup') || 'バックアップ・復元'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!isPaidPremium && (
          <View style={styles.proNoticeBanner}>
            <Ionicons name="shield-checkmark" size={24} color="#4facfe" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.proNoticeTitle}>プレミアム限定機能</Text>
              <Text style={styles.proNoticeDesc}>データのバックアップと復元はプレミアム会員専用のセキュリティ機能です。</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cloud-upload-outline" size={28} color={Theme.colors.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t('ui.profile.backup_modal_title') || 'SQLiteデータベースバックアップ'}</Text>
              <Text style={styles.cardDesc}>{t('ui.profile.backup_modal_desc') || '全てのトレーニング履歴、ライフログ、カスタム種目設定をバックアップファイル(.db)として書き出します。'}</Text>
            </View>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="information-circle-outline" size={18} color="orange" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.warningText}>
              {t('ui.profile.backup_modal_warning') || '復元を行うと現在の端末の全データが上書きされます。あらかじめバックアップを作成しておくことを推奨します。'}
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.exportBtn]} 
              onPress={handleExportBackup}
            >
              <Ionicons name="share-outline" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.exportBtnText}>{t('ui.profile.backup_export_btn') || 'バックアップを出力'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.importBtn]} 
              onPress={handleImportBackup}
            >
              <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.importBtnText}>{t('ui.profile.backup_import_btn') || 'バックアップから復元'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Theme.spacing.md, 
    paddingTop: 54, 
    paddingBottom: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Theme.colors.text },
  content: { padding: Theme.spacing.md, paddingBottom: 60 },
  proNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    borderWidth: 1,
    borderColor: '#4facfe',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  proNoticeTitle: { fontSize: 15, fontWeight: 'bold', color: '#4facfe', marginBottom: 2 },
  proNoticeDesc: { fontSize: 12, color: Theme.colors.textMuted },
  card: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Theme.spacing.md },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: Theme.colors.textMuted, lineHeight: 18 },
  warningBox: {
    backgroundColor: 'rgba(255, 165, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
  },
  warningText: { color: Theme.colors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
  buttonGroup: { gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: Theme.borderRadius.md },
  exportBtn: { backgroundColor: Theme.colors.primary },
  exportBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  importBtn: { backgroundColor: '#ff4d4f' },
  importBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
