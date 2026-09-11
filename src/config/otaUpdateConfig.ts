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
  version: '2.1.15',
  title: {
    ja: '🥗 食事編集における食べた量の倍率変更に対応',
    en: '🥗 Portion Multiplier Support for Meal Log Editing',
  },
  notes: {
    ja: [
      '記録済みの食事ログを編集する際、食べた量の倍率（0.5倍〜2.0倍・自由入力）を変更できるようになりました。',
      '倍率を変更するとカロリーやPFCバランスなどの栄養素が自動で再計算されます。',
      '手動微調整や基準値（1.0倍）への復元にも柔軟に対応しています。',
    ],
    en: [
      'Added portion multiplier options (0.5x to 2.0x & custom) when editing existing meal logs.',
      'Nutritional values such as calories and macros automatically recalculate based on the selected multiplier.',
      'Supports manual adjustments and accurate restoration to the base serving (1.0x).',
    ],
  },
};
