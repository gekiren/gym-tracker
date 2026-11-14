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
  version: '2.3.34',
  title: {
    ja: '✨ ワークアウトトップ画面のカード化と操作性改善',
    en: '✨ Workout Home Card Redesign & Usability Improvements',
  },
  notes: {
    ja: [
      'ワークアウト画面のルーティン一覧をダッシュボードと統一されたカードデザインへ刷新し、背景テーマ切り替えにも即時追従するよう改善しました。',
      '戻るボタンや「すべて見る」のタップ領域を広げ、ルーティン未登録時には作成画面へすぐ進める導線を追加しました。',
    ],
    en: [
      'Redesigned the workout screen\'s routine list into unified cards matching the dashboard with instant dark/pure-black theme support.',
      'Expanded touch targets for navigation controls and added a quick "Create Routine" button when no routines exist.',
    ],
  },
};
