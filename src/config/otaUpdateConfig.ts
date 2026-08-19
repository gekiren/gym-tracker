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
  version: '1.8.93',
  title: {
    ja: '⚡ AI食事写真解析の高速化 ＆ タイムアウト改善',
    en: '⚡ Faster AI Meal Photo Analysis & Timeout Fix',
  },
  notes: {
    ja: [
      '食事写真および食品ラベルのAI解析速度を大幅に高速化しました。',
      '画像送信サイズの軽量化とタイムアウト制御の適正化により、待機時間やエラーを削減しました。',
    ],
    en: [
      'Significantly sped up AI nutrition analysis for meal photos and food labels.',
      'Optimized image compression and timeout management to reduce waiting times and errors.',
    ],
  },
};
