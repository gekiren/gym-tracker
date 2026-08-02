import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Theme } from '../../src/theme';
import { AppInfoSection } from '../../components/profile/AppInfoSection';
import { CURRENT_OTA_CONFIG } from '../../src/config/otaUpdateConfig';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

export default function AppInfoSettingsScreen() {
  const { t } = useTranslation();
  const [isCheckingPromoWorkflow, setIsCheckingPromoWorkflow] = useState(false);

  const nativeVersion = Updates.runtimeVersion || Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>アプリ情報</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AppInfoSection
          currentOtaVersion={CURRENT_OTA_CONFIG.version}
          nativeVersion={nativeVersion}
          isCheckingPromoWorkflow={isCheckingPromoWorkflow}
          onPressPromoCode={() => router.push('/settings/account')}
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
