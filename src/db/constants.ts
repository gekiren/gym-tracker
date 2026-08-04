import { PresetRoutine } from './types';

export const PRESET_EXERCISES = [
  // Chest
  { name: 'ベンチプレス', group: '胸', equip: 'バーベル' },
  { name: 'インクラインベンチプレス', group: '胸', equip: 'バーベル' },
  { name: 'デクラインベンチプレス', group: '胸', equip: 'バーベル' },
  { name: 'ダンベルプレス', group: '胸', equip: 'ダンベル' },
  { name: 'インクラインダンベルプレス', group: '胸', equip: 'ダンベル' },
  { name: 'デクラインダンベルプレス', group: '胸', equip: 'ダンベル' },
  { name: 'ダンベルフライ', group: '胸', equip: 'ダンベル' },
  { name: 'インクラインダンベルフライ', group: '胸', equip: 'ダンベル' },
  { name: 'ケーブルクロスオーバー', group: '胸', equip: 'ケーブル' },
  { name: 'ペックデックフライ', group: '胸', equip: 'マシン' },
  { name: 'チェストプレス', group: '胸', equip: 'マシン' },
  { name: 'スミスマシン ベンチプレス', group: '胸', equip: 'スミスマシン' },
  { name: 'スミスマシン インクラインプレス', group: '胸', equip: 'スミスマシン' },
  { name: 'プッシュアップ', group: '胸', equip: '自重' },
  { name: 'ディップス', group: '胸', equip: '自重' },
  
  // Back
  { name: 'デッドリフト', group: '背中', equip: 'バーベル' },
  { name: 'ルーマニアンデッドリフト', group: '背中', equip: 'バーベル' },
  { name: 'ハーフデッドリフト', group: '背中', equip: 'バーベル' },
  { name: '懸垂', group: '背中', equip: '自重' },
  { name: 'ラットプルダウン', group: '背中', equip: 'ケーブル' },
  { name: 'ベントオーバーロウ', group: '背中', equip: 'バーベル' },
  { name: 'ペンレイロウ', group: '背中', equip: 'バーベル' },
  { name: 'ワンアームダンベルロウ', group: '背中', equip: 'ダンベル', is_unilateral: 1 },
  { name: 'シーテッドロウ', group: '背中', equip: 'ケーブル' },
  { name: 'Tバーロウ', group: '背中', equip: 'マシン' },
  { name: 'シュラッグ', group: '背中', equip: 'バーベル' },
  { name: 'ダンベルシュラッグ', group: '背中', equip: 'ダンベル' },
  { name: 'プルオーバー', group: '背中', equip: 'ダンベル' },
  { name: 'ストレートアームプルダウン', group: '背中', equip: 'ケーブル' },
  { name: 'バックエクステンション', group: '背中', equip: '自重' },
  
  // Shoulders
  { name: 'オーバーヘッドプレス', group: '肩', equip: 'バーベル' },
  { name: 'ダンベルショルダープレス', group: '肩', equip: 'ダンベル' },
  { name: 'アーノルドプレス', group: '肩', equip: 'ダンベル' },
  { name: 'スミスマシン ショルダープレス', group: '肩', equip: 'スミスマシン' },
  { name: 'マシンショルダープレス', group: '肩', equip: 'マシン' },
  { name: 'サイドレイズ', group: '肩', equip: 'ダンベル' },
  { name: 'ケーブルサイドレイズ', group: '肩', equip: 'ケーブル' },
  { name: 'フロントレイズ', group: '肩', equip: 'ダンベル' },
  { name: 'ケーブルフロントレイズ', group: '肩', equip: 'ケーブル' },
  { name: 'リアデルトフライ', group: '肩', equip: 'マシン' },
  { name: 'ダンベルリアレイズ', group: '肩', equip: 'ダンベル' },
  { name: 'フェイスプル', group: '肩', equip: 'ケーブル' },
  { name: 'アップライトロウ', group: '肩', equip: 'バーベル' },
  { name: 'ケーブルアップライトロウ', group: '肩', equip: 'ケーブル' },

  // Arms
  { name: 'バーベルカール', group: '腕', equip: 'バーベル' },
  { name: 'EZバーカール', group: '腕', equip: 'EZバー' },
  { name: 'ダンベルカール', group: '腕', equip: 'ダンベル' },
  { name: 'インクラインダンベルカール', group: '腕', equip: 'ダンベル' },
  { name: 'ハンマーカール', group: '腕', equip: 'ダンベル' },
  { name: 'プリーチャーカール', group: '腕', equip: 'EZバー' },
  { name: 'ケーブルカール', group: '腕', equip: 'ケーブル' },
  { name: 'コンセントレーションカール', group: '腕', equip: 'ダンベル', is_unilateral: 1 },
  { name: 'リバースカール', group: '腕', equip: 'EZバー' },
  { name: 'ナローグリップ ベンチプレス', group: '腕', equip: 'バーベル' },
  { name: 'トライセップスエクステンション', group: '腕', equip: 'EZバー' },
  { name: 'ダンベル トライセップスエクステンション', group: '腕', equip: 'ダンベル' },
  { name: 'ケーブルプッシュダウン', group: '腕', equip: 'ケーブル' },
  { name: 'スカルクラッシャー', group: '腕', equip: 'EZバー' },
  { name: 'キックバック', group: '腕', equip: 'ダンベル', is_unilateral: 1 },
  { name: 'リストカール', group: '腕', equip: 'ダンベル' },

  // Legs
  { name: 'スクワット', group: '脚', equip: 'バーベル' },
  { name: 'フロントスクワット', group: '脚', equip: 'バーベル' },
  { name: 'ゴブレットスクワット', group: '脚', equip: 'ダンベル' },
  { name: 'スミスマシン スクワット', group: '脚', equip: 'スミスマシン' },
  { name: 'レッグプレス', group: '脚', equip: 'マシン' },
  { name: 'ハックスクワット', group: '脚', equip: 'マシン' },
  { name: 'ブルガリアンスプリットスクワット', group: '脚', equip: 'ダンベル', is_unilateral: 1 },
  { name: 'ランジ', group: '脚', equip: 'ダンベル', is_unilateral: 1 },
  { name: 'ウォーキングランジ', group: '脚', equip: 'ダンベル', is_unilateral: 1 },
  { name: 'レッグエクステンション', group: '脚', equip: 'マシン' },
  { name: 'レッグカール', group: '脚', equip: 'マシン' },
  { name: 'シーテッドレッグカール', group: '脚', equip: 'マシン' },
  { name: 'スタンディングカーフレイズ', group: '脚', equip: 'マシン' },
  { name: 'シーテッドカーフレイズ', group: '脚', equip: 'マシン' },
  { name: 'ヒップスラスト', group: '脚', equip: 'バーベル' },
  { name: 'マシンアブダクター', group: '脚', equip: 'マシン' },
  { name: 'マシンアダクター', group: '脚', equip: 'マシン' },
  { name: 'グッドモーニング', group: '脚', equip: 'バーベル' },

  // Core
  { name: 'クランチ', group: '腹筋', equip: '自重' },
  { name: 'シットアップ', group: '腹筋', equip: '自重' },
  { name: 'プランク', group: '腹筋', equip: '自重' },
  { name: 'レッグレイズ', group: '腹筋', equip: '自重' },
  { name: 'ハンギングレッグレイズ', group: '腹筋', equip: '自重' },
  { name: 'アブローラー', group: '腹筋', equip: 'その他' },
  { name: 'ケーブルクランチ', group: '腹筋', equip: 'ケーブル' },
  { name: 'ロシアンツイスト', group: '腹筋', equip: 'ウエイト' },
  { name: 'マウンテンクライマー', group: '腹筋', equip: '自重' },
  { name: 'アブドミナルマシン', group: '腹筋', equip: 'マシン' },

  // Aerobic
  { name: 'エアロバイク', group: '有酸素', equip: 'マシン' },
  { name: 'トレッドミル', group: '有酸素', equip: 'マシン' },
  { name: 'ランニング', group: '有酸素', equip: '自重' },
  { name: 'ウォーキング', group: '有酸素', equip: '自重' },
  { name: 'ローイングマシン', group: '有酸素', equip: 'マシン' },
  { name: 'クロストレーナー', group: '有酸素', equip: 'マシン' },
  { name: '縄跳び', group: '有酸素', equip: '自重' }
];

export const PRESET_EXERCISE_NAMES = new Set(PRESET_EXERCISES.map(e => e.name));

export const PRESET_ROUTINES: PresetRoutine[] = [
  {
    title: '全身の日 (Full Body)',
    description: 'マシンと自重を組み合わせた、全身をバランス良く鍛える初心者向けメニュー（約45分〜1時間）',
    exerciseNames: ['チェストプレス', 'ラットプルダウン', 'レッグプレス', 'プランク']
  },
  {
    title: '上半身の日 (Upper Body)',
    description: 'マシンとダンベルで上半身の主要な筋肉を効果的に刺激するメニュー（約45分〜1時間）',
    exerciseNames: ['チェストプレス', 'シーテッドロウ', 'ダンベルショルダープレス', 'ダンベルカール']
  },
  {
    title: '下半身の日 (Lower Body)',
    description: '安全なマシンを中心に、太ももとお尻を完璧に鍛え上げるメニュー（約45分〜1時間）',
    exerciseNames: ['レッグプレス', 'レッグエクステンション', 'レッグカール', 'マシンアブダクター']
  },
  {
    title: '自重の日 (Bodyweight)',
    description: '器具を一切使わず、自宅や旅行先でも畳1畳分で行える自重メニュー（約30分〜45分）',
    exerciseNames: ['プッシュアップ', '懸垂', 'ブルガリアンスプリットスクワット', 'クランチ']
  }
];
