import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useOTAUpdateStore } from '../src/store/otaUpdateStore';
import { saveSetting } from '../src/db/database';
import { CURRENT_OTA_CONFIG } from '../src/config/otaUpdateConfig';

/**
 * Widget Deep Link Entry Point
 *
 * This route exists solely as the target for the Android home screen widget.
 * The widget launches `gymtracker:///start-workout`, which Expo Router routes here.
 * This component immediately redirects to the workout home screen (/(tabs)/).
 *
 * URL: gymtracker:///start-workout
 */
export default function StartWorkout() {
  // 同期的にモーダルを抑止（タイマー発火前ガード）
  useOTAUpdateStore.getState().suppressModal();

  useEffect(() => {
    // 承認状態を確実に永続化し、次回以降もポップアップが出ないよう保護
    saveSetting('last_acknowledged_ota_version', CURRENT_OTA_CONFIG.version).catch((e) => {
      console.warn('[Widget] Failed to auto-acknowledge OTA version on widget start-workout:', e);
    });
  }, []);

  return <Redirect href="/(tabs)/" />;
}
