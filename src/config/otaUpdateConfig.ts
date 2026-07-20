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
  version: '1.1.64', // OTA識別用のバージョン文字列
  title: {
    ja: 'ウィジェット記録の即時反映・打刻仕様の改善',
    en: 'Widget Instant Data Sync & Lifelog Improvements',
  },
  notes: {
    ja: [
      'アプリが起動中（バックグラウンド含む）であっても、ウィジェットから記録したデータが即座にアプリ画面へ反映されるように改善しました。',
      '時間管理ウィジェットで開始ボタンの連続タップや終了ボタンの単独タップ時にも正常に打刻が記録されるように改善しました。',
    ],
    en: [
      'Improved data recorded from home screen widgets to instantly sync and reflect when app comes to foreground.',
      'Enhanced time management widget to correctly record timestamps when start/end buttons are tapped independently.',
    ]
  }
};
