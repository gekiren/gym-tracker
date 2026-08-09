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
  version: '1.2.1', // OTA識別用のバージョン文字列
  title: {
    ja: 'ヘルスコネクト起動時・定時アクセスの追加',
    en: 'Health Connect Launch & Periodic Sync',
  },
  notes: {
    ja: [
      'ヘルスコネクトへのアプリ起動時・フォアグラウンド復帰時の自動アクセスに対応',
      'ヘルスコネクトへの定時自動アクセス機能（アクセス間隔設定）の追加',
      'ヘルスコネクト設定画面に自動アクセスの設定項目と最終アクセス日時表示を追加',
    ],
    en: [
      'Added automatic Health Connect sync on app launch and foreground resume.',
      'Added periodic Health Connect sync with customizable interval.',
      'Added auto-sync controls and last sync timestamp display in settings.',
    ],
  },
};




