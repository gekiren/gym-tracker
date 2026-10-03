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
  version: '2.3.9',
  title: {
    ja: '🇯🇵 24時間管理：日本の祝日連携とスケジュール設定',
    en: '🇯🇵 24h Timeline: Holiday Sync & Schedule Settings',
  },
  notes: {
    ja: [
      '端末/Googleカレンダーから日本の祝日データを自動取得し、タイムラインに祝日名を表示する機能を追加しました。',
      '祝日を日曜日（休日スケジュール）として自動適用するかどうかを、デフォルト設定モーダルから自由に切り替えられるようになりました。',
    ],
    en: [
      'Added Japanese national holidays sync from device calendar with holiday badges on the timeline.',
      'You can now toggle whether to treat national holidays as Sundays (holiday schedule) directly from settings.',
    ],
  },
};
