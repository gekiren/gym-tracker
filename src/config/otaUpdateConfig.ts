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
  version: '2.1.1',
  title: {
    ja: '✨ 種目詳細画面の再表示不具合を修正',
    en: '✨ Fix navigation issue reopening exercise details',
  },
  notes: {
    ja: [
      '種目詳細画面から戻った後、同じ種目名を連続してタップしても詳細画面が開かない問題を修正しました。',
    ],
    en: [
      'Fixed an issue where reopening the same exercise details after returning was not responding.',
    ],
  },
};
