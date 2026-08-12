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
  version: '1.8.18',
  title: {
    ja: '起動・データ読み込みの安定化修正',
    en: 'Startup & Data Loading Stabilization',
  },
  notes: {
    ja: [
      '⚡ 起動時のデータベース初期化処理を最適化し、画面読み込みが停止する問題を修正しました。',
      '✨ 過去に表示設定を変更済みのユーザー様で初回選択ポップアップが再表示される現象を修正しました。',
    ],
    en: [
      '⚡ Optimized startup database initialization to fix loading issue.',
      '✨ Fixed an issue where the initial style selection popup re-appeared for users who already had custom display settings.',
    ],
  },
};

