import {
  HC_EXERCISE_TYPE_RUNNING_TREADMILL,
  HC_EXERCISE_TYPE_STRENGTH_TRAINING,
  HC_MEAL_TYPE_BREAKFAST,
  HC_MEAL_TYPE_DINNER,
  HC_MEAL_TYPE_LUNCH,
  HC_MEAL_TYPE_SNACK,
  HC_MEAL_TYPE_UNKNOWN,
  HC_SLEEP_STAGE_AWAKE,
  HC_SLEEP_STAGE_DEEP,
  HC_SLEEP_STAGE_LIGHT,
  HC_SLEEP_STAGE_OUT_OF_BED,
  HC_SLEEP_STAGE_REM,
  HC_SLEEP_STAGE_SLEEPING,
  aggregateSleepStages,
  buildBodyCompositionRecords,
  buildHydrationRecord,
  buildMealTimeInterval,
  buildNutritionRecord,
  buildWorkoutRecords,
  convertSaltToSodiumGrams,
  ensureValidInterval,
  formatLocalDateISO,
  isOwnHealthConnectRecord,
  normalizeDateToISO,
} from '../src/services/health/healthMappers';

describe('healthMappers - date and sleep stage helpers', () => {
  it('formats local dates and normalizes slash/hyphen strings to YYYY-MM-DD', () => {
    const localDate = new Date(2026, 10, 5, 0, 15, 0);
    expect(formatLocalDateISO(localDate)).toBe('2026-11-05');
    expect(normalizeDateToISO('2026/1/9')).toBe('2026-01-09');
    expect(normalizeDateToISO('2026-11-21T15:30:00')).toBe('2026-11-21');
  });

  it('always ensures endTime is strictly after startTime', () => {
    const startMs = new Date('2026-11-21T10:00:00.000Z').getTime();
    const sameEnd = ensureValidInterval(startMs, startMs);
    expect(new Date(sameEnd.endTime).getTime()).toBe(startMs + 60_000);

    const earlierEnd = ensureValidInterval(startMs, startMs - 30_000);
    expect(new Date(earlierEnd.endTime).getTime()).toBe(startMs + 60_000);
  });

  it('aggregates Health Connect SleepStageType values accurately including REM and OUT_OF_BED', () => {
    const t0 = new Date('2026-11-21T00:00:00.000Z').getTime();
    const min = 60_000;
    const result = aggregateSleepStages([
      { startTime: new Date(t0).toISOString(), endTime: new Date(t0 + 90 * min).toISOString(), stage: HC_SLEEP_STAGE_DEEP },
      { startTime: new Date(t0 + 90 * min).toISOString(), endTime: new Date(t0 + 240 * min).toISOString(), stage: HC_SLEEP_STAGE_LIGHT },
      { startTime: new Date(t0 + 240 * min).toISOString(), endTime: new Date(t0 + 330 * min).toISOString(), stage: HC_SLEEP_STAGE_REM },
      { startTime: new Date(t0 + 330 * min).toISOString(), endTime: new Date(t0 + 340 * min).toISOString(), stage: HC_SLEEP_STAGE_AWAKE },
      { startTime: new Date(t0 + 340 * min).toISOString(), endTime: new Date(t0 + 345 * min).toISOString(), stage: HC_SLEEP_STAGE_OUT_OF_BED },
      { startTime: new Date(t0 + 345 * min).toISOString(), endTime: new Date(t0 + 360 * min).toISOString(), stage: HC_SLEEP_STAGE_SLEEPING },
    ]);

    expect(result).toEqual({
      deepSleepMinutes: 90,
      lightSleepMinutes: 150,
      remSleepMinutes: 90,
      awakeMinutes: 15,
    });
  });
});

describe('healthMappers - salt conversion and dataOrigin detection', () => {
  it('converts salt equivalent (g) to sodium (g) and clamps safely', () => {
    expect(convertSaltToSodiumGrams(2.54)).toBe(1);
    expect(convertSaltToSodiumGrams(-5)).toBe(0);
    expect(convertSaltToSodiumGrams(Number.NaN)).toBe(0);
    expect(convertSaltToSodiumGrams(1000)).toBe(100);
  });

  it('identifies own records for both string and object dataOrigin shapes', () => {
    expect(isOwnHealthConnectRecord({ dataOrigin: 'com.gekirennomad.trenote' })).toBe(true);
    expect(isOwnHealthConnectRecord({ dataOrigin: { packageName: 'com.gekirennomad.trenote' } })).toBe(true);
    expect(isOwnHealthConnectRecord({ dataOrigin: 'com.google.android.apps.fitness' })).toBe(false);
    expect(isOwnHealthConnectRecord(undefined)).toBe(false);
  });
});

describe('healthMappers - record builders', () => {
  it('builds strength and treadmill ExerciseSession records without laps/segments and optional calories', () => {
    const strengthRecords = buildWorkoutRecords(
      {
        id: 42,
        title: '胸トレ',
        startTime: '2026-11-21T09:00:00.000Z',
        endTime: '2026-11-21T10:00:00.000Z',
        calories: 320,
        exerciseNames: ['ベンチプレス', 'ダンベルフライ'],
        totalSets: 8,
        notes: '調子良好',
        isTreadmillOnly: false,
      },
      100
    );

    expect(strengthRecords).toHaveLength(2);
    const session = strengthRecords[0] as any;
    const calories = strengthRecords[1] as any;
    expect(session.recordType).toBe('ExerciseSession');
    expect(session.exerciseType).toBe(HC_EXERCISE_TYPE_STRENGTH_TRAINING);
    expect(session.metadata.clientRecordId).toBe('trenote_workout_42');
    expect(session.laps).toBeUndefined();
    expect(session.segments).toBeUndefined();
    expect(session.notes).toContain('ベンチプレス');
    expect(calories.recordType).toBe('ActiveCaloriesBurned');
    expect(calories.metadata.clientRecordId).toBe('trenote_workout_cal_42');
    expect(calories.energy).toEqual({ value: 320, unit: 'kilocalories' });

    const treadmillRecords = buildWorkoutRecords({
      id: 43,
      title: '有酸素',
      startTime: '2026-11-21T11:00:00.000Z',
      endTime: '2026-11-21T11:00:00.000Z',
      calories: 0,
      isTreadmillOnly: true,
    });
    expect(treadmillRecords).toHaveLength(1);
    expect((treadmillRecords[0] as any).exerciseType).toBe(HC_EXERCISE_TYPE_RUNNING_TREADMILL);
    expect(
      new Date((treadmillRecords[0] as any).endTime).getTime() >
        new Date((treadmillRecords[0] as any).startTime).getTime()
    ).toBe(true);
  });

  it('builds body composition records with cm->m height and skips health_connect source', () => {
    expect(
      buildBodyCompositionRecords({
        date: '2026-11-21',
        weight: 70,
        source: 'health_connect',
      })
    ).toEqual([]);

    const records = buildBodyCompositionRecords(
      {
        date: '2026/11/21',
        weight: 72.5,
        body_fat_rate: 15.2,
        height: 175,
        lbm: 61.5,
        source: 'manual',
      },
      200
    ) as any[];

    expect(records).toHaveLength(4);
    expect(records.map((r) => r.recordType)).toEqual([
      'Weight',
      'BodyFat',
      'Height',
      'LeanBodyMass',
    ]);
    expect(records[0].metadata.clientRecordId).toBe('trenote_body_2026-11-21_weight');
    expect(records[1].metadata.clientRecordId).toBe('trenote_body_2026-11-21_bodyfat');
    expect(records[2].height).toEqual({ value: 1.75, unit: 'meters' });
    expect(records[3].metadata.clientRecordId).toBe('trenote_body_2026-11-21_lbm');
  });

  it('builds NutritionRecord with meal_type mapping, sodium conversion, and skips all-zero logs', () => {
    const emptyMeal = buildNutritionRecord({
      id: 1,
      date: '2026-11-21',
      name: '空ログ',
      calories: 0,
      protein: 0,
      fat: 0,
      carbs: 0,
      sodium: 0,
      fiber: 0,
      created_at: 0,
    });
    expect(emptyMeal).toBeNull();

    const mealTypes = [
      ['breakfast', HC_MEAL_TYPE_BREAKFAST],
      ['lunch', HC_MEAL_TYPE_LUNCH],
      ['dinner', HC_MEAL_TYPE_DINNER],
      ['snack', HC_MEAL_TYPE_SNACK],
      ['other', HC_MEAL_TYPE_UNKNOWN],
    ] as const;

    for (const [inputType, expectedCode] of mealTypes) {
      const rec = buildNutritionRecord({
        id: 10,
        date: '2026-11-21',
        meal_type: inputType,
        meal_time: '12:30',
        name: '鶏胸肉定食',
        calories: 650,
        protein: 45,
        fat: 12,
        carbs: 80,
        sodium: 2.54,
        fiber: 6,
        created_at: 1700000000000,
      }) as any;

      expect(rec).not.toBeNull();
      expect(rec.mealType).toBe(expectedCode);
      expect(rec.sodium).toEqual({ value: 1, unit: 'grams' });
      expect(rec.metadata.clientRecordId).toBe('trenote_meal_10');
    }

    const fallbackInterval = buildMealTimeInterval({
      date: '2026-11-21',
      meal_type: 'dinner',
      created_at: 0,
    });
    expect(new Date(fallbackInterval.startTime).getHours()).toBe(19);
  });

  it('builds HydrationRecord using timestamp clientRecordId and milliliters', () => {
    const ts = new Date('2026-11-21T14:00:00.000Z').getTime();
    const rec = buildHydrationRecord({ amount: 350, timestamp: ts, date: '2026/11/21' }) as any;
    expect(rec).not.toBeNull();
    expect(rec.recordType).toBe('Hydration');
    expect(rec.volume).toEqual({ value: 350, unit: 'milliliters' });
    expect(rec.metadata.clientRecordId).toBe(`trenote_water_${ts}`);
    expect(buildHydrationRecord({ amount: 0, timestamp: ts })).toBeNull();
  });
});
