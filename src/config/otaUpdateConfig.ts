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
  version: '1.1.82', // OTA識別用のバージョン文字列
  title: {
    ja: '設定画面の個別ページ化・専用メニュー機能の導入',
    en: 'Settings Redesign: Individual Pages & Navigation Added',
  },
  notes: {
    ja: [
      '設定画面を個別ページ（専用サブ画面）形式へリニューアルしました。',
      'Gemini連携、データ出力(Markdown)、バックアップ・復元、Obsidian自動連携、アカウント種類、アプリ情報、データ管理の各個別画面を追加しました。',
    ],
    en: [
      'Redesigned settings screen into individual dedicated pages.',
      'Added dedicated pages for Gemini AI Coach, Data Export, Backup & Restore, Obsidian Sync, Account Plan, App Info, and Data Management.',
    ]
  }
};




