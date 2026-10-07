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
  version: '2.3.20',
  title: {
    ja: '📅 Googleカレンダー連携：予定削除・時間変更の完全同期対応',
    en: '📅 Calendar Sync: Real-time Deletion & Time Change Sync',
  },
  notes: {
    ja: [
      'トレノート側で予定や活動記録を削除した際に、Googleカレンダー側の該当イベントも自動的に綺麗に消去されるように同期ロジック（差分パージ）を改善しました。',
      '予定の時間を変更した際にも、変更前の古い時間のイベントがカレンダーに残って重複・増殖する問題を解消しました。',
    ],
    en: [
      'Improved calendar sync to automatically purge and delete events from Google Calendar when removed in TreNote.',
      'Resolved issue where changing event times caused duplicate old events to remain on Google Calendar.',
    ],
  },
};

