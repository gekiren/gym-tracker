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
  version: '1.1.54', // OTA識別用のバージョン文字列
  title: {
    ja: 'ワークアウト完了画面の改善',
    en: 'Workout Completion Screen Improvements',
  },
  notes: {
    ja: [
      '完了画面の「連続日数」を「過去1週間のワークアウト回数」の表示に変更しました。',
      'AIコーチの評価コメント用実績データにも、週次ワークアウト回数が引き渡されるように調整しました。',
    ],
    en: [
      'Changed "consecutive streak days" to "past 1-week workout count" on the workout completion screen.',
      'Updated the AI coach evaluation prompt to use the weekly workout frequency.',
    ]
  }
};
