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
  version: '1.8.12',
  title: {
    ja: 'ワークアウト確認ポップアップのデザイン刷新',
    en: 'Workout Confirmation Popup UI Refresh',
  },
  notes: {
    ja: [
      '✨ ワークアウトの中断・完了確認ポップアップをアプリ全体のダークテーマに合わせたモダンなデザインに刷新しました。',
    ],
    en: [
      '✨ Redesigned the workout pause and finish confirmation popups to match the dark theme.',
    ],
  },
};

