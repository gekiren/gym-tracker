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
  version: '1.8.74',
  title: {
    ja: '時間設定ホイールの無限ループ対応',
    en: 'Infinite Looping Time Wheels',
  },
  notes: {
    ja: [
      '時間設定モーダルの各ホイール（時・分の十の位・分の一の位）において、上下どちらにも途切れることなく無限にループしてスワイプ選択できるように改善しました。',
    ],
    en: [
      'Made the time picker wheels (hours, minute tens, minute ones) infinitely loopable in both directions.',
    ],
  },
};
