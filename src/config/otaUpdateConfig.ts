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
  version: '1.0.14-ota1', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'ワークアウト完了画面にSNSシェア機能（3種のデザインから選択可能）を追加しました。持ち上げた重量を「軽自動車」や「ゾウ」に面白換算してシェアできます！',
      '完了画面の起動および動作の安定性を向上させました（クラッシュ防止の改善）。'
    ],
    en: [
      'Added SNS sharing functionality to the workout completion screen with 3 design options. You can now share your lifted weight converted into cars or elephants!',
      'Improved stability and resolved loading issues on the workout completion screen.'
    ]
  }
};
