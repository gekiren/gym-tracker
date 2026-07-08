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
  version: '1.1.20', // OTA識別用のバージョン文字列
  title: {
    ja: 'ダッシュボードの初期画面化とバグ修正',
    en: 'Dashboard as Initial Screen and Bug Fix',
  },
  notes: {
    ja: [
      'アプリ起動時の初期画面をダッシュボード画面に変更しました。',
      'ダッシュボード画面上部に表示されていた不要なヘッダー（INDEXと戻るボタン）を非表示にしました。',
    ],
    en: [
      'Configured the dashboard as the initial application screen on startup.',
      'Hidden the unnecessary default navigation header at the top of the dashboard screen.',
    ]
  }
};
