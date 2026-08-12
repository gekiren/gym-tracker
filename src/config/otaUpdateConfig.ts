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
  version: '1.8.19',
  title: {
    ja: '栄養管理のBMR/TDEE計算設定の保存機能追加',
    en: 'Save BMR/TDEE Profile Settings in Nutrition',
  },
  notes: {
    ja: [
      '🥗 栄養管理のBMR/TDEE計算電卓において、入力した性別・年齢・身長・体重が自動保存されるようになりました。',
    ],
    en: [
      '🥗 Gender, age, height, and weight entered in the BMR/TDEE calculator are now saved automatically.',
    ],
  },
};

