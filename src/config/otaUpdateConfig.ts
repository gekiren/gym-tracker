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
  version: '1.1.6', // OTA識別用のバージョン文字列
  title: {
    ja: '入力欄の操作性向上',
    en: 'Workout Input Improvements',
  },
  notes: {
    ja: [
      '重量・回数・RPEの入力欄をタップした際、既存の数値が自動選択（ハイライト）され、削除の手間なく上書きできるようにしました。',
      '数値入力せずにフォーカスアウトした場合は、変更前の元の数値を自動で復帰・維持するようにしました。',
    ],
    en: [
      'Auto-select text when focusing on weight, reps, or RPE input fields for faster editing.',
      'Automatically restore and maintain the previous value if the input field is left empty upon blurring.',
    ]
  }
};
