export interface OTAUpdateConfig {
  version: string;
  title: {
    ja: string;
    en: string;
  };
  notes: {
    ja: string[];
    en: string[];
  };
}

export const CURRENT_OTA_CONFIG: OTAUpdateConfig = {
  version: '2.0.7',
  title: {
    ja: '🥗 写真拡大ジェスチャー（ピンチ・ダブルタップ）の無反応バグ修正',
    en: '🥗 Fix Unresponsive Photo Zoom Gestures',
  },
  notes: {
    ja: [
      'Androidの実機にて、写真拡大画面のピンチ操作およびダブルタップ操作が全く反応しなくなっていたバグを修正し、全てのジェスチャーが確実に動作するよう対応しました。',
    ],
    en: [
      'Fixed a bug where pinch and double-tap gestures became unresponsive on Android photo viewer. All gestures now work reliably.',
    ],
  },
};
