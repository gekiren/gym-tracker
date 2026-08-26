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
  version: '2.0.10',
  title: {
    ja: '🎯 習慣カウンターに目標値（目標回数）設定機能を追加',
    en: '🎯 Added Target Goal Setting to Habit Counter',
  },
  notes: {
    ja: [
      '習慣カウンターで1日の目標回数が設定できるようになりました。目標達成度（進捗バー・達成チェックマーク）がひと目で確認できます。',
    ],
    en: [
      'You can now set daily targets in the Habit Counter, with visual progress bars and completion checkmarks.',
    ],
  },
};
