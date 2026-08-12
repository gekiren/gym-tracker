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
  version: '1.8.22',
  title: {
    ja: 'PFCバランス表示の配分カロリー内訳・補足解説機能',
    en: 'Calorie Breakdown & Ratio Guidance in PFC Settings',
  },
  notes: {
    ja: [
      '🥗 PFCバランス表示に各栄養素の配分カロリー（kcal）と1gあたりのカロリー換算の説明を追加しました。',
      '✨ PとFが同じカロリー割合（%）であることが一目で伝わる安心表示に強化しました。',
    ],
    en: [
      '🥗 Added calorie breakdown (kcal) and calorie-per-gram explanations to PFC ratio settings.',
      '✨ Easily verify that P and F have identical calorie allocations at equal percentages.',
    ],
  },
};

