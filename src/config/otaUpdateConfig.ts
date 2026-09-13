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
  version: '2.2.9',
  title: {
    ja: '⚖️ 体組成 Markdown 貼り付け一括取込機能',
    en: '⚖️ Body Composition Markdown Batch Import',
  },
  notes: {
    ja: [
      'ObsidianのデイリーノートやInBody履歴テーブルから、Markdownを貼り付けて当日・複数日分の体組成データをまとめて取り込めるようになりました。',
      'テーブル形式・箇条書き・見出し形式を自動判別し、体重・体脂肪率・骨格筋量・LBMなどを安全にマージ保存できます。',
    ],
    en: [
      'Added Markdown batch import for body composition data from Obsidian daily notes and InBody tables.',
      'Automatically parses tables, lists, and sections to safely import weight, body fat, muscle mass, and LBM across single or multiple dates.',
    ],
  },
};
