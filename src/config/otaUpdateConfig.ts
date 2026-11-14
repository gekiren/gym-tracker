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
  version: '2.3.40',
  title: {
    ja: '🎯 ルーティン作成でのRPE入力に対応',
    en: '🎯 RPE Input in Routine Builder',
  },
  notes: {
    ja: [
      'ルーティン作成・編集画面で、セットごとに RPE（主観的運動強度）を設定できるようになりました。',
      'ルーティンからワークアウトを開始した際も、設定した RPE が各セットに引き継がれます。',
    ],
    en: [
      'You can now set RPE (Rate of Perceived Exertion) for each set in the routine builder and editor.',
      'Configured RPE values are carried over to sets when starting a workout from a routine.',
    ],
  },
};
