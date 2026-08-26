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
  version: '2.0.11',
  title: {
    ja: '🎯 習慣カウンターの目標値設定 ＆ 管理画面レイアウト改善',
    en: '🎯 Habit Target Setting & Manage Modal Layout Improvements',
  },
  notes: {
    ja: [
      '習慣カウンターで1日の目標回数が設定できるようになりました。習慣管理モーダルを2行レイアウトに刷新し、習慣名称が全幅でくっきり見やすくなりました。',
    ],
    en: [
      'Added daily target settings for habits. Redesigned manage modal into 2-row layout to make habit names fully visible.',
    ],
  },
};
