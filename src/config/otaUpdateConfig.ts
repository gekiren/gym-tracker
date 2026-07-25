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
  version: '1.1.70', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian連携の水分量・ライフログ出力修正',
    en: 'Fixed Obsidian Sync for Hydration & Lifelogs',
  },
  notes: {
    ja: [
      'Obsidian への連携機能において、日付フォーマットおよびデータ取得クエリを修正し、水分補給量・カフェイン量・時間管理・習慣が確実にデイリーノートへ出力されるよう不具合を解消しました。',
    ],
    en: [
      'Fixed an issue in Obsidian sync where hydration, caffeine, time logs, and habits were not correctly exported to daily notes due to date formatting.',
    ]
  }
};


