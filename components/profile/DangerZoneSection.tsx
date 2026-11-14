import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme';

interface DangerZoneSectionProps {
  isResetModalVisible: boolean;
  setIsResetModalVisible: (visible: boolean) => void;
  resetConfirmText: string;
  setResetConfirmText: (text: string) => void;
  isResetting: boolean;
  onResetDatabase: () => void;
  onOpenRestoreModal: () => void;
  t: (key: string, options?: any) => string;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  isResetModalVisible,
  setIsResetModalVisible,
  resetConfirmText,
  setResetConfirmText,
  isResetting,
  onResetDatabase,
  onOpenRestoreModal,
  t,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleCloseResetModal = () => {
    if (isResetting) return;
    setIsResetModalVisible(false);
    setResetConfirmText('');
  };

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="warning-outline" size={24} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={[styles.sectionTitle, { color: colors.danger }]}>{t('ui.profile.section_danger')}</Text>
        </View>
        <View style={[styles.settingCard, { borderColor: colors.danger, backgroundColor: 'rgba(239, 83, 80, 0.05)' }]}>
          {/* 1. Default Presets Restoration */}
          <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: 'rgba(239, 83, 80, 0.15)', paddingBottom: 16, marginBottom: 12, alignItems: 'center' }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={styles.settingLabel}>{t('ui.profile.restore_defaults')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.restore_defaults_desc')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.restoreButton}
              activeOpacity={0.8}
              onPress={onOpenRestoreModal}
            >
              <Text style={styles.restoreButtonText}>{t('ui.profile.restore_btn_label') || '復元'}</Text>
            </TouchableOpacity>
          </View>

          {/* 2. Database Reset */}
          <View style={[styles.settingRow, { borderBottomWidth: 0, alignItems: 'center' }]}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={[styles.settingLabel, { color: colors.danger }]}>{t('ui.profile.clear_data')}</Text>
              <Text style={styles.settingDesc}>{t('ui.profile.clear_data_desc')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.dangerButton}
              activeOpacity={0.8}
              onPress={() => setIsResetModalVisible(true)}
            >
              <Text style={styles.dangerButtonText}>{t('ui.common.delete') || '初期化'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Safeguard Initialization Modal */}
      <Modal
        visible={isResetModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseResetModal}
      >
        <View style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseResetModal} />
          <View style={styles.modalCard}>
            <Ionicons name="alert-circle-outline" size={56} color={colors.danger} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.profile.clear_data_confirm_title')}</Text>
            
            <ScrollView style={{ maxHeight: 150, width: '100%', marginBottom: 16 }} showsVerticalScrollIndicator={true}>
              <Text style={styles.modalDesc}>
                {t('ui.profile.clear_data_confirm_message')}
              </Text>
            </ScrollView>

            <TextInput
              style={styles.modalInput}
              value={resetConfirmText}
              onChangeText={setResetConfirmText}
              placeholder={t('ui.profile.clear_data_placeholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isResetting}
            />

            <View style={styles.modalBtnContainer}>
              <TouchableOpacity 
                style={[styles.modalCancelBtn, isResetting && { opacity: 0.5 }]} 
                onPress={handleCloseResetModal}
                disabled={isResetting}
              >
                <Text style={styles.modalCancelBtnText}>{t('ui.active_workout.cancel') || 'キャンセル'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalConfirmBtn, 
                  (resetConfirmText !== 'OK' || isResetting) && styles.modalConfirmBtnDisabled
                ]} 
                onPress={onResetDatabase}
                disabled={resetConfirmText !== 'OK' || isResetting}
              >
                {isResetting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>{t('ui.profile.clear_data_confirm_btn') || '初期化する'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, color: colors.text, fontWeight: 'bold' },
    settingCard: { backgroundColor: colors.card, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: colors.border },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    settingLabel: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
    settingDesc: { color: colors.textMuted, fontSize: 13, paddingRight: 40, lineHeight: 18 },
    dangerButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(239, 83, 80, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: colors.danger },
    dangerButtonText: { color: colors.danger, fontWeight: 'bold', fontSize: 14 },
    restoreButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(79, 172, 254, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
    restoreButtonText: { color: colors.primary, fontWeight: 'bold', fontSize: 14 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 12, textAlign: 'center' },
    modalDesc: { color: colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
    modalInput: { backgroundColor: colors.background, color: colors.text, padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: colors.border, width: '100%', marginBottom: 20, textAlign: 'center', fontWeight: 'bold', letterSpacing: 2 },
    modalBtnContainer: { flexDirection: 'row', gap: 12, width: '100%' },
    modalCancelBtn: { flex: 1, minHeight: 48, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    modalCancelBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
    modalConfirmBtn: { flex: 1, minHeight: 48, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
    modalConfirmBtnDisabled: { opacity: 0.3 },
    modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  });
