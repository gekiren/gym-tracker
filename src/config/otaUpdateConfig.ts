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
  version: '2.1.3',
  title: {
    ja: '🛠️ ワークアウトセット入力の操作性改善・不具合修正',
    en: '🛠️ Workout Set Input Fixes & Usability Improvements',
  },
  notes: {
    ja: [
      'RPE入力で「10」と入力した際に0に置き換わってしまう不具合を修正しました。',
      '重量やレップ数の入力時に、1文字目が消えて上書きされてしまう現象を解消し、スムーズに2桁以上の数値を入力できるよう改善しました。',
      '入力枠フォーカス時に数字の上下が見切れてしまう表示不具合を修正しました。',
    ],
    en: [
      'Fixed an issue where logging RPE as 10 would inadvertently reset to 0.',
      'Resolved 2-digit input overwrite bugs for weight and reps, ensuring seamless multi-digit entry.',
      'Fixed vertical text clipping inside set input fields while focused.',
    ],
  },
};
