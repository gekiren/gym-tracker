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
  version: '1.0.49', // OTA識別用のバージョン文字列
  title: {
    ja: 'アップデートのお知らせ',
    en: 'Update Information',
  },
  notes: {
    ja: [
      'タイマー終了時の通知において、他の通知に影響を与えず対象のタイマー通知のみをピンポイントで消去（個別キャンセル）するよう改善しました。',
      'バックグラウンド移行時の通知遅延（20〜30秒遅れ）を解消し、タイマーが正確なタイミングで通知されるようトリガーの仕組みを最適化しました。'
    ],
    en: [
      'Improved rest timer notification to cancel only the specific timer notification, preventing other notifications from being cleared.',
      'Optimized the notification trigger mechanism to resolve background notification delays (20-30s delay) and ensure accurate timing.'
    ]
  }
};
