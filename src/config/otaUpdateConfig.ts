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
  version: '2.0.6',
  title: {
    ja: '🥗 ネイティブピンチジェスチャーによる全画面写真ズーム完全対応',
    en: '🥗 Native Pinch Gesture Zoom Support for Fullscreen Photo Viewer',
  },
  notes: {
    ja: [
      'PinchGestureHandler（ネイティブピンチジェスチャー）を採用し、Android端末においても2本指のピンチ操作（ピンチイン・ピンチアウト）が100%確実に滑らかに動くよう抜本改修しました。',
    ],
    en: [
      'Rebuilt photo viewer with native PinchGestureHandler for 100% reliable and smooth 2-finger pinch zoom on Android and iOS.',
    ],
  },
};
