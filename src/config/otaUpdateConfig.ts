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
  version: '1.1.74', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian 種目連携における未記録種目の自動スキップ機能',
    en: 'Obsidian Export: Skip Unrecorded Exercises',
  },
  notes: {
    ja: [
      'Obsidianの種目ノート連携において、トレーニング記録が1件も存在しない種目はノートを出力しないよう改善しました。',
    ],
    en: [
      'Improved Obsidian exercise export to skip creating notes for exercises with no recorded workout sets.',
    ]
  }
};




