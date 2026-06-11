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
  version: '1.0.31', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '経過時間タイマーをヘッダーのRM計算ボタンの左隣へ移動',
      'ワークアウトメモと全体AIトレーナーボタンを画面上部にスクロールせず固定表示するように変更'
    ],
    en: [
      'Relocated elapsed timer to the left of the RM calculator button in the header',
      'Fixed workout notes and overall AI coach button at the top of the screen (sticky display)'
    ]
  }
};
