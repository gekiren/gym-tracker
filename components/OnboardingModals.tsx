import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../src/theme';
import { useWorkoutStore } from '../src/store/workoutStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { saveSetting } from '../src/db/database';
import { readCrashLog, deleteCrashLog, sendCrashReport, initializeSentry } from '../src/services/crashReporterService';

/**
 * Shared onboarding and startup consent modals (unit selection, tracking style, crash report consent).
 */
export const OnboardingModals: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const settings = useSettingsStore(state => state.settings);
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const hasUnsentCrashLog = useWorkoutStore(state => state.hasUnsentCrashLog);
  const [isSendingCrash, setIsSendingCrash] = useState(false);

  const handleSelectUnit = async (unit: 'kg' | 'lbs') => {
    await saveSetting('weight_unit', unit);
    loadSettings({ ...settings, weightUnit: unit, needsUnitSelection: false });
  };

  const handleSelectStyle = async (style: 'simple' | 'advanced') => {
    await saveSetting('style_mode', style);
    const isAdvanced = style === 'advanced';

    await saveSetting('display_rpe', isAdvanced ? '1' : '0');
    await saveSetting('display_stance', isAdvanced ? '1' : '0');
    await saveSetting('display_1rm', isAdvanced ? '1' : '0');
    await saveSetting('display_volume', isAdvanced ? '1' : '0');

    useSettingsStore.getState().setDisplayFields({
      showRpe: isAdvanced,
      showStance: isAdvanced,
      show1RM: isAdvanced,
      showVolume: isAdvanced,
    });

    loadSettings({ ...settings, needsStyleSelection: false });
  };

  const handleCrashConsent = async (consent: 'agreed' | 'declined') => {
    if (isSendingCrash) return;
    setIsSendingCrash(true);
    try {
      await saveSetting('crash_report_consent', consent);
      useSettingsStore.getState().setCrashConsent(consent);

      if (consent === 'agreed') {
        initializeSentry();
      }

      if (hasUnsentCrashLog) {
        if (consent === 'agreed') {
          const log = await readCrashLog();
          if (log) {
            await sendCrashReport(log);
          }
        }
        await deleteCrashLog();
        useWorkoutStore.getState().setHasUnsentCrashLog(false);
      }
    } catch (e) {
      console.error('Failed to save crash report consent:', e);
    } finally {
      setIsSendingCrash(false);
    }
  };

  return (
    <>
      {/* Onboarding Unit Selection Modal */}
      <Modal visible={settings.needsUnitSelection} animationType="fade" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="barbell" size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('ui.home.onboarding_unit_title')}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              {t('ui.home.onboarding_unit_desc')}
            </Text>
            <View style={styles.modalBtnContainer}>
              <TouchableOpacity
                style={[styles.unitBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectUnit('kg')}
              >
                <Text style={styles.unitBtnText}>{t('ui.home.unit_kg_desc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleSelectUnit('lbs')}
              >
                <Text style={styles.unitBtnText}>{t('ui.home.unit_lbs_desc')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Onboarding Style Selection Modal */}
      <Modal
        visible={!settings.needsUnitSelection && settings.needsStyleSelection}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalCard,
              styles.modalCardWide,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="sparkles" size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('ui.home.onboarding_style_title') || '記録スタイルを選択'}
            </Text>
            <Text style={[styles.modalDesc, styles.modalDescCompact, { color: colors.textMuted }]}>
              {t('ui.home.onboarding_style_desc') ||
                'ご自身のトレーニングレベルや好みに合わせて、画面に表示する記録項目を選んでください。'}
            </Text>

            <TouchableOpacity
              style={[styles.styleOptionCard, { borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('simple')}
            >
              <View style={styles.styleOptionIconBg}>
                <Ionicons name="document-text-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.styleOptionBody}>
                <Text style={[styles.styleOptionTitle, { color: colors.text }]}>
                  {t('ui.home.style_simple_title') || 'シンプル'}
                </Text>
                <Text style={[styles.styleOptionDesc, { color: colors.textMuted }]}>
                  {t('ui.home.style_simple_desc') ||
                    '表示項目を最小限に抑え、トレーニングの重量・回数記録だけに集中できるクリーンな表示です。'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.styleOptionCard, styles.styleOptionCardSpaced, { borderColor: colors.border }]}
              activeOpacity={0.8}
              onPress={() => handleSelectStyle('advanced')}
            >
              <View style={[styles.styleOptionIconBg, styles.styleOptionIconBgAccent]}>
                <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.styleOptionBody}>
                <Text style={[styles.styleOptionTitle, { color: colors.text }]}>
                  {t('ui.home.style_advanced_title') || 'こだわり'}
                </Text>
                <Text style={[styles.styleOptionDesc, { color: colors.textMuted }]}>
                  {t('ui.home.style_advanced_desc') ||
                    'RPE(辛さ)やフォームのスタンス記録、自動1RM推定、合計ボリューム計算など、こだわりの機能をフル活用できます。'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={[styles.styleOnboardingHint, { color: colors.textMuted }]}>
              {t('ui.home.style_onboarding_hint') ||
                '※選択した内容は、後から設定（プロフィール）画面で個別にいつでもON/OFFを変更可能です。'}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Onboarding & Startup Crash Consent Modal */}
      <Modal
        visible={
          !settings.needsUnitSelection &&
          !settings.needsStyleSelection &&
          settings.crashConsent === 'unset' &&
          hasUnsentCrashLog
        }
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalCard,
              styles.modalCardWide,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="bug-outline" size={48} color={colors.primary} style={styles.modalIcon} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('ui.crash_report.title') || 'アプリ改善へのご協力のお願い'}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              {t('ui.crash_report.message_detected') ||
                '前回の起動時にアプリが予期せず終了しました。品質向上のため、匿名のクラッシュレポートを送信してもよろしいですか？'}
            </Text>

            <View style={styles.modalBtnContainer}>
              <TouchableOpacity
                style={[styles.crashConsentBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleCrashConsent('agreed')}
                disabled={isSendingCrash}
              >
                {isSendingCrash ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.crashConsentBtnText}>
                    {t('ui.crash_report.btn_consent') || '送信して協力する（同意）'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.crashDeclineBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => handleCrashConsent('declined')}
                disabled={isSendingCrash}
              >
                <Text style={[styles.crashDeclineBtnText, { color: colors.textMuted }]}>
                  {t('ui.crash_report.btn_decline') || '今回は送信しない（拒否）'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCardWide: {
    maxWidth: 450,
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalDescCompact: {
    marginBottom: 20,
  },
  modalBtnContainer: {
    width: '100%',
    gap: 12,
  },
  unitBtn: {
    minHeight: 48,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  styleOptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  styleOptionCardSpaced: {
    marginTop: 12,
  },
  styleOptionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  styleOptionIconBgAccent: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
  },
  styleOptionBody: {
    flex: 1,
  },
  styleOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  styleOptionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  styleOnboardingHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  crashConsentBtn: {
    minHeight: 48,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  crashConsentBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  crashDeclineBtn: {
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
  },
  crashDeclineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
