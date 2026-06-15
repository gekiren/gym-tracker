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
  version: '1.0.61', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト中のオリジナル種目作成画面にも、キーボード遮蔽対策とスクロールガイド表示を反映しました。'
    ],
    en: [
      'Applied keyboard avoidance and scroll guidance UI improvements to the custom exercise creation screen during active workouts.'
    ]
  }
};
