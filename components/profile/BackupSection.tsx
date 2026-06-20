import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface BackupSectionProps {
  isBackupModalVisible: boolean;
  setIsBackupModalVisible: (visible: boolean) => void;
  isPremium: boolean;
  isEarly: boolean;
  onExport: () => void;
  onImport: () => void;
  onOpenPaywall: () => void;
  t: (key: string, options?: any) => string;
}

export const BackupSection: React.FC<BackupSectionProps> = ({
  isBackupModalVisible,
  setIsBackupModalVisible,
  isPremium,
  isEarly,
  onExport,
  onImport,
  onOpenPaywall,
  t,
}) => {
  const handleBackupMenuPress = () => {
    const isPaidPremium = isPremium && !isEarly;
    if (!isPaidPremium) {
      alertPremiumOnly();
      return;
    }
    setIsBackupModalVisible(true);
  };

  const alertPremiumOnly = () => {
    // We import Alert in react-native but since this is a functional component we can use standard Alert or pass a callback.
    // Let's import Alert from react-native here.
    const { Alert } = require('react-native');
    Alert.alert(
      t('ui.profile.backup_premium_only_title'),
      t('ui.profile.backup_premium_only_desc'),
      [
        { text: t('ui.common.cancel'), style: 'cancel' },
        { 
          text: t('ui.profile.upgrade_btn'), 
          onPress: onOpenPaywall 
        }
      ]
    );
  };

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="cloud-upload-outline" size={24} color={Theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('ui.profile.section_backup')}</Text>
        </View>
        <View style={styles.settingCard}>
          <TouchableOpacity 
            style={[styles.settingRow, { borderBottomWidth: 0 }]} 
            onPress={handleBackupMenuPress}
          >
             <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16 }}>
               <Ionicons name="sync-circle-outline" size={22} color={Theme.colors.text} style={{ marginRight: 12 }} />
               <View style={{ flex: 1 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Text style={styles.settingLabel}>{t('ui.profile.backup_menu_title')}</Text>
                   {!(isPremium && !isEarly) && (
                     <View style={styles.premiumBadge}>
                       <Text style={styles.premiumBadgeText}>PRO</Text>
                     </View>
                   )}
                 </View>
                 <Text style={styles.settingDesc}>{t('ui.profile.backup_menu_desc')}</Text>
               </View>
             </View>
             <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Backup & Restore Modal */}
      <Modal visible={isBackupModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { borderColor: 'rgba(79,172,254,0.3)', padding: 24 }]}>
            <Ionicons name="cloud-upload-outline" size={56} color={Theme.colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t('ui.profile.backup_modal_title')}</Text>
            
            <Text style={[styles.modalDesc, { marginBottom: 24 }]}>
              {t('ui.profile.backup_modal_desc')}
            </Text>

            <View style={{ width: '100%', gap: 12, marginBottom: 20 }}>
              <TouchableOpacity 
                style={styles.modalExportBtn} 
                onPress={onExport}
              >
                <Ionicons name="share-outline" size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.modalExportBtnText}>
                  {t('ui.profile.backup_export_btn')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalImportBtn} 
                onPress={onImport}
              >
                <Ionicons name="download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.modalImportBtnText}>
                  {t('ui.profile.backup_import_btn')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setIsBackupModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t('ui.active_workout.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: Theme.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Theme.spacing.md },
  sectionTitle: { fontSize: 18, color: Theme.colors.text, fontWeight: 'bold' },
  settingCard: { backgroundColor: Theme.colors.card, borderRadius: Theme.borderRadius.md, padding: Theme.spacing.md, borderWidth: 1, borderColor: Theme.colors.border },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  settingLabel: { color: Theme.colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  settingDesc: { color: Theme.colors.textMuted, fontSize: 13, paddingRight: 40, lineHeight: 18 },
  premiumBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderWidth: 1,
    borderColor: '#4facfe',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 8,
  },
  premiumBadgeText: {
    color: '#4facfe',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 12, textAlign: 'center' },
  modalDesc: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  modalExportBtn: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
  },
  modalExportBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalImportBtn: {
    backgroundColor: '#ff4d4f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
  },
  modalImportBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: Theme.colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
