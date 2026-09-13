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
  version: '2.2.3',
  title: {
    ja: '🔤 ホーム画面の表示不具合（文字化け）の修正',
    en: '🔤 Fix Text Encoding Issue on Home Screen',
  },
  notes: {
    ja: [
      'ホーム画面の「栄養＆食事管理」カードで件数が文字化けして表示される不具合を修正しました。',
      'クラッシュレポート送信時の通知メッセージ表示を最適化しました。',
    ],
    en: [
      'Fixed a text encoding issue in the nutrition card count display on the home screen.',
      'Optimized notification messages for crash report submissions.',
    ],
  },
};
