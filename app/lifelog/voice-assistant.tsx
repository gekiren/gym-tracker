import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, PermissionsAndroid, Alert, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Theme, useAppTheme } from '../../src/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useLifelogStore } from '../../src/store/lifelogStore';
import { getLastWorkoutSummary } from '../../src/db/database';
import { handleCompanionWebViewMessage } from '../../src/services/aiCompanionSyncService';
import { useFeatureSwipe } from '../../src/hooks/useFeatureSwipe';
import { PointBadge } from '../../components/PointBadge';

export default function VoiceAssistantScreen() {
  const { colors } = useAppTheme();
  const settings = useSettingsStore((state) => state.settings);
  const daySummary = useLifelogStore((state) => state.daySummary);
  const { panHandlerProps } = useFeatureSwipe('/lifelog/voice-assistant');

  const [aiCompanionUrl] = useState('https://ai-companion-web.toshi-diyil.workers.dev');
  const [aiCompanionInjectedJs, setAiCompanionInjectedJs] = useState<string | null>(null);
  const [aiCompanionKey, setAiCompanionKey] = useState(0);

  const getTodayStr = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  };

  useEffect(() => {
    const initVoiceAssistant = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'マイクの権限',
              message: '音声AIアシスタントで会話するためにマイクの許可が必要です。',
              buttonPositive: '許可する',
              buttonNegative: 'キャンセル',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('マイク権限が必要です', 'マイクの権限が許可されていないため、音声対話を使用できません。設定画面からマイクを許可してください。');
          }
        } catch (err) {
          console.warn('Mic permission error', err);
        }
      }

      let lastWorkoutStr: string | null = null;
      try {
        const lastWorkoutSummary = await getLastWorkoutSummary();
        if (lastWorkoutSummary) {
          lastWorkoutStr = `${lastWorkoutSummary.title || 'トレーニング'} (${lastWorkoutSummary.dateStr}) 計${lastWorkoutSummary.totalSets}セット`;
        }
      } catch (e) {
        console.warn('Failed to get last workout summary:', e);
      }

      const contextData = {
        lastWorkout: lastWorkoutStr,
        currentWaterMl: daySummary?.water.amount || 0,
        waterGoalMl: daySummary?.water.goal || 2000,
        bodyWeight: settings.bodyWeight || null,
        theme: settings.backgroundTheme || 'dark',
        date: getTodayStr(),
        memory: settings.aiCompanionMemory || '',
      };

      const injectedJs = `window.__TRENOTE_CONTEXT__ = ${JSON.stringify(contextData)};true;`;
      setAiCompanionInjectedJs(injectedJs);
      setAiCompanionKey((prev) => prev + 1);
    };

    initVoiceAssistant();
  }, [settings, daySummary]);

  const handleWebViewMessage = (event: any) => {
    handleCompanionWebViewMessage(event, () => {
      if (router.canGoBack()) {
        router.back();
      }
    });
  };

  return (
    <PanGestureHandler {...panHandlerProps}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen
          options={{
            title: '音声AIアシスタント',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => <PointBadge style={{ marginRight: 8 }} />,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.navigate('/');
                  }
                }}
                style={{ marginLeft: 8, padding: 4 }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        {aiCompanionInjectedJs ? (
          <WebView
            key={aiCompanionKey}
            source={{ uri: aiCompanionUrl }}
            injectedJavaScriptBeforeContentLoaded={aiCompanionInjectedJs}
            style={{ flex: 1, backgroundColor: colors.background }}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={false}
            mediaCapturePermissionGrantType="grant"
            onMessage={handleWebViewMessage}
            {...({
              onPermissionRequest: (request: any) => {
                try {
                  request.grant(request.resources);
                } catch (e) {
                  console.warn('Permission grant error:', e);
                }
              },
            } as any)}
          />
        ) : null}
      </View>
    </PanGestureHandler>
  );
}
