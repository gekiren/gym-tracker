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
  version: '1.8.23',
  title: {
    ja: 'PFC設定画面のレイアウト・表示改善',
    en: 'Layout & Display Improvements in PFC Settings',
  },
  notes: {
    ja: [
      '🥗 PFCバランス設定画面の入力欄と計算結果カードの配置を見やすく入れ替えました。',
      '✨ 不要な補足テキストと重複した%表示を整理し、画面をスッキリさせました。',
    ],
    en: [
      '🥗 Reordered input fields and calculation result cards for better readability.',
      '✨ Cleaned up redundant percentage badges and note texts for a clearer interface.',
    ],
  },
};

