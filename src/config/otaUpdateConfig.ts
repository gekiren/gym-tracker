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
  version: '2.3.26',
  title: {
    ja: '📁 Obsidian連携の親フォルダ整理機能の追加',
    en: '📁 Added Parent Folder Organization for Obsidian Sync',
  },
  notes: {
    ja: [
      'Obsidian連携において、Vaultルート直下に各カテゴリフォルダが散らばるのを防ぐため、自動的に「TreNote」親フォルダを作成して配下に整理して出力するようになりました。',
      '設定画面の「カテゴリ別保存先フォルダ設定」にて、親フォルダ名を自由に変更・指定（空欄でVault直下保存も可能）できるようになりました。',
    ],
    en: [
      'Obsidian export now automatically creates a parent folder (default: TreNote) to keep category folders organized.',
      'You can now customize the parent folder name or leave it blank in the Obsidian settings.',
    ],
  },
};
