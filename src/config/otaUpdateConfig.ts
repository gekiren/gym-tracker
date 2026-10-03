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
  version: '2.3.4',
  title: {
    ja: '🧩 24時間管理 タブ分割による操作性改善 ＆ 予定計算バグ修正',
    en: '🧩 24h Timeline Segment Tabs & Plan Calculation Fix',
  },
  notes: {
    ja: [
      '画面上部に「タイムライン」と「サークル・集計」のセグメントタブを新設し、画面全体のスクロールの引っかかりを解消しました。',
      'タイムラインで予定ピースを配置した際に、予定総時間が「NaN分」と表示されてしまう集計バグを修正しました。',
      '活動別の予定・実績差異や遵守率が即座に正しく集計・表示されます。',
    ],
    en: [
      'Added segment tabs for Timeline and Circle Summary, resolving scroll interception issues.',
      'Fixed an issue where total planned time showed as NaN when placing pieces on the timeline.',
      'Plan vs. actual breakdown and adherence rates now update accurately in real time.',
    ],
  },
};
