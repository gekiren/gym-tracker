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
  version: '1.1.5', // OTA識別用のバージョン文字列
  title: {
    ja: 'ルーティン開始の修正およびタイマーポップアップの非表示化',
    en: 'Routine Set Fix & Timer Popup Update',
  },
  notes: {
    ja: [
      '「常に1セットのみ追加」をオンにしている状態でも、ルーティンからワークアウトを開始した場合は、ルーティンに設定されている正しいセット数や重量がロードされるよう修正しました。',
      'タイマーの「ワークアウト再開」をタップした際に表示されていた、再開完了のアラートポップアップを非表示にしました。',
    ],
    en: [
      'Fixed an issue where starting a workout from a routine loaded only one set when "Always Add One Set" was enabled.',
      'Removed the confirmation alert popup when tapping resume workout from the timer.',
    ]
  }
};
