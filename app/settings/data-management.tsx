import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../src/theme';
import { DangerZoneSection } from '../../components/profile/DangerZoneSection';
import { RestorePresetsModal } from '../../components/profile/RestorePresetsModal';
import { resetDatabase, saveSetting } from '../../src/db/database';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useRoutineDraftStore } from '../../src/store/routineDraftStore';
import { useLifelogStore } from '../../src/store/lifelogStore';
import * as Updates from 'expo-updates';

export default function DataManagementSettingsScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      useWorkoutStore.getState().resetWorkoutState();
      useSettingsStore.getState().resetSettings();
      useRoutineDraftStore.getState().clearDraft();
      useLifelogStore.getState().resetAll();

      const activeLang = i18n.language || 'ja';
      await saveSetting('language', activeLang);
      if (activeLang === 'ja') {
        await saveSetting('weight_unit', 'kg');
        useSettingsStore.getState().loadSettings({
          ...useSettingsStore.getState().settings,
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
          <Ionicons name="chevron-back" size={24} color={colors.text} />
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
      borderBottomColor: colors.border
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    content: { padding: 16, paddingBottom: 60 },
  });
