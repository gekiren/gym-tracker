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
  version: '1.8.69',
  title: {
    ja: 'セット追加時のRPE引き継ぎ対応',
    en: 'Copy RPE on Adding Sets',
  },
  notes: {
    ja: [
      'ワークアウト中およびルーティン作成時に新しいセットを追加した際、前回の重量や回数に加えて、直前セットのRPE（自覚的運動強度）も自動的に引き継いで入力されるように改善しました。',
    ],
    en: [
      'When adding a new set during a workout or routine creation, the RPE (Rate of Perceived Exertion) from the previous set is now automatically copied along with weight and reps.',
    ],
  },
};
