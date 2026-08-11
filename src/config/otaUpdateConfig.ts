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
  version: '1.6.5',
  title: {
    ja: 'ヘッダーの日付表示＆カレンダーボタンデザイン改善',
    en: 'Improved Header Date Selector & Calendar Button',
  },
  notes: {
    ja: [
      '📅 カレンダーボタンの押しやすさ向上: 日付表示とカレンダーアイコンの間隔を広げ、視認性の高いボタンデザインに変更しました',
    ],
    en: [
      '📅 Better Calendar Button: Increased spacing between date text and icon, and updated to a rounded accent button for easier tapping',
    ],
  },
};
