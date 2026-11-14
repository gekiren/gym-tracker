import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import {
  signInWithGoogle,
  syncAccountStatusSilently,
  signOutGoogle,
} from '../../src/services/accountSyncService';

interface GoogleAccountSectionProps {
  onSyncComplete?: () => void;
  t: (key: string, options?: any) => string;
}

export const GoogleAccountSection: React.FC<GoogleAccountSectionProps> = ({
  onSyncComplete,
  t,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const user = useAuthStore((state) => state.user);
  const isSyncing = useAuthStore((state) => state.isSyncing);
  const lastSyncedAt = useAuthStore((state) => state.lastSyncedAt);

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(
      d.getDate()
    ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
  };

  const handleSignIn = async () => {
    if (isSyncing) return;
    const res = await signInWithGoogle();
    if (res.success) {
      onSyncComplete?.();
      Alert.alert(
        t('ui.profile.google_link_success_title') || 'アカウント連携完了',
        t('ui.profile.google_link_success_msg', { email: res.user?.email || '' }) ||
          `Googleアカウント（${res.user?.email || ''}）と連携し、プランステータスを同期しました。`
      );
    } else if (res.error && res.error !== 'CANCELLED') {
      Alert.alert(
        t('ui.common.error') || 'エラー',
        res.error
      );
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    const res = await syncAccountStatusSilently();
    if (res.success) {
      onSyncComplete?.();
      Alert.alert(
        t('ui.profile.google_sync_done_title') || '同期完了',
        t('ui.profile.google_sync_done_msg') || '最新のアカウントステータスを同期しました。'
      );
    } else {
      // トークン期限切れ等でサイレント同期できない場合は通常のサインインフローへフォールバック
      await handleSignIn();
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      t('ui.profile.google_unlink_confirm_title') || 'Google連携の解除',
      t('ui.profile.google_unlink_confirm_msg') ||
        'Googleアカウントとの連携を解除しますか？\n（※端末内のトレーニング記録や現在のプラン状態は消去されません）',
      [
        { text: t('ui.common.cancel') || 'キャンセル', style: 'cancel' },
        {
          text: t('ui.profile.google_unlink_action') || '連携を解除',
          style: 'destructive',
          onPress: async () => {
            await signOutGoogle();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name="logo-google"
          size={22}
          color={colors.primary}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.sectionTitle}>
          {t('ui.profile.google_section_title') || 'アカウント連携 (共通ID)'}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        {user ? (
          <View style={styles.linkedContainer}>
            <View style={styles.userRow}>
              {user.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="logo-google" size={20} color={colors.primary} />
                </View>
              )}
              <View style={styles.userInfo}>
                <View style={styles.badgeRow}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.name || 'Google User'}
                  </Text>
                  <View style={styles.linkedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                    <Text style={styles.linkedBadgeText}>
                      {t('ui.profile.google_linked_badge') || '連携中'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user.email}
                </Text>
                {lastSyncedAt ? (
                  <Text style={styles.syncTimeText}>
                    {t('ui.profile.google_last_synced') || '最終同期'}: {formatSyncTime(lastSyncedAt)}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.syncButton}
                onPress={handleManualSync}
                disabled={isSyncing}
                activeOpacity={0.7}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name="sync-outline"
                      size={16}
                      color={colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.syncButtonText}>
                      {t('ui.profile.google_sync_now') || 'ステータスを再同期'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.unlinkButton}
                onPress={handleSignOut}
                disabled={isSyncing}
                activeOpacity={0.7}
              >
                <Text style={styles.unlinkButtonText}>
                  {t('ui.profile.google_unlink_btn') || '連携解除'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.unlinkedContainer}>
            <Text style={styles.descriptionText}>
              {t('ui.profile.google_unlinked_desc') ||
                'Googleアカウントと連携すると、機種変更時のプラン・特典ステータスの自動引き継ぎや、関連アプリ間での共通アカウント連動が可能になります。'}
            </Text>

            <TouchableOpacity
              style={styles.googleSignInButton}
              onPress={handleSignIn}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons
                    name="logo-google"
                    size={18}
                    color="#ffffff"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.googleSignInButtonText}>
                    {t('ui.profile.google_signin_btn') || 'Googleでサインインして連携'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    section: {
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      color: colors.text,
      fontWeight: 'bold',
    },
    cardContainer: {
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    unlinkedContainer: {
      gap: 14,
    },
    descriptionText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    googleSignInButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#2563eb',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 4,
    },
    googleSignInButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
    },
    linkedContainer: {
      gap: 14,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarImage: {
      width: 44,
      height: 44,
      borderRadius: 22,
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userInfo: {
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    userName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: 'bold',
      flexShrink: 1,
    },
    linkedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      gap: 4,
    },
    linkedBadgeText: {
      color: '#10b981',
      fontSize: 11,
      fontWeight: 'bold',
    },
    userEmail: {
      color: colors.textMuted,
      fontSize: 13,
    },
    syncTimeText: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 3,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      gap: 10,
    },
    syncButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(79, 172, 254, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(79, 172, 254, 0.3)',
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 4,
    },
    syncButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    unlinkButton: {
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unlinkButtonText: {
      color: colors.textMuted,
      fontSize: 12,
    },
  });
