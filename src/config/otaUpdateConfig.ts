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
  version: '1.1.62', // OTA識別用のバージョン文字列
  title: {
    ja: '24時間管理の機能改善（同時進行モード時のタグ選択）',
    en: '24-hour Lifelog Enhanced (Tags in Simultaneous Mode)',
  },
  notes: {
    ja: [
      '同時進行モードのときにも活動タグをタップで選択・入力できるようになりました。',
      '入力中の行がハイライト（紫枠と●表示）され、どのタスクにタグが入力されるかが分かりやすくなりました。',
    ],
    en: [
      'You can now tap and select activity tags even in simultaneous progress mode.',
      'The row being edited is now highlighted with a border and indicator, making it clear where the tag is entered.',
    ]
  }
};
