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
  version: '1.1.47', // OTA識別用のバージョン文字列
  title: {
    ja: '表示項目の整理と変更',
    en: 'Clean up and update display items',
  },
  notes: {
    ja: [
      'ルーティン管理画面の「データは端末内に保存されます」の表示を削除しました。',
      'ダッシュボードの「ルーティン管理」カードに、今日完了したルーティン名を表示するように変更しました。',
    ],
    en: [
      'Removed the offline storage message in the Routine Tracker.',
      'Updated the Dashboard Routine card to display the names of completed routines.',
    ]
  }
};
