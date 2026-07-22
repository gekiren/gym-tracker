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
  version: '1.1.68', // OTA識別用のバージョン文字列
  title: {
    ja: 'Obsidian Vault 自動連携機能の追加',
    en: 'Added Obsidian Vault Auto-Sync Integration',
  },
  notes: {
    ja: [
      'マイページから Obsidian Vault フォルダを指定し、筋トレ記録やライフログ（水分・時間管理・習慣）を自動的に Markdown ファイルへ蓄積・同期できる機能を追加しました。',
    ],
    en: [
      'Added the ability to select your Obsidian Vault folder from Profile settings and automatically sync workout and lifelog data into Markdown files.',
    ]
  }
};
