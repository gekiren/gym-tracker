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
  version: '1.8.92',
  title: {
    ja: '⭐ Markdown一括取り込み画面での外部AI連携機能追加',
    en: '⭐ Added External AI Integration in Markdown Import',
  },
  notes: {
    ja: [
      'MD一括取り込み画面からワンタップでChatGPT等の外部AIを開けるアクセスボタンを追加しました。',
      '栄養目標設定画面で、アクセスする外部AIのURLを自由にカスタマイズ（ChatGPT/Claude/Gemini/Perplexity等）できるようになりました。',
    ],
    en: [
      'Added a quick access button in the Markdown Import screen to directly open external AI services like ChatGPT.',
      'You can now customize the target AI service URL (ChatGPT, Claude, Gemini, Perplexity, etc.) in the Nutrition Settings screen.',
    ],
  },
};
