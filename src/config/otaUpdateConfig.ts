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
  version: '1.1.7', // OTA識別用のバージョン文字列
  title: {
    ja: '初期画面とレイアウトの調整',
    en: 'Initial Screen & Layout Adjustments',
  },
  notes: {
    ja: [
      'アプリ起動時の初期画面をライフログダッシュボードに変更しました。',
      '筋トレ画面をタブバー内に戻し、以前と同様に下部ナビゲーションから履歴やプロフィールへ遷移できるようにしました。',
      '筋トレ画面からダッシュボードに戻るための「戻る」ボタンをヘッダー左側に追加しました。',
    ],
    en: [
      'Set the lifelog dashboard as the initial screen upon app startup.',
      'Moved the workout screen back to the tab bar for standard navigation to history and profile.',
      'Added a back button on the header of the workout screen to return to the dashboard.',
    ]
  }
};
