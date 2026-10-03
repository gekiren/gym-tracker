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
  version: '2.3.15',
  title: {
    ja: '🌙 24時間管理：0時またぎ（睡眠等）のスマート連動対応',
    en: '🌙 24h Timeline: Smart Midnight-Crossing Support',
  },
  notes: {
    ja: [
      '睡眠など0時をまたぐスケジュール（例: 23:00〜翌07:00）の自動分割＆スマート連動管理に対応しました。',
      '翌朝までの時間を1回入力するだけで、当日と翌日のタイムラインに隙間なく美しく配置され、各日の集計も正確に反映されます。',
      'Googleカレンダーとの双方向連動にも対応し、カレンダー側には1本の美しい睡眠イベントとして連携されます。',
    ],
    en: [
      'Added smart midnight-crossing support: record overnight routines (e.g. 23:00 to 07:00) in one simple input.',
      'Automatically splits into linked blocks on today and tomorrow timelines with seamless 24h portfolio calculation.',
      'Full bidirectional synchronization with Google Calendar as unified overnight events.',
    ],
  },
};
