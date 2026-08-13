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
  version: '1.8.46',
  title: {
    ja: 'アプリ設定に「機能管理」ページを追加',
    en: 'Added Feature Management Page in Settings',
  },
  notes: {
    ja: [
      '⚙️ アプリ設定に「機能管理」ページを新設しました。',
      '🎛️ 「筋トレ」「水分管理」「栄養＆食事管理」「24時間管理」「ルーティン管理」の表示/非表示と、ダッシュボードでの表示順を変更できるようになりました。',
    ],
    en: [
      '⚙️ Added a new "Feature Management" page in App Settings.',
      '🎛️ You can now toggle visibility and reorder dashboard features (Workout, Water, Nutrition, 24h Log, Routine).',
    ],
  },
};
