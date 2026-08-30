import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Theme } from '../../theme';

export const VoiceAiCard = () => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push('/lifelog/voice-assistant')}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(100, 180, 255, 0.15)' }]}>
          <Ionicons name="mic" size={24} color="#64b4ff" />
        </View>
        <Text style={styles.cardTitle}>{t('ui.home.card_voice_ai') || '音声AIアシスタント'}</Text>
        <Ionicons name="chevron-forward" size={20} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.inactiveText}>
          {t('ui.home.voice_ai_desc') || '話すだけでトレーニング・食事・水分を記録。Gemini Live API による音声リアルタイム対話。'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    color: Theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    paddingLeft: 52,
  },
  inactiveText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
