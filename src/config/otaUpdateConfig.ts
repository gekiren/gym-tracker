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
  version: '1.1.3', // OTA識別用のバージョン文字列
  title: {
    ja: 'ワークアウト完了・履歴画面の英語ローカライズ修正',
    en: 'Workout Summary and History Localization Fixes',
  },
  notes: {
    ja: [
      '英語設定時に、ワークアウト完了画面および履歴詳細画面のSNSシェアモーダル、画像生成ローディング画面、および書き出し画像において一部日本語が表示される問題を修正しました。',
      '書き出し用コンポーネントを共通化し、表示の一貫性を向上させました。',
    ],
    en: [
      'Fixed issues where Japanese text remained in the SNS share modal, image generation loading screen, and exported share images on the Workout Complete and Workout History screens when set to English.',
      'Unified the share card component to improve UI consistency.',
    ]
  }
};
