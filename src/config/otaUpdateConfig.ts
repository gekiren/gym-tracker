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
  version: '2.3.17',
  title: {
    ja: '🎙️ 音声AIアシスタント：屋外ノイズ抑制 ＆ カテゴリ選択',
    en: '🎙️ Voice AI Assistant: Noise Suppression & Category Selector',
  },
  notes: {
    ja: [
      '屋外やイヤホン使用時の認識精度向上のため、マイクのノイズ抑制・エコーキャンセルを強化しました。',
      '「筋トレ」「栄養」「水分」「メモ」から選べるカテゴリ選択セレクターを追加し、AI認識精度を大幅に向上させました。',
    ],
    en: [
      'Enhanced microphone noise suppression and echo cancellation for better outdoor/earphone accuracy.',
      'Added category selector (Workout, Nutrition, Water, Note) with dedicated vocabulary optimization.',
    ],
  },
};

