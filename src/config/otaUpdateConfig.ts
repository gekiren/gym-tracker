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
  version: '1.8.20',
  title: {
    ja: '栄養目標の手動設定に3つの入力モードを追加',
    en: 'Added 3 Input Modes for Manual Nutrition Target Setting',
  },
  notes: {
    ja: [
      '🎯 栄養目標の手動設定で「①総カロリー+PFC比」「②PFC比+P(g)量」「③完全手動」の3モードを切替可能になりました。',
      '✨ モードに応じたPFCグラム数や目標カロリーのリアルタイム自動計算機能を搭載しました。',
    ],
    en: [
      '🎯 Added 3 selectable modes for manual nutrition settings: Total Calorie + PFC Ratio, PFC Ratio + Protein Amount, and Full Manual.',
      '✨ Real-time auto-calculation of PFC grams and target calories based on selected mode.',
    ],
  },
};

