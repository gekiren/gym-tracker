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
  version: '1.1.81', // OTA識別用のバージョン文字列
  title: {
    ja: '開発者メニュー: MDワークアウト復元機能の追加',
    en: 'Developer Menu: Markdown Workout Importer Added',
  },
  notes: {
    ja: [
      '開発者メニュー内にメンテナンス用機能「Markdownワークアウト記録のインポート・データ復元機能（ファイル選択/テキスト貼付）」を追加しました。',
    ],
    en: [
      'Added Markdown workout importing and data restoration tool (file picker / text paste) in Developer Menu.',
    ]
  }
};




