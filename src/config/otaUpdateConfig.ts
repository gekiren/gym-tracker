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
  version: '1.1.83', // OTA識別用のバージョン文字列
  title: {
    ja: 'ダッシュボードからの直接設定アクセス追加',
    en: 'Direct Settings Access Added to Dashboard',
  },
  notes: {
    ja: [
      'ダッシュボード画面から直接「アプリ設定」へ移動できるアクセスカードを追加しました。',
      '各種連携機能やバックアップ、タイマー設定などの管理画面にスムーズにアクセスできます。',
    ],
    en: [
      'Added a direct Settings access card to the main dashboard.',
      'Easily manage AI coach, data export, backup, and app preferences in one place.',
    ]
  }
};




