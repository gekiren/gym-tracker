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
  version: '1.8.1',
  title: {
    ja: 'アップデート自動即時反映機能の追加',
    en: 'Auto App Reload & Immediate Update',
  },
  notes: {
    ja: [
      '⚡ 更新通知ポップアップの「今すぐ再起動して反映」を押すと、アプリが自動再起動され即時に最新機能が反映されるようになりました。',
    ],
    en: [
      '⚡ Pressing "Restart App & Apply" automatically restarts the app to immediately apply new updates.',
    ],
  },
};

