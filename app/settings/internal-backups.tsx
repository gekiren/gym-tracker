import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useAppTheme } from '../../src/theme';
import { listInternalBackups, restoreFromInternalBackup, InternalBackupInfo } from '../../src/db/database';
import { markBackupRestoredForDriveSync } from '../../src/services/googleDriveSyncService';

const formatDateTime = (ms: number): string => {
  if (!ms) return '-';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const formatSize = (bytes: number): string => `${(bytes / 1024).toFixed(0)} KB`;

const shortDate = (s: string | null): string => (s ? s.slice(0, 10) : '-');

export default function InternalBackupsScreen({ onBack }: { onBack?: () => void } = {}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState<InternalBackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listInternalBackups());
    } catch (e) {
      console.warn('Failed to list internal backups:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = (item: InternalBackupInfo) => {
    Alert.alert(
      'このバックアップから復元',
      `${item.fileName}\n更新: ${formatDateTime(item.modifiedAt)}\n\n現在のデータはバックアップ(pre_restore)として退避した上で、上書きされます。続行しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '復元を実行',
          style: 'destructive',
          onPress: async () => {
            setRestoring(true);
            try {
              const result = await restoreFromInternalBackup(item.fileName);
              if (!result.success) {
                Alert.alert('復元エラー', result.error || '復元に失敗しました。');
                return;
              }
              await markBackupRestoredForDriveSync(item.fileName);
              Alert.alert('復元完了', 'データの復元が完了しました。アプリを再起動します。', [
                {
                  text: 'OK',
                  onPress: async () => {
                    try {
                      await Updates.reloadAsync();
                    } catch {
                      router.replace('/(tabs)');
                    }
                  },
                },
              ]);
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (onBack ? onBack() : router.back())} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>端末内の自動バックアップ</Text>
        <TouchableOpacity onPress={load} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="refresh" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.desc}>
          アプリが自動で保存した端末内のバックアップです。件数と最新日付を確認して、復元したいものを選んでください。
          「隔離」は破損・異常時に退避されたDBです。
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>バックアップが見つかりません。</Text>
        ) : (
          items.map((item) => (
            <View key={item.fileName} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.fileName}
                </Text>
                {item.isQuarantine && <Text style={styles.badge}>隔離</Text>}
              </View>
              <Text style={styles.meta}>
                {formatDateTime(item.modifiedAt)} / {formatSize(item.size)}
              </Text>
              {item.healthy ? (
                <View style={styles.counts}>
                  <Text style={styles.countText}>
                    筋トレ {item.workouts}件（最新 {shortDate(item.latestWorkoutDate)}）
                  </Text>
                  <Text style={styles.countText}>
                    食事 {item.meals}件（最新 {shortDate(item.latestMealDate)}）
                  </Text>
                  <Text style={styles.countText}>
                    水分 {item.waterLogs}件（最新 {shortDate(item.latestWaterDate)}）
                  </Text>
                  <Text style={styles.countText}>体組成 {item.bodyLogs}件</Text>
                </View>
              ) : (
                <Text style={styles.unreadable}>中身を読み取れませんでした</Text>
              )}
              <TouchableOpacity
                style={[styles.restoreBtn, !item.healthy && styles.restoreBtnDisabled]}
                disabled={!item.healthy || restoring}
                onPress={() => handleRestore(item)}
              >
                <Text style={styles.restoreBtnText}>このバックアップから復元</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
      {restoring && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    content: { padding: 16, paddingBottom: 60 },
    desc: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginBottom: 16 },
    empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fileName: { flex: 1, fontSize: 14, fontWeight: 'bold', color: colors.text },
    badge: {
      fontSize: 11,
      color: '#000',
      backgroundColor: 'orange',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 8,
      overflow: 'hidden',
    },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    counts: { marginTop: 8, gap: 2 },
    countText: { fontSize: 13, color: colors.text },
    unreadable: { marginTop: 8, fontSize: 13, color: colors.danger },
    restoreBtn: {
      marginTop: 12,
      minHeight: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    restoreBtnDisabled: { opacity: 0.4 },
    restoreBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
