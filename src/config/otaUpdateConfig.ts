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
  version: '2.3.54',
  title: {
    ja: '📊 種目詳細のスタンス別PR・グラフ表示に対応',
    en: '📊 Stance-Based PR Accordions & Charts',
  },
  notes: {
    ja: [
      '種目詳細の自己ベスト（PR）を「スタンスなし」および各スタンスごとにアコーディオンで開閉できるようになりました。',
      '種目詳細の推移グラフおよびPR推移モーダルで、スタンスごとのデータ表示に対応しました。',
    ],
    en: [
      'Added per-stance accordions (including "No Stance") to toggle PR visibility on Exercise Details.',
      'Added stance filtering to Exercise Detail charts and stance labels to the PR progression modal.',
    ],
  },
};
