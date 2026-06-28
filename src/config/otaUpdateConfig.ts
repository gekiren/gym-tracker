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
    ja: 'ルーティン開始時のセット数反映の修正',
    en: 'Fix Routine Set Count on Start',
  },
  notes: {
    ja: [
      '「常に1セットのみ追加」をオンにしている状態でも、ルーティンからワークアウトを開始した場合は、ルーティンに設定されている正しいセット数や重量がロードされるよう修正しました。',
    ],
    en: [
      'Fixed an issue where starting a workout from a routine loaded only one set when "Always Add One Set" was enabled. Now it correctly loads all sets configured in the routine.',
    ]
  }
};
