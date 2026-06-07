import * as Clipboard from 'expo-clipboard';
import { translateExercise } from '../i18n';

export interface ShareStats {
  totalVolume: number;
  totalVolumeKg: number;
  weightUnit: 'kg' | 'lbs';
  carCount: string;
  busCount: string;
  elephantCount: string;
  calories: number;
  onigiriCount: string;
  beerCount: string;
}

/**
 * ワークアウトの総挙上重量（総ボリューム）と各種換算数値を計算する
 */
export function calculateShareStats(
  workout: {
    calories: number | null;
    exercises: {
      equipment?: string;
      sets: {
        weight: number | null;
        reps: number | null;
        is_completed: boolean;
      }[];
    }[];
  },
  settings: {
    weightUnit: 'kg' | 'lbs';
    bodyWeight: number | null;
  }
): ShareStats {
  let totalVolume = 0;

  workout.exercises.forEach(ex => {
    const completedSets = ex.sets.filter(s => s.is_completed);
    const exBw = (ex.equipment === '自重' && settings.bodyWeight) ? settings.bodyWeight : 0;
    
    completedSets.forEach(s => {
      const weight = s.weight || 0;
      const reps = s.reps || 0;
      totalVolume += (weight + exBw) * reps;
    });
  });

  const isLbs = settings.weightUnit === 'lbs';
  const totalVolumeKg = isLbs ? totalVolume * 0.453 : totalVolume;

  const carCount = (totalVolumeKg / 800).toFixed(1);
  const busCount = (totalVolumeKg / 10000).toFixed(2);
  const elephantCount = (totalVolumeKg / 6000).toFixed(2);

  const calories = workout.calories || 0;
  const onigiriCount = (calories / 200).toFixed(1);
  const beerCount = (calories / 150).toFixed(1);

  return {
    totalVolume,
    totalVolumeKg,
    weightUnit: settings.weightUnit,
    carCount,
    busCount,
    elephantCount,
    calories,
    onigiriCount,
    beerCount,
  };
}

/**
 * SNS投稿用の定型テキストを自動生成する
 */
export function generateShareText(
  workout: {
    title: string;
    calories: number | null;
    exercises: {
      equipment?: string;
      sets: {
        weight: number | null;
        reps: number | null;
        is_completed: boolean;
      }[];
    }[];
  },
  settings: {
    weightUnit: 'kg' | 'lbs';
    bodyWeight: number | null;
  }
): string {
  const stats = calculateShareStats(workout, settings);
  const dateStr = new Date().toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  let text = `【${dateStr}のワークアウト: ${workout.title}】\n`;
  text += `総挙上重量：${stats.totalVolume.toLocaleString()} ${stats.weightUnit} 💪🔥\n`;
  text += `（軽自動車 約 ${stats.carCount} 台分に相当！🚗💨）\n\n`;

  if (stats.totalVolumeKg >= 6000) {
    text += `これはアフリカゾウ約 ${stats.elephantCount} 頭分を持ち上げたことになります！🐘💥\n`;
  } else if (stats.totalVolumeKg >= 2000) {
    text += `これは大型路線バス約 ${stats.busCount} 台分を持ち上げたことになります！🚌💥\n`;
  }

  if (stats.calories > 0) {
    text += `\n消費カロリー：${stats.calories} kcal\n`;
    text += `おにぎり約 ${stats.onigiriCount} 個分🍙 / ビール約 ${stats.beerCount} 杯分🍺\n`;
  }

  text += `\n限界突破！明日も頑張ろう！✨\n`;
  text += `#トレノート #TreNote #筋トレ #ワークアウト #フィットネス`;

  return text;
}

/**
 * テキストをクリップボードにコピーする
 */
export async function copyShareTextToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (error) {
    console.error('Failed to copy text to clipboard', error);
    return false;
  }
}
