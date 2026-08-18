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
  version: '1.8.83',
  title: {
    ja: '🧬 測定値入力の小数点入力対応（decimal-pad）',
    en: '🧬 Decimal Keyboard Support for Body Measurements',
  },
  notes: {
    ja: [
      '手首、足首、身長、首回り、ウエストなどの測定値入力欄で小数点が入力できるようキーボード設定を改善しました。',
    ],
    en: [
      'Enabled decimal keyboard input for wrist, ankle, height, neck, waist and circumference measurements.',
    ],
  },
};
