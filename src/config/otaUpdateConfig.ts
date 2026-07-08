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
  version: '1.1.25', // OTA識別用のバージョン文字列
  title: {
    ja: 'クイック追加機能の拡張（登録数増加とカフェイン対応）',
    en: 'Expanded Quick Add Feature (More Slots & Caffeine Support)',
  },
  notes: {
    ja: [
      'クイック追加ボタンの登録枠を3個から6個に増やしました。',
      'クイック追加ボタンに水分量だけでなく、カフェイン量も同時に登録できるようにしました。',
      '登録データ構造の変更に伴い、設定データは自動的に移行されます。',
    ],
    en: [
      'Increased the number of quick add button slots from 3 to 6.',
      'You can now assign both water and caffeine amount to each quick add button.',
      'Existing preset settings will be automatically migrated to the new data format.',
    ]
  }
};
