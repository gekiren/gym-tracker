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
  version: '1.8.21',
  title: {
    ja: 'PFCバランス設定の%・g数リアルタイム連動機能',
    en: 'Real-time PFC Gram & Ratio Sync in Nutrition Settings',
  },
  notes: {
    ja: [
      '🥗 PFCバランス設定に%とg数がリアルタイムで連動する表示カードを追加しました。',
      '✨ 比率(%)を微調整しながら目標グラム数や総カロリーを直感的に確かめて設定できます。',
    ],
    en: [
      '🥗 Added real-time sync card between PFC percentage and target grams in nutrition settings.',
      '✨ Easily verify and adjust target grams and total calories while tuning ratios.',
    ],
  },
};

