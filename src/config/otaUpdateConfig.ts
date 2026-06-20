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
  version: '1.0.95', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      '設定（プロフィール）画面のデータ管理に、誤って削除した初期種目やルーティンを個別に選択して復元できる機能を追加しました。'
    ],
    en: [
      'Added a feature to restore deleted default exercises and routines individually from the data management section in settings.'
    ]
  }
};
