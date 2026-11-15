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
  version: '2.3.45',
  title: {
    ja: '☁️ Googleドライブ AI双方向同期機能の追加',
    en: '☁️ Bidirectional Google Drive AI Sync',
  },
  notes: {
    ja: [
      'GoogleドライブとのAI双方向同期機能を追加しました（筋トレ・食事・体組成・24時間管理・ルーティン等の記録を随時アップロードし、外部AIエージェントからのアドバイス・メニュー・スケジュール提案を随時読み込み・反映できます）。',
      'バックアップ復元時にGoogleドライブ上の記録を誤上書きしない保護一時停止ガードを追加しました。',
    ],
    en: [
      'Added bidirectional Google Drive AI sync to continuously export logs (workouts, nutrition, body composition, 24h schedules, routines) and import trainer advice, workout menus, daily routines, and schedule proposals from external AI agents.',
      'Added restore-protection pause guard after .db backup restores to prevent overwriting newer records on Google Drive.',
    ],
  },
};
