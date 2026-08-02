import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { DangerZoneSection } from '../../components/profile/DangerZoneSection';
import { RestorePresetsModal } from '../../components/profile/RestorePresetsModal';
import { resetDatabase, saveSetting } from '../../src/db/database';
import { useWorkoutStore } from '../../src/store/workoutStore';
import * as Updates from 'expo-updates';

export default function DataManagementSettingsScreen() {
  const { t, i18n } = useTranslation();
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDatabase = async () => {
    if (resetConfirmText !== 'OK') {
      Alert.alert(
        t('ui.profile.clear_data_confirm_title') || '確認',
        t('ui.profile.clear_data_error_mismatch') || '「OK」と正確に入力してください。'
      );
      return;
    }

    setIsResetting(true);
    try {
      await resetDatabase();
      useWorkoutStore.getState().resetAllSettingsAndWorkout();

      const activeLang = i18n.language || 'ja';
      await saveSetting('language', activeLang);
      if (activeLang === 'ja') {
        await saveSetting('weight_unit', 'kg');
        useWorkoutStore.getState().loadSettings({
          ...useWorkoutStore.getState().settings,
          weightUnit: 'kg',
          needsUnitSelection: false
        });
      }

      setIsResetModalVisible(false);
      setResetConfirmText('');
      
      Alert.alert(
        t('ui.profile.clear_data_success_title') || '初期化完了', 
        t('ui.profile.clear_data_success_message') || 'すべてのデータが初期化されました。アプリを再起動します。',
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
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', 'データベースの初期化に失敗しました。');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>データ管理</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <DangerZoneSection
          isResetModalVisible={isResetModalVisible}
          setIsResetModalVisible={setIsResetModalVisible}
          resetConfirmText={resetConfirmText}
          setResetConfirmText={setResetConfirmText}
          isResetting={isResetting}
          onResetDatabase={handleResetDatabase}
          onOpenRestoreModal={() => setIsRestoreModalVisible(true)}
          t={t}
        />

        <RestorePresetsModal
          visible={isRestoreModalVisible}
          onClose={() => setIsRestoreModalVisible(false)}
          onRestore={() => {}}
          t={t}
        />
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
});
