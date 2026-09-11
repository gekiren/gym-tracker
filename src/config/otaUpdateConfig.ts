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
  version: '2.2.0',
  title: {
    ja: '🚀 本体 v2.2.0 リリース',
    en: '🚀 App v2.2.0 Release',
  },
  notes: {
    ja: [
      'トレッドミル種目で速度・傾斜の設定・記録に対応しました。',
      '食事ログ編集で食べた量の倍率変更機能を追加しました。',
      'AI写真栄養解析の撮影および通信安定性を向上させました。',
      'ワークアウト中の数値入力およびスワイプ操作性を改善しました。',
      'その他軽微な不具合修正とパフォーマンスを向上させました。',
    ],
    en: [
      'Added speed & incline tracking for treadmill exercises.',
      'Added portion multiplier to meal log editor.',
      'Enhanced AI photo nutrition analysis stability.',
      'Improved workout input and swipe responsiveness.',
      'Minor bug fixes and performance improvements.',
    ],
  },
};
