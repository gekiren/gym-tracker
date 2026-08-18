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
  version: '1.8.68',
  title: {
    ja: 'RPEスワイプ操作の使いやすさ向上',
    en: 'Improved RPE Swipe Usability',
  },
  notes: {
    ja: [
      'ワークアウト中のRPE（自覚的運動強度）スワイプ入力について、使用頻度の高い「0」および「6.0〜10.0（0.5刻み）」に限定し、素早くスムーズに数値を設定できるように改善しました。',
    ],
    en: [
      'Optimized the RPE swipe input during workouts to select between "0" and "6.0 to 10.0" (0.5 steps), skipping rarely used values for quicker adjustments.',
    ],
  },
};
