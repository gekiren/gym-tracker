import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Updates from 'expo-updates';

export default function DeveloperMenuScreen() {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);

  const handleBackup = async () => {
    try {
      const dbDir = FileSystem.documentDirectory + 'SQLite/';
      const dbUri = dbDir + 'gymtracker.db';

      // Check if DB file exists
      const fileInfo = await FileSystem.getInfoAsync(dbUri);
      if (!fileInfo.exists) {
        Alert.alert(t('ui.common.error'), 'Database file not found.');
        return;
      }

      // Copy to temporary cache location for sharing
      const backupUri = FileSystem.cacheDirectory + 'trenote_backup.db';
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

              // Ensure the SQLite directory exists
              const dbDir = FileSystem.documentDirectory + 'SQLite/';
              const dbUri = dbDir + 'gymtracker.db';
              
              const dirInfo = await FileSystem.getInfoAsync(dbDir);
              if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
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
                t('ui.developer_menu.restore_error_message')
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
                  await Updates.reloadAsync();
                } catch (fetchErr) {
                  console.error('Fetch update failed:', fetchErr);
                  Alert.alert(t('ui.common.error'), 'Failed to download update.');
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
        t('ui.developer_menu.update_check_error_msg')
      );
      setIsChecking(false);
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

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Runtime Version</Text>
            <Text style={styles.infoValue}>{Updates.runtimeVersion || 'N/A'}</Text>
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
