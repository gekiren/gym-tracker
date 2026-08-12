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
  version: '1.8.25',
  title: {
    ja: 'AIによるオートファジー時間最適化機能の追加',
    en: 'AI-Powered Autophagy Time Optimization',
  },
  notes: {
    ja: [
      '✨ オートファジー絶食タイマーに直近24時間の食事ログをAI解析して最適目標時間を自動提案する「オートファジー時間最適化」機能を追加しました。',
      '💡 AIが総カロリー・PFCバランス・食事タイミングから個人の状況に合った絶食時間とアドバイスを分かりやすく解説・ワンタップ設定できます。',
    ],
    en: [
      '✨ Added AI-powered autophagy time optimization based on the last 24 hours of meal logs.',
      '💡 The AI analyzes calories, PFC balance, and meal timing to recommend ideal fasting hours with clear advice and one-tap setup.',
    ],
  },
};

