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
  version: '1.8.26',
  title: {
    ja: '栄養管理画面の表示・レイアウト調整',
    en: 'Nutrition Management Screen UI Adjustments',
  },
  notes: {
    ja: [
      '✨ 栄養摂取進捗グリッドの表示順を調整し、タンパク質を1行表示、脂質・炭水化物、塩分・食物繊維をそれぞれ2列で並列表示するように改善しました。',
      '🧹 栄養管理画面のタイトルおよび項目見出しから不要な絵文字を削除し、デザインを簡素化しました。',
    ],
    en: [
      '✨ Improved nutrient progress layout to show protein in a full-width row, and paired fat/carbs and sodium/fiber into two-column rows.',
      '🧹 Simplified UI by removing emojis from titles and header labels in the nutrition section.',
    ],
  },
};

