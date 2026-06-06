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
  version: '1.0.8-ota10', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'プロモーションコード入力機能にて、最新バージョンでのみコード入力が可能である旨、およびバージョン検証が行われる旨の注意書きを追加しました。'
    ],
    en: [
      'Added a notice to the promotion code entry screen indicating that codes can only be entered on the latest version and version checks are performed.'
    ]
  }
};
