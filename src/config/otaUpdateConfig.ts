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
  version: '1.0.47', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウトの保存処理およびカスタムルーティンの登録処理にデータベース・トランザクションを導入し、データ保存中のエラーやアプリ終了時のデータ欠損を防ぐ仕組みを追加しました。'
    ],
    en: [
      'Introduced database transactions in workout saving and custom routine creation to prevent data corruption and loss during unexpected interruptions.'
    ]
  }
};
