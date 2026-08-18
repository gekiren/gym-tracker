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
  version: '1.8.77',
  title: {
    ja: 'オートファジータイマーの表示改善',
    en: 'Autophagy Timer Display Improvement',
  },
  notes: {
    ja: [
      'オートファジータイマーが当日のみ表示されるよう改善し、過去日での誤表示を防止しました。',
    ],
    en: [
      'The autophagy timer is now only displayed for the current day, preventing inaccurate display on past dates.',
    ],
  },
};
