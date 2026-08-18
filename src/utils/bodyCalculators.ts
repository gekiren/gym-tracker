import {
  Gender,
  NavyBodyFatInput,
  NavyBodyFatResult,
  CaseyLimitInput,
  CaseyLimitResult,
  MusclePotentialAnalysis,
  MfRatioResult,
  MachoScoreResult,
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

/**
 * 筋肉・脂肪比（MF比：Muscle-to-Fat Ratio）の計算
 * 脂肪1kgに対して何kgの筋肉があるかを表す「筋肉の密度」の指標
 * 計算式: MF比 = 筋肉量 (kg) / 体脂肪量 (kg)
 * @param muscleMassKg 骨格筋量・筋肉量 (kg)
 * @param weightKg 体重 (kg)
 * @param bodyFatRate 体脂肪率 (%)
 */
export function calculateMfRatio(
  muscleMassKg: number,
  weightKg: number,
  bodyFatRate: number
): MfRatioResult | null {
  if (muscleMassKg <= 0 || weightKg <= 0 || bodyFatRate <= 0) {
    return null;
  }

  const fatMass = Number(((weightKg * bodyFatRate) / 100).toFixed(2));
  if (fatMass <= 0.05) return null; // ゼロ除算・極小値ガード

  const mfRatio = Number((muscleMassKg / fatMass).toFixed(2));

  let category: MfRatioResult['category'] = 'average';
  let categoryLabel = '標準 (2.5+)';
  let advice = '標準的な体組成バランスです。筋力トレーニングで筋量を高めることでさらにスコアが向上します。';

  if (mfRatio >= 7.5) {
    category = 'elite';
    categoryLabel = 'ハイレベル維持 (7.5+)';
    advice = '脂肪1kgに対し7.5kg以上の筋肉。極めて高い筋密度と絞りを極限で維持している状態です。';
  } else if (mfRatio >= 7.0) {
    category = 'visible_abs';
    categoryLabel = '腹筋常時視認・高密度 (7.0+)';
    advice = '服の上からでも筋肉の質感が分かり、常時腹筋が鮮明に見える状態です。';
  } else if (mfRatio >= 5.5) {
    category = 'athlete';
    categoryLabel = 'アスリート・カット (5.5+)';
    advice = '筋肉量が十分に多く、体脂肪が適度に削ぎ落とされたシャープな体組成です。';
  } else if (mfRatio >= 4.0) {
    category = 'fitness';
    categoryLabel = 'フィットネス (4.0+)';
    advice = '一般的な平均を上回る筋肉の密度です。引き締まったシルエットを形成しています。';
  } else if (mfRatio >= 2.5) {
    category = 'average';
    categoryLabel = '標準 (2.5+)';
    advice = '標準的な体組成バランスです。筋力トレーニングで筋量を高めることでさらにスコアが向上します。';
  } else {
    category = 'low';
    categoryLabel = '低め';
    advice = '体脂肪量に対して筋肉量が控えめです。体脂肪の低減または筋肉量の増量を目指しましょう。';
  }

  return {
    mfRatio,
    fatMass,
    muscleMass: Number(muscleMassKg.toFixed(1)),
    category,
    categoryLabel,
    advice,
  };
}

/**
 * マッチョ評価スコア（MS：Macho Score）の計算
 * FFMI（除脂肪量指数）をベースに、「絞り（体脂肪率の低さ）」のボーナスを加点した総合スコア
 * 計算式: MSスコア = FFMI + (20 - 体脂肪率(%)) * 0.2
 * FFMIの計算式: FFMI = 除脂肪体重 (kg) / (身長 (m))^2
 * @param weightKg 体重 (kg)
 * @param bodyFatRate 体脂肪率 (%)
 * @param heightCm 身長 (cm)
 */
export function calculateMachoScore(
  weightKg: number,
  bodyFatRate: number,
  heightCm: number
): MachoScoreResult | null {
  if (weightKg <= 0 || bodyFatRate <= 0 || heightCm <= 0) {
    return null;
  }

  const heightM = heightCm / 100;
  const lbm = weightKg * (1 - bodyFatRate / 100);
  const rawFfmi = lbm / (heightM * heightM);
  const ffmi = Number(rawFfmi.toFixed(2));

  // 体脂肪率20%を基準（±0）とし、体脂肪率が1%低くなるごとに +0.2点 加算
  const fatBonus = Number(((20 - bodyFatRate) * 0.2).toFixed(2));
  const score = Number((ffmi + fatBonus).toFixed(2));
  const is20Achieved = score >= 20.0;

  let category: MachoScoreResult['category'] = 'standard';
  let categoryLabel = '標準レベル';
  let advice = '標準的な体型です。筋トレと食事管理でFFMI向上と体脂肪率低下を目指しましょう。';

  if (score >= 24.5) {
    category = 'superhuman';
    categoryLabel = 'トップフィジーク・限界級 (24.5+)';
    advice = '圧倒的な除脂肪筋肉量と極限の絞りを両立した大会上位・トップフィジークです。';
  } else if (score >= 23.0) {
    category = 'athlete';
    categoryLabel = '本格マッチョ・アスリート (23.0+)';
    advice = '充実した筋肉量と優れたカットを備えた、誰もが一目でマッチョと認める身体です。';
  } else if (score >= 21.5) {
    category = 'macho';
    categoryLabel = '中上級マッチョ・筋肉質 (21.5+)';
    advice = '服の上からでも筋肉の厚みが分かるレベルに到達しています！';
  } else if (score >= 20.0) {
    category = 'fitness';
    categoryLabel = '細マッチョ・引き締まり (20.0+)';
    advice = '体脂肪が低くシャープに引き締まった細身（スリムフィット）です。筋肉増量でさらなるスコアUPが狙えます。';
  } else if (score >= 18.5) {
    category = 'standard';
    categoryLabel = '標準・ライトフィットネス (18.5+)';
    advice = '健康的で標準的な体型です。筋力トレーニングで筋量を高めることでさらにスコアが向上します。';
  } else {
    category = 'standard';
    categoryLabel = '発展途上・筋量控えめ';
    advice = '標準的な体格です。筋トレと食事管理でFFMI向上と体脂肪率低下を目指しましょう。';
  }

  return {
    score,
    ffmi,
    fatBonus,
    bodyFatRate: Number(bodyFatRate.toFixed(1)),
    is20Achieved,
    category,
    categoryLabel,
    advice,
  };
}

