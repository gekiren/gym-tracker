import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '../../theme';
import { HomeCard } from './HomeCard';

export const VoiceAiCard = () => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <HomeCard
      title={t('ui.home.card_voice_ai') || '音声AIアシスタント'}
      iconName="mic"
      iconColor="#64b4ff"
      iconBgColor="rgba(100, 180, 255, 0.15)"
      onPress={() => router.push('/lifelog/voice-assistant')}
    >
      <Text style={[styles.inactiveText, { color: colors.textMuted }]}>
        {t('ui.home.voice_ai_desc') ||
          '話すだけでトレーニング・食事・水分を記録。アクアボイス ＆ Gemini による高精度自動入力。'}
      </Text>
    </HomeCard>
  );
};

const styles = StyleSheet.create({
  inactiveText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
