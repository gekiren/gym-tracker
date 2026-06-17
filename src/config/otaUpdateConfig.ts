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
  version: '1.0.74', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ルーティン編集画面のレイアウト構造をKeyboardAwareScrollViewに刷新し、キーボード立ち上げ時の黒い余白が発生する問題を根本修正しました。',
      'ステータスバー表示領域のインセット計算処理を最適化しました。'
    ],
    en: [
      'Replaced the layout structure with KeyboardAwareScrollView on the routine editor screen to resolve the black layout gap issue.',
      'Optimized status bar inset calculations.'
    ]
  }
};
