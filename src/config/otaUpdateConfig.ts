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
  version: '1.8.91',
  title: {
    ja: '⭐ AI食事・栄養成分表示ラベルの画像認識精度向上',
    en: '⭐ Improved Nutrition Label & Packaging Image Recognition',
  },
  notes: {
    ja: [
      '食品パッケージ裏面の栄養成分表示表や商品ラベルの読み取り精度を大幅に向上させました。',
    ],
    en: [
      'Significantly improved recognition accuracy for nutrition fact labels and product packaging.',
    ],
  },
};
