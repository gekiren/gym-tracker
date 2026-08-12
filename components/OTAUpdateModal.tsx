import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable, ScrollView } from 'react-native';
import * as Updates from 'expo-updates';
import { Theme } from '../src/theme';
import { useOTAUpdateStore } from '../src/store/otaUpdateStore';
import { CURRENT_OTA_CONFIG } from '../src/config/otaUpdateConfig';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../src/i18n';

export const OTAUpdateModal = () => {
  const { isVisible, hideModal } = useOTAUpdateStore();

  if (!isVisible) return null;

  // Detect current language (default to 'ja' if not matched)
  const currentLang = i18n.language && i18n.language.startsWith('en') ? 'en' : 'ja';
  
  const title = CURRENT_OTA_CONFIG.title[currentLang] || CURRENT_OTA_CONFIG.title['ja'];
  const notes = CURRENT_OTA_CONFIG.notes[currentLang] || CURRENT_OTA_CONFIG.notes['ja'];
  const version = CURRENT_OTA_CONFIG.version;

  const handleApplyAndReload = async () => {
    hideModal();
    try {
      if (Updates.isEnabled && !__DEV__) {
        await Updates.reloadAsync();
      }
    } catch (e) {
      console.warn('Failed to reload app for OTA update:', e);
    }
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={hideModal}
    >
      <Pressable style={styles.overlay} onPress={hideModal}>
        <Pressable style={styles.dialogContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.content}>
            {/* Header Icon Container */}
            <View style={styles.iconContainer}>
              <Ionicons name="rocket-outline" size={32} color={Theme.colors.primary} />
            </View>

            {/* Title & Version */}
            <Text style={styles.title}>{title}</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{version}</Text>
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
                    <Ionicons name="checkmark-circle-outline" size={16} color={Theme.colors.primary} />
                  </View>
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Restart & Apply Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleApplyAndReload}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={18} color="#000" style={{ marginRight: 6 }} />
              <Text style={styles.closeButtonText}>
                {currentLang === 'ja' ? '今すぐ再起動して反映' : 'Restart App & Apply'}
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
    maxWidth: 320,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: Theme.spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  versionText: {
    color: Theme.colors.textMuted,
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
    marginBottom: 10,
    width: '100%',
  },
  bulletContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.primary,
    width: '100%',
    height: 48,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  closeButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
