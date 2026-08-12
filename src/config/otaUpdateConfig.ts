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
  version: '1.8.13',
  title: {
    ja: 'キーボード入力時のフォーカス移動の改善',
    en: 'Improved Keyboard Focus Navigation',
  },
  notes: {
    ja: [
      '⌨️ ワークアウト入力画面にて、エンターキー（次へ）を押した際に重量から回数・RPEへスムーズにフォーカスが移動するよう改善しました。',
    ],
    en: [
      '⌨️ Improved keyboard navigation: Pressing Next/Enter in set inputs now seamlessly shifts focus to Reps and RPE.',
    ],
  },
};

