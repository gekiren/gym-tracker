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
  version: '1.8.30',
  title: {
    ja: 'ボタン明度・文字可読性・直近14日カード配色の細部調整',
    en: 'Fine-tuned Button Brightness, Text Legibility, and 14-Day Chart Colors',
  },
  notes: {
    ja: [
      '🎨 青・紫・各種アクションボタンの明度を落とし、ボタン内文字を優しいグレーに変更しました。',
      '✨ 習慣カウンターのカード上テキストの可読性をクッキリした白文字に復元しました。',
      '📈 「直近14日間のカロリー推移」カードの背景色を他カードと完全統一（漆黒トーン）に統一しました。',
    ],
    en: [
      '🎨 Darkened blue, purple, and action button styles; adjusted button texts to soft grey.',
      '✨ Restored high-contrast text readability on Habit Counter cards.',
      '📈 Unified 14-day calorie chart background colors to match pure black card styling.',
    ],
  },
};
