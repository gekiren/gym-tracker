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
  version: '1.1.24', // OTA識別用のバージョン文字列
  title: {
    ja: '進捗円グラフの拡大と視認性の改善',
    en: 'Enlarged Progress Chart & UI Improvements',
  },
  notes: {
    ja: [
      '進捗円グラフ全体のサイズを270pxに拡大し、水およびカフェインの円グラフの半径を広げました。',
      '円グラフと中央のカフェイン摂取量テキストが重ならないように表示を調整しました。',
    ],
    en: [
      'Enlarged the overall size of the progress rings to 270px and expanded the radii.',
      'Adjusted layout to prevent overlap between the rings and the center caffeine text.',
    ]
  }
};
