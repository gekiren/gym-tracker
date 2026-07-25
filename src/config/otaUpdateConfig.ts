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
  version: '1.1.69', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian連携の水分量・ライフログ出力拡張',
    en: 'Expanded Obsidian Sync for Hydration & Lifelogs',
  },
  notes: {
    ja: [
      'Obsidian への自動連携機能において、トレーニング記録に加えて水分補給量・カフェイン量や時間管理・習慣カウンターなどのライフログもデイリーノートに統合してエクスポートされるよう改善しました。',
    ],
    en: [
      'Improved Obsidian integration to export hydration, caffeine, time logs, and habits alongside workout logs into daily notes.',
    ]
  }
};

