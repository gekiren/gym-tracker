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
  version: '2.3.10',
  title: {
    ja: '🏷️ 24時間管理：タグとピースの一体化管理',
    en: '🏷️ 24h Timeline: Unified Tags & Pieces Management',
  },
  notes: {
    ja: [
      '詳細リストのタグとタイムラインの活動ピースを1つのマスターデータとして完全統合しました。',
      'タグ・ピース設定画面から、活動名・アイコン・分類（投資/維持/漂流）・サイズ・所要時間を自由に編集・追加・並び替えできるようになりました。',
      'タイムライン、詳細リスト、記録用ボトムシートの全画面で設定したピースとタグがリアルタイムに連動します。',
    ],
    en: [
      'Unified detailed list tags and timeline activity pieces into a single synchronized master dataset.',
      'Easily customize, add, and reorder activities with custom icons, categories (invest/maintain/drift), piece sizes, and default durations.',
      'Changes instantly sync across the timeline palette, detailed list tags, and quick-add sheets.',
    ],
  },
};
