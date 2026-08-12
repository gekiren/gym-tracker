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
  version: '1.8.4',
  title: {
    ja: 'スワイプ数値入力の感度調整',
    en: 'Improved Swipe Input Sensitivity',
  },
  notes: {
    ja: [
      '✨ 横スワイプでの数値変動の感度を調整し、スクロール時などの意図しない誤変動を軽減しました。',
    ],
    en: [
      '✨ Adjusted swipe input sensitivity to prevent accidental value changes during scroll.',
    ],
  },
};

