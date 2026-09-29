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
  version: '2.3.0',
  title: {
    ja: '📅 24時間管理 Googleカレンダー連携',
    en: '📅 24h Management Google Calendar Sync',
  },
  notes: {
    ja: [
      '24時間管理とGoogleカレンダーの双方向連動機能を追加しました。',
      'カレンダーの予定自動取り込み、および活動実績の自動書き出しに対応。',
      'アプリ設定の「Googleカレンダー連携」から双方向自動同期の設定を行えます。',
    ],
    en: [
      'Added two-way sync between 24-hour management and Google Calendar.',
      'Supports auto-importing plans and auto-exporting recorded activity logs.',
      'Configure automatic sync settings via "Google Calendar Sync" in app settings.',
    ],
  },
};
