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
  version: '1.1.50', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティン管理画面の不具合修正',
    en: 'Routine management screen bug fixes',
  },
  notes: {
    ja: [
      '管理メニューボタンが反応しない不具合を修正しました。',
      '画面表示が崩れて最初から管理画面が表示されてしまう不具合を修正しました。',
    ],
    en: [
      'Fixed an issue where the management menu button was unresponsive.',
      'Fixed layout issues where the management screen was rendered incorrectly at launch.',
    ]
  }
};
