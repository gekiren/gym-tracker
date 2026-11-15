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
  version: '2.3.50',
  title: {
    ja: '📝 Obsidian連携：ワークアウト詳細の埋め込み表示に対応',
    en: '📝 Obsidian Sync: Embed Workout Details in Daily Logs',
  },
  notes: {
    ja: [
      'Obsidianの日次ログ（TreNote_YYYY-MM-DD.md）において、トレーニング欄にワークアウト詳細ファイルを直接埋め込み（![[...]]）で参照・展開表示できるようになりました。',
    ],
    en: [
      'Updated Obsidian daily logs (TreNote_YYYY-MM-DD.md) to directly embed detailed workout notes (![[...]]) instead of set count summaries.',
    ],
  },
};
