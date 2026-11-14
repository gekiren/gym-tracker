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
  version: '2.3.35',
  title: {
    ja: '✨ トレーニング中画面の操作性・デザイン改善',
    en: '✨ Active Workout UI & Usability Improvements',
  },
  notes: {
    ja: [
      'トレーニング中の種目カードや各種モーダル（プレート計算・スタンス選択・確認ダイアログ等）を統一デザインへ刷新し、背景テーマへの即時追従に対応しました。',
      '入力欄のスリムな操作性を保ったまま、ヘッダーアイコンやチェックボタン等のタップ領域を広げ、誤タップしにくく改善しました。',
    ],
    en: [
      'Unified the design and instant dark/pure-black theme support across active workout cards, timers, and modals (Plate Calculator, Stance Picker, Confirmation Dialog).',
      'Expanded touch targets for header icons, check buttons, and modal controls while preserving the compact set input layout.',
    ],
  },
};
