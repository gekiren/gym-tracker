import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, UIManager, NativeModules } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../src/theme';
import { useTranslation } from 'react-i18next';
import type ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { generateShareText, copyShareTextToClipboard } from '../src/services/shareService';
import { ShareCardView } from './active-workout/ShareCardView';

let ViewShotComponent: any = null;
try {
  const module = require('react-native-view-shot');
  ViewShotComponent = module.default || module;
} catch (e) {
  console.warn('react-native-view-shot module require failed:', e);
}

const APP_ICON = require('../assets/images/icon.png');

interface WorkoutShareModalProps {
  visible: boolean;
  onClose: () => void;
  workout: any;
  settings: {
    weightUnit: 'kg' | 'lbs';
    bodyWeight: number | null;
  };
}

export default function WorkoutShareModal({ visible, onClose, workout, settings }: WorkoutShareModalProps) {
  const { t, i18n } = useTranslation();
  const [sharePattern, setSharePattern] = useState<'A' | 'B' | 'C'>('A');
  const [isSharing, setIsSharing] = useState(false);
  const [viewShotAvailable, setViewShotAvailable] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    try {
      const hasNativeModule = !!NativeModules.RNViewShot;
      const hasViewConfig = !!(
        UIManager.hasViewManagerConfig && UIManager.hasViewManagerConfig('RNViewShot')
      ) || !!(
        UIManager.getViewManagerConfig && (UIManager.getViewManagerConfig('RNViewShot') || (UIManager as any).getViewManagerConfig('RNViewShotView'))
      );
      setViewShotAvailable(hasNativeModule || hasViewConfig);
    } catch (e) {
      setViewShotAvailable(false);
    }
  }, []);

  const handleShare = async (pattern: 'A' | 'B' | 'C') => {
    if (!viewShotAvailable) {
      Alert.alert(
        t('ui.share_modal.rebuild_required_title'),
        t('ui.share_modal.rebuild_required_desc'),
        [{ text: t('ui.common.ok') || 'OK' }]
      );
      return;
    }
    
    setSharePattern(pattern);
    setIsSharing(true);

    // Let the state update propagate so the correct pattern renders in ShareCardView
    setTimeout(async () => {
      try {
        if (viewShotRef.current && typeof viewShotRef.current.capture === 'function') {
          const uri = await viewShotRef.current.capture();
          
          // Generate & Copy text to clipboard
          const shareText = generateShareText(workout, settings);
          await copyShareTextToClipboard(shareText);

          // Native Share
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: t('ui.share_modal.dialog_title') || 'Share Workout Record',
              UTI: 'public.png',
            });
          } else {
            Alert.alert(
              t('ui.share_modal.share_error_title'),
              t('ui.share_modal.share_error_desc')
            );
          }
        } else {
          Alert.alert(
            t('ui.share_modal.gen_error_title'),
            t('ui.share_modal.gen_error_desc')
          );
        }
      } catch (err) {
        console.error('Share capture failed', err);
        Alert.alert(
          t('ui.share_modal.error_title'),
          t('ui.share_modal.error_desc')
        );
      } finally {
        setIsSharing(false);
        onClose();
      }
    }, 400);
  };

  return (
    <>
      {/* Pattern Selection Modal */}
      <Modal visible={visible && !isSharing} transparent={true} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheetContent}>
            <Text style={styles.modalTitle}>{t('ui.share_modal.title')}</Text>
            
            <TouchableOpacity style={styles.patternOption} onPress={() => handleShare('A')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="sparkles" size={24} color="#ffd700" />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>{t('ui.share_modal.pattern_a_name')}</Text>
                <Text style={styles.patternDesc}>{t('ui.share_modal.pattern_a_desc')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.patternOption} onPress={() => handleShare('B')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="list" size={24} color={Theme.colors.primary} />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>{t('ui.share_modal.pattern_b_name')}</Text>
                <Text style={styles.patternDesc}>{t('ui.share_modal.pattern_b_desc')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.patternOption} onPress={() => handleShare('C')}>
              <View style={styles.patternIconCircle}>
                <Ionicons name="stats-chart" size={24} color={Theme.colors.success} />
              </View>
              <View style={styles.patternTextContainer}>
                <Text style={styles.patternName}>{t('ui.share_modal.pattern_c_name')}</Text>
                <Text style={styles.patternDesc}>{t('ui.share_modal.pattern_c_desc')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{t('ui.common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Loading Overlay */}
      {isSharing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
            <Text style={styles.loadingText}>{t('ui.share_modal.generating')}</Text>
          </View>
        </View>
      )}

      {/* Hidden view for capturing */}
      {viewShotAvailable && ViewShotComponent && visible && (
        <View style={{ position: 'absolute', left: -9999, top: -9999 }}>
          <ViewShotComponent ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
            <ShareCardView workout={workout} settings={settings} pattern={sharePattern} />
          </ViewShotComponent>
        </View>
      )}
    </>
  );
}


const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: Theme.colors.card,
    borderTopLeftRadius: Theme.borderRadius.lg,
    borderTopRightRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    gap: 16,
    borderTopWidth: 1,
    borderColor: Theme.colors.border,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  patternOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    gap: 16,
  },
  patternIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternTextContainer: {
    flex: 1,
  },
  patternName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  patternDesc: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 4,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Theme.colors.textMuted,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  loadingContent: {
    backgroundColor: Theme.colors.card,
    padding: 24,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
