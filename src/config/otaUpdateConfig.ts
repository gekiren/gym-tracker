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
  version: '2.3.68',
  title: {
    ja: '📅 Googleカレンダー連携の2重表示防止オプションを追加',
    en: '📅 Added Duplicate Prevention Option for Google Calendar Sync',
  },
  notes: {
    ja: [
      'Googleカレンダーから取り込んだ予定と同じ内容・時間帯の実績を書き出さないようにする設定（2重表示防止）を、Googleカレンダー連携設定に追加しました。',
    ],
    en: [
      'Added an option in Google Calendar Sync settings to skip exporting activity logs that duplicate existing Google Calendar plans.',
    ],
  },
};
