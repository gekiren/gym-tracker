import {
  Gender,
  NavyBodyFatInput,
  NavyBodyFatResult,
  CaseyLimitInput,
  CaseyLimitResult,
  MusclePotentialAnalysis,
} from '../types/bodyComposition';

/**
 * FFMI（除脂肪量指数）および 正規化FFMI の計算
 * @param lbm 除脂肪体重 (kg)
 * @param heightCm 身長 (cm)
 */
export function calculateFfmi(lbm: number, heightCm: number): { ffmi: number; normalizedFfmi: number } {
  if (lbm <= 0 || heightCm <= 0) return { ffmi: 0, normalizedFfmi: 0 };
  const heightM = heightCm / 100;
  const ffmi = lbm / (heightM * heightM);
  // 身長補正（180cm基準の正規化FFMI）
  const normalizedFfmi = ffmi + 6.3 * (1.8 - heightM);
  return {
    ffmi: Number(ffmi.toFixed(2)),
    normalizedFfmi: Number(normalizedFfmi.toFixed(2)),
  };
}

/**
 * BMI（体格指数）の計算
 */
export function calculateBmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

/**
 * 米海軍式（US Navy Method）による体脂肪率および体組成の推定計算
 */
export function calculateNavyBodyFat(input: NavyBodyFatInput): NavyBodyFatResult | null {
  const { gender, height, neck, waist, hip, weight } = input;

  if (height <= 0 || neck <= 0 || waist <= 0) {
    return null;
  }

  let bodyFatRate = 0;
  let density = 0;

  if (gender === 'male') {
    const diff = waist - neck;
    if (diff <= 0) return null; // 幾何学的に不正な入力ガード

    // 身体密度 (Hodgdon & Beckett, 1984)
    density = 1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(height);
    // Siri式体脂肪率
    bodyFatRate = 495 / density - 450;
  } else {
    // 女性
    const hipVal = hip ?? 0;
    if (hipVal <= 0) return null;
    const diff = waist + hipVal - neck;
    if (diff <= 0) return null;

    density = 1.29579 - 0.35004 * Math.log10(diff) + 0.22100 * Math.log10(height);
    bodyFatRate = 495 / density - 450;
  }

  // 物理的限界値のクリッピング（2%〜60%）
  bodyFatRate = Math.max(2, Math.min(60, bodyFatRate));
  bodyFatRate = Number(bodyFatRate.toFixed(1));

  let lbm: number | null = null;
  let fatMass: number | null = null;
  let bmi: number | null = null;
  let ffmi: number | null = null;

  if (weight && weight > 0) {
    fatMass = Number(((weight * bodyFatRate) / 100).toFixed(1));
    lbm = Number((weight - fatMass).toFixed(1));
    bmi = calculateBmi(weight, height);
    const ffmiRes = calculateFfmi(lbm, height);
    ffmi = ffmiRes.normalizedFfmi;
  }

  // 体脂肪カテゴリ判定 (ACE基準)
  let category: NavyBodyFatResult['category'] = 'average';
  let categoryLabel = '標準 (Average)';

  if (gender === 'male') {
    if (bodyFatRate < 6) {
      category = 'essential';
      categoryLabel = '必須脂肪レベル (Essential)';
    } else if (bodyFatRate < 14) {
      category = 'athletes';
      categoryLabel = 'アスリート (Athletes)';
    } else if (bodyFatRate < 18) {
      category = 'fitness';
      categoryLabel = 'フィットネス (Fitness)';
    } else if (bodyFatRate < 25) {
      category = 'average';
      categoryLabel = '標準 (Average)';
    } else {
      category = 'obese';
      categoryLabel = '高め (Above Average)';
    }
  } else {
    if (bodyFatRate < 14) {
      category = 'essential';
      categoryLabel = '必須脂肪レベル (Essential)';
    } else if (bodyFatRate < 21) {
      category = 'athletes';
      categoryLabel = 'アスリート (Athletes)';
    } else if (bodyFatRate < 25) {
      category = 'fitness';
      categoryLabel = 'フィットネス (Fitness)';
    } else if (bodyFatRate < 32) {
      category = 'average';
      categoryLabel = '標準 (Average)';
    } else {
      category = 'obese';
      categoryLabel = '高め (Above Average)';
    }
  }

  return {
    bodyFatRate,
    density: Number(density.toFixed(4)),
    lbm,
    fatMass,
    bmi,
    ffmi,
    category,
    categoryLabel,
  };
}

/**
 * ケーシー・バット博士モデル（Dr. Casey Butt's Maximum Muscular Potential Model）による
 * ナチュラル筋肥大の生理的限界値の計算
 */
export function calculateCaseyMuscularLimit(input: CaseyLimitInput): CaseyLimitResult | null {
  const { height, wrist, ankle } = input;
  const targetBf = input.targetBodyFatRate ?? 10; // デフォルト10%

  if (height <= 0 || wrist <= 0 || ankle <= 0) {
    return null;
  }

  // cm から inches への変換 (1 inch = 2.54 cm)
  const H = height / 2.54;
  const W = wrist / 2.54;
  const A = ankle / 2.54;

  // ケーシー・バット博士の最大体重限界予測式（lbs）
  // M = H^1.5 * ( sqrt(W)/22.6670 + sqrt(A)/17.0104 ) * ( %BF/224 + 1 )
  const boneFactor = Math.sqrt(W) / 22.6670 + Math.sqrt(A) / 17.0104;
  const fatFactor = targetBf / 224 + 1;
  const maxWeightLbs = Math.pow(H, 1.5) * boneFactor * fatFactor;

  // lbs から kg への変換 (1 lb = 0.45359237 kg)
  const maxBodyWeightKg = maxWeightLbs * 0.45359237;
  const maxLbmKg = maxBodyWeightKg * (1 - targetBf / 100);

  // 現実的上限（遺伝的限界の95%）
  const realisticLbm95Kg = maxLbmKg * 0.95;
  const realisticWeight95Kg = realisticLbm95Kg / (1 - targetBf / 100);

  // 限界FFMI
  const limitFfmiRes = calculateFfmi(maxLbmKg, height);

  // 各部位の最大周囲長予測 (inches ➔ cm)
  const chestInches = 1.6817 * W + 1.3759 * A + 0.3314 * H;
  const bicepsInches = 1.2033 * W + 0.1236 * H;
  const forearmInches = 0.9626 * W + 0.0989 * H;
  const thighInches = 1.3868 * A + 0.1805 * H;
  const calfInches = 0.9298 * A + 0.1210 * H;
  const neckInches = 1.1424 * W + 0.1236 * H;

  return {
    maxBodyWeight: Number(maxBodyWeightKg.toFixed(1)),
    maxLbm: Number(maxLbmKg.toFixed(1)),
    targetBodyFatRate: targetBf,
    realisticWeight95: Number(realisticWeight95Kg.toFixed(1)),
    realisticLbm95: Number(realisticLbm95Kg.toFixed(1)),
    limitFfmi: limitFfmiRes.normalizedFfmi,
    maxChest: Number((chestInches * 2.54).toFixed(1)),
    maxBiceps: Number((bicepsInches * 2.54).toFixed(1)),
    maxForearm: Number((forearmInches * 2.54).toFixed(1)),
    maxThigh: Number((thighInches * 2.54).toFixed(1)),
    maxCalf: Number((calfInches * 2.54).toFixed(1)),
    maxNeck: Number((neckInches * 2.54).toFixed(1)),
  };
}

/**
 * 現在の体組成とケーシー・バット限界モデルを比較したポテンシャル分析
 */
export function analyzeMusclePotential(
  currentWeight: number,
  currentBodyFatRate: number,
  heightCm: number,
  wristCm: number,
  ankleCm: number
): MusclePotentialAnalysis | null {
  if (currentWeight <= 0 || currentBodyFatRate <= 0 || heightCm <= 0 || wristCm <= 0 || ankleCm <= 0) {
    return null;
  }

  const currentLbm = currentWeight * (1 - currentBodyFatRate / 100);
  const currentFfmiRes = calculateFfmi(currentLbm, heightCm);

  const caseyLimit = calculateCaseyMuscularLimit({
    height: heightCm,
    wrist: wristCm,
    ankle: ankleCm,
    targetBodyFatRate: currentBodyFatRate,
  });

  if (!caseyLimit) return null;

  const maxLbm = caseyLimit.maxLbm;
  const reachPercentage = Number(Math.min(120, (currentLbm / maxLbm) * 100).toFixed(1));
  const remainingMuscleGainKg = Number(Math.max(0, maxLbm - currentLbm).toFixed(1));

  let naturalStatusCategory: MusclePotentialAnalysis['naturalStatusCategory'] = 'intermediate';
  let naturalStatusLabel = '中級者 (Intermediate)';
  let advice = '着実に筋肥大が進んでいます。継続的な漸進性過負荷と適切な栄養管理でさらなる成長が期待できます。';

  if (reachPercentage < 75) {
    naturalStatusCategory = 'novice';
    naturalStatusLabel = '発展途上 (Novice / Beginner)';
    advice = `骨格フレームに対してまだ約 ${remainingMuscleGainKg} kg の筋肉をナチュラルに増量できる大きなポテンシャルが残っています！`;
  } else if (reachPercentage < 88) {
    naturalStatusCategory = 'intermediate';
    naturalStatusLabel = '充実期 (Intermediate)';
    advice = `骨格限界の ${reachPercentage}% に到達。あと約 ${remainingMuscleGainKg} kg の筋肉増量が可能です。基礎種目の重量更新を目指しましょう。`;
  } else if (reachPercentage < 95) {
    naturalStatusCategory = 'advanced';
    naturalStatusLabel = '上級者 (Advanced)';
    advice = `ナチュラルとして非常に高い筋肉量を獲得しています（現実的上限95%に接近中）。ボリューム管理と回復の最適化が鍵となります。`;
  } else if (reachPercentage <= 100) {
    naturalStatusCategory = 'elite';
    naturalStatusLabel = 'トップエリート (Elite / Peak)';
    advice = `遺伝的・生理的限界の直前（${reachPercentage}%）に到達しています！これ以上の筋肥大は非常に緩やかですが、トップクラスの肉体です。`;
  } else if (reachPercentage <= 105) {
    naturalStatusCategory = 'near_genetic_limit';
    naturalStatusLabel = '骨格限界到達 (Near Genetic Limit)';
    advice = 'ケーシー・バットモデルによる骨格限界の上限値に到達しています。筋密度の向上やコンディションの維持に注力できます。';
  } else {
    naturalStatusCategory = 'exceeds_natural';
    naturalStatusLabel = '規格外 / 測定確認推奨 (Beyond Standard Model)';
    advice = '標準的なナチュラルモデルの上限を超過しています。手首・足首・体脂肪率の測定値が正確か再度ご確認ください。';
  }

  return {
    currentWeight: Number(currentWeight.toFixed(1)),
    currentBodyFatRate: Number(currentBodyFatRate.toFixed(1)),
    currentLbm: Number(currentLbm.toFixed(1)),
    currentFfmi: currentFfmiRes.normalizedFfmi,
    maxLbm: caseyLimit.maxLbm,
    maxWeightAtTargetFat: caseyLimit.maxBodyWeight,
    reachPercentage,
    remainingMuscleGainKg,
    naturalStatusCategory,
    naturalStatusLabel,
    advice,
  };
}
