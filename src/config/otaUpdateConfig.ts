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
  version: '2.2.17',
  title: {
    ja: '🛠️ 献立セット一括記録の安定性向上',
    en: '🛠️ Improved Meal Preset Apply Stability',
  },
  notes: {
    ja: [
      '献立セットを一括記録するプレビュー画面を開く際に、一部の環境でエラー画面が表示されてしまう不具合を修正しました。',
      '画面描画処理の最適化を行い、献立セットの一括記録をよりスムーズに行えるようにしました。',
    ],
    en: [
      'Fixed an issue where an error screen was displayed when opening the meal preset apply preview modal on certain devices.',
      'Optimized rendering logic to ensure smooth meal preset recording.',
    ],
  },
};
