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
  version: '1.8.43',
  title: {
    ja: '設定タブおよびアプリ設定メニューのアクセス再構成',
    en: 'Settings Tab & App Settings Reorganization',
  },
  notes: {
    ja: [
      '⚙️ 筋トレ機能のヘッダー表記を「筋トレ」に、右下設定タブを「設定」に統一しました。',
      '📱 「アカウント情報」「Obsidian連携」「バックアップ・復元」「データ管理」をダッシュボードの「アプリ設定」画面内に集約・整理しました。',
    ],
    en: [
      '⚙️ Updated header title to Workout and right tab label to Settings.',
      '📱 Consolidated Account Info, Obsidian Sync, Backup, and Data Management into the App Settings menu.',
    ],
  },
};
