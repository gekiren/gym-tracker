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
  version: '2.0.5',
  title: {
    ja: '🥗 写真拡大プレビューの2本指ピンチ操作レスポンス改善',
    en: '🥗 Photo Pinch Zoom Responsiveness Improvements',
  },
  notes: {
    ja: [
      '全画面写真拡大における2本指でのピンチイン・ピンチアウト（ズームイン/ズームアウト）操作が即座に滑らかに反応するようマルチタッチ検知を最適化しました。',
    ],
    en: [
      'Optimized multi-touch gesture detection for instant and smooth 2-finger pinch zoom response on full-screen photo viewer.',
    ],
  },
};
