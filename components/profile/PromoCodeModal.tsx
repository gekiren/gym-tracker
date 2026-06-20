import React from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../src/theme';

interface PromoCodeModalProps {
  visible: boolean;
  onClose: () => void;
  promoInputText: string;
  onChangePromoInputText: (text: string) => void;
  isApplyingPromo: boolean;
  onApplyPromo: () => void;
  t: (key: string, options?: any) => string;
}

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
  visible,
  onClose,
  promoInputText,
  onChangePromoInputText,
  isApplyingPromo,
  onApplyPromo,
  t,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.modalCard, { borderColor: 'rgba(192, 132, 252, 0.3)' }]}>
          <Ionicons name="gift-outline" size={56} color="#c084fc" style={{ marginBottom: 16 }} />
          <Text style={styles.modalTitle}>{t('ui.profile.promo_modal_title')}</Text>
          
          <Text style={styles.modalDesc}>
            {t('ui.profile.promo_modal_desc')}
          </Text>

          <TextInput
            style={styles.promoInput}
            value={promoInputText}
            onChangeText={onChangePromoInputText}
            placeholder={t('ui.profile.promo_input_placeholder')}
            placeholderTextColor="rgba(255,255,255,0.3)"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isApplyingPromo}
          />

          <View style={styles.modalBtnContainer}>
            <TouchableOpacity 
              style={[styles.modalCancelBtn, isApplyingPromo && { opacity: 0.5 }]} 
              onPress={onClose}
              disabled={isApplyingPromo}
            >
              <Text style={styles.modalCancelBtnText}>{t('ui.common.cancel') || 'キャンセル'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.modalConfirmBtn, 
                { backgroundColor: '#c084fc' },
                (promoInputText.trim() === '' || isApplyingPromo) && styles.modalConfirmBtnDisabled
              ]} 
              onPress={onApplyPromo}
              disabled={promoInputText.trim() === '' || isApplyingPromo}
            >
              {isApplyingPromo ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalConfirmBtnText}>{t('ui.profile.promo_apply_btn') || '適用する'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: Theme.colors.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Theme.colors.text, marginBottom: 12, textAlign: 'center' },
  modalDesc: { color: Theme.colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 16 },
  modalBtnContainer: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center' },
  modalCancelBtnText: { color: Theme.colors.text, fontSize: 15, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: Theme.colors.danger, alignItems: 'center', justifyContent: 'center' },
  modalConfirmBtnDisabled: { opacity: 0.3 },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  promoInput: { 
    backgroundColor: '#121212', 
    color: Theme.colors.text, 
    padding: 12, 
    borderRadius: 8, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: Theme.colors.border, 
    width: '100%', 
    marginBottom: 20, 
    textAlign: 'center', 
    fontWeight: 'bold', 
    letterSpacing: 2 
  },
});
