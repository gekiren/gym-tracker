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
  version: '1.1.72', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian ライフログ同期ロジックの抜本改善',
    en: 'Overhauled Obsidian Lifelog Sync Logic',
  },
  notes: {
    ja: [
      'Obsidian への自動連携機能において、DB内の不揃いな日付形式を完全に正規化するフィルタリングロジックを導入し、水分補給量・時間管理・習慣が100%確実にノートへ出力されるよう不具合を抜本修正しました。',
    ],
    en: [
      'Overhauled date filtering for Obsidian export, ensuring hydration, caffeine, time logs, and habits are 100% reliably exported regardless of raw DB date formats.',
    ]
  }
};




