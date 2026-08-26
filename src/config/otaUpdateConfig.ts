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
  version: '2.0.20',
  title: {
    ja: '📳 ルーティン管理のタイマーバイブレーション通知対応',
    en: '📳 Timer Vibration Notification in Routine Tracker',
  },
  notes: {
    ja: [
      'ルーティン実行時のタイマー終了時および残り3/2/1秒前のバイブレーション通知に対応しました。設定はルーティンごとにON/OFFを切り替えられます。',
    ],
    en: [
      'Added countdown vibration alerts (3/2/1 sec before end and at 0 sec) for routine tracker tasks. Can be toggled per routine.',
    ],
  },
};
