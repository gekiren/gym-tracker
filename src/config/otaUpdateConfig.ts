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
  version: '2.2.15',
  title: {
    ja: '🛠️ データベース起動エラーの修正',
    en: '🛠️ Fixed Database Startup Error',
  },
  notes: {
    ja: [
      '一部の端末環境において、起動時にデータベースエラーが発生してアプリが開けなくなる不具合を修正しました。',
      '献立プリセット機能の追加に伴うデータベース初期化処理の安定性を向上させました。',
    ],
    en: [
      'Fixed an issue where a database error prevented the app from opening on startup in certain environments.',
      'Improved database initialization stability associated with the meal presets feature.',
    ],
  },
};
