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
  version: '1.1.90', // OTA識別用のバージョン文字列
  title: {
    ja: 'AI Coach画面の表示最適化',
    en: 'AI Coach Display Optimization',
  },
  notes: {
    ja: [
      'AI Coach モード切り替え時（クイック / 思考）のラベル表示崩れを修正しました。',
    ],
    en: [
      'Fixed display label issue when toggling AI Coach modes (Quick / Thinking).',
    ],
  },
};




