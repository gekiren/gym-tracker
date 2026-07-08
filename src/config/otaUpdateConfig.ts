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
  version: '1.1.18', // OTA識別用のバージョン文字列
  title: {
    ja: '水分補給画面のレイアウト改善',
    en: 'Water Intake Layout Improvements',
  },
  notes: {
    ja: [
      '水分実績が2000mlを超えた際の円と文字の被りを解消するため、表示円のサイズを拡大しました。',
      'カフェイン入力欄の文字サイズを下げて見切れを解消し、入力欄の上にラベルを追加しました。',
    ],
    en: [
      'Enlarged the progress circle size to prevent overlapping with text when intake exceeds 2000ml.',
      'Adjusted caffeine input font size to prevent layout cut-off and added a label above the field.',
    ]
  }
};
