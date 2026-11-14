import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable, ScrollView } from 'react-native';
import { useAppTheme } from '../src/theme';
import { useOTAUpdateStore } from '../src/store/otaUpdateStore';
import { CURRENT_OTA_CONFIG } from '../src/config/otaUpdateConfig';
import { saveSetting } from '../src/db/database';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';

export const OTAUpdateModal = () => {
  const { colors } = useAppTheme();
  const { isVisible, hideModal } = useOTAUpdateStore();

  if (!isVisible) return null;

  const handleClose = () => {
    hideModal();
    saveSetting('last_acknowledged_ota_version', CURRENT_OTA_CONFIG.version).catch((e) => {
      console.warn('[OTAUpdateModal] Failed to acknowledge version on close:', e);
    });
  };

  // Detect current language (default to 'ja' if not matched)
  const currentLang = i18n.language && i18n.language.startsWith('en') ? 'en' : 'ja';
  
  const title = CURRENT_OTA_CONFIG.title[currentLang] || CURRENT_OTA_CONFIG.title['ja'];
  const notes = CURRENT_OTA_CONFIG.notes[currentLang] || CURRENT_OTA_CONFIG.notes['ja'];
  const version = CURRENT_OTA_CONFIG.version;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.dialogContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.content}>
            {/* Header Icon Container */}
            <View style={styles.iconContainer}>
              <Ionicons name="rocket-outline" size={32} color={colors.primary} />
            </View>

            {/* Title & Version */}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <View style={[styles.versionBadge, { borderColor: colors.border }]}>
              <Text style={[styles.versionText, { color: colors.textMuted }]}>v{version}</Text>
            </View>

            {/* Scrollable Release Notes */}
            <ScrollView 
              style={styles.notesScroll} 
              contentContainerStyle={styles.notesContainer}
              showsVerticalScrollIndicator={true}
            >
              {notes.map((note, index) => (
                <View key={index} style={styles.noteItem}>
                  <View style={styles.bulletContainer}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.noteText, { color: colors.text }]}>{note}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.primary }]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#000" style={{ marginRight: 6 }} />
              <Text style={styles.closeButtonText}>
                {currentLang === 'ja' ? '閉じる' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  notesScroll: {
    maxHeight: 180,
    width: '100%',
    marginBottom: 20,
  },
  notesContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    width: '100%',
  },
  bulletContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    flexDirection: 'row',
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
