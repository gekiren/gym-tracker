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
  version: '2.3.69',
  title: {
    ja: '⚙️ 24時間管理の設定メニューからGoogleカレンダー連携設定を開けるように改善',
    en: '⚙️ Added Google Calendar Sync shortcut to 24h Management settings menu',
  },
  notes: {
    ja: [
      '24時間管理画面右上の歯車ボタンから「Googleカレンダー連携設定」と「タグ・ピース編集」を選択して開けるようにしました。',
    ],
    en: [
      'Added a menu to the 24h Management gear button so you can open either Google Calendar Sync settings or Tag & Piece Editor.',
    ],
  },
};
