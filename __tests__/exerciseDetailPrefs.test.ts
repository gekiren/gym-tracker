import {
  parseExerciseChartMetric,
  parseExerciseChartScale,
  parseExerciseChartPreferences,
  parseExercisePrCollapsedStances,
  resolveExerciseChartPreference,
  resolveEffectiveChartStance,
} from '../src/utils/exerciseDetailPrefs';
import { useSettingsStore } from '../src/store/settingsStore';
import { saveSetting } from '../src/db/database';

jest.mock('../src/db/database', () => ({
  saveSetting: jest.fn().mockResolvedValue(undefined),
}));

const mockSaveSetting = saveSetting as jest.MockedFunction<typeof saveSetting>;

describe('exerciseDetailPrefs parsers and resolvers', () => {
  it('parses valid and invalid exercise chart metrics', () => {
    expect(parseExerciseChartMetric('volume')).toBe('volume');
    expect(parseExerciseChartMetric('1rm')).toBe('1rm');
    expect(parseExerciseChartMetric('sets')).toBe('sets');
    expect(parseExerciseChartMetric('avg_volume_per_set')).toBe('avg_volume_per_set');
    expect(parseExerciseChartMetric('density')).toBe('density');
    expect(parseExerciseChartMetric('calories')).toBeUndefined();
    expect(parseExerciseChartMetric('')).toBeUndefined();
    expect(parseExerciseChartMetric(undefined)).toBeUndefined();
  });

  it('parses valid and invalid exercise chart scales', () => {
    expect(parseExerciseChartScale('day')).toBe('day');
    expect(parseExerciseChartScale('week')).toBe('week');
    expect(parseExerciseChartScale('month')).toBe('month');
    expect(parseExerciseChartScale('year')).toBeUndefined();
    expect(parseExerciseChartScale('')).toBeUndefined();
    expect(parseExerciseChartScale(undefined)).toBeUndefined();
  });

  it('parses exerciseChartPreferences safely and filters invalid fields/entries', () => {
    const validRaw = JSON.stringify({
      '1': { metric: '1rm', scale: 'week', stance: 'wide' },
      '2': { metric: 'invalid', scale: 'month', stance: '' },
      '3': { metric: 'bad', scale: 'year', stance: 123 },
      '4': ['not', 'an', 'object'],
    });
    expect(parseExerciseChartPreferences(validRaw)).toEqual({
      '1': { metric: '1rm', scale: 'week', stance: 'wide' },
      '2': { scale: 'month' },
    });

    expect(parseExerciseChartPreferences(undefined)).toEqual({});
    expect(parseExerciseChartPreferences('not-json{')).toEqual({});
    expect(parseExerciseChartPreferences('["array"]')).toEqual({});
    expect(parseExerciseChartPreferences('null')).toEqual({});
  });

  it('parses exercisePrCollapsedStances safely and preserves true/false booleans', () => {
    const raw = JSON.stringify({
      '10': { default: true, narrow: false, badVal: 'true', badNum: 1 },
      '20': { wide: 'nope' },
      '30': 'not-an-object',
    });
    expect(parseExercisePrCollapsedStances(raw)).toEqual({
      '10': { default: true, narrow: false },
    });

    expect(parseExercisePrCollapsedStances(undefined)).toEqual({});
    expect(parseExercisePrCollapsedStances('{broken')).toEqual({});
    expect(parseExercisePrCollapsedStances('[1,2,3]')).toEqual({});
  });

  it('resolves per-exercise chart preference with fallback to global defaults', () => {
    const prefs = {
      '10': { metric: '1rm' as const, scale: 'week' as const, stance: 'narrow' },
    };

    expect(resolveExerciseChartPreference(10, prefs, 'volume', 'day')).toEqual({
      metric: '1rm',
      scale: 'week',
      stance: 'narrow',
    });

    expect(resolveExerciseChartPreference(99, prefs, 'sets', 'month')).toEqual({
      metric: 'sets',
      scale: 'month',
      stance: 'all',
    });
  });

  it('resolves effective chart stance based on loading state, selector visibility, and available stances', () => {
    expect(resolveEffectiveChartStance('all', ['default', 'wide'], false, true)).toBe('all');
    expect(resolveEffectiveChartStance('wide', [], true, false)).toBe('wide');
    expect(resolveEffectiveChartStance('wide', ['default'], false, false)).toBe('all');
    expect(resolveEffectiveChartStance('wide', ['default', 'narrow'], false, true)).toBe('all');
    expect(resolveEffectiveChartStance('wide', ['default', 'wide'], false, true)).toBe('wide');
  });
});

describe('useSettingsStore exercise detail preference persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsStore.getState().resetSettings();
  });

  it('persists PR stance accordion collapsed and expanded states per exercise independently', () => {
    const store = useSettingsStore.getState();

    store.setExercisePrStanceCollapsed(1, 'default', true);
    store.setExercisePrStanceCollapsed(2, 'default', false);
    store.setExercisePrStanceCollapsed(1, 'narrow', true);

    expect(useSettingsStore.getState().settings.exercisePrCollapsedStances).toEqual({
      '1': { default: true, narrow: true },
      '2': { default: false },
    });

    // Re-opening stance on exercise 1 preserves exercise 2 and persists false
    useSettingsStore.getState().setExercisePrStanceCollapsed(1, 'default', false);
    expect(useSettingsStore.getState().settings.exercisePrCollapsedStances).toEqual({
      '1': { default: false, narrow: true },
      '2': { default: false },
    });

    expect(mockSaveSetting).toHaveBeenCalledWith(
      'exercise_pr_collapsed_stances',
      JSON.stringify({
        '1': { default: false, narrow: true },
        '2': { default: false },
      })
    );

    // Setting same state is a no-op
    const callsBefore = mockSaveSetting.mock.calls.length;
    useSettingsStore.getState().setExercisePrStanceCollapsed(1, 'default', false);
    expect(mockSaveSetting.mock.calls.length).toBe(callsBefore);
  });

  it('persists chart metric, scale, and stance per exercise and updates global fallbacks', () => {
    const store = useSettingsStore.getState();

    store.setExerciseChartPreference(5, { metric: '1rm' });
    store.setExerciseChartPreference(5, { scale: 'week' });
    store.setExerciseChartPreference(5, { stance: 'wide' });

    const stateAfter = useSettingsStore.getState().settings;
    expect(stateAfter.exerciseChartPreferences['5']).toEqual({
      metric: '1rm',
      scale: 'week',
      stance: 'wide',
    });
    expect(stateAfter.lastExerciseChartMetric).toBe('1rm');
    expect(stateAfter.lastExerciseChartScale).toBe('week');

    expect(mockSaveSetting).toHaveBeenCalledWith('last_exercise_chart_metric', '1rm');
    expect(mockSaveSetting).toHaveBeenCalledWith('last_exercise_chart_scale', 'week');
    expect(mockSaveSetting).toHaveBeenCalledWith(
      'exercise_chart_preferences',
      JSON.stringify({
        '5': { metric: '1rm', scale: 'week', stance: 'wide' },
      })
    );
  });

  it('preserves existing chart preferences and PR collapsed states on partial loadSettings calls and resets cleanly', () => {
    const store = useSettingsStore.getState();
    store.setExerciseChartPreference(7, { metric: 'density', scale: 'month', stance: 'default' });
    store.setExercisePrStanceCollapsed(7, 'default', true);

    // Partial loadSettings (like timer settings screen updates) omits new fields
    useSettingsStore.getState().loadSettings({
      defaultRest: 120,
      autoRest: true,
      timerVibrate: true,
      weightUnit: 'kg',
    });

    const preserved = useSettingsStore.getState().settings;
    expect(preserved.lastExerciseChartMetric).toBe('density');
    expect(preserved.lastExerciseChartScale).toBe('month');
    expect(preserved.exerciseChartPreferences).toEqual({
      '7': { metric: 'density', scale: 'month', stance: 'default' },
    });
    expect(preserved.exercisePrCollapsedStances).toEqual({
      '7': { default: true },
    });

    useSettingsStore.getState().resetSettings();
    const afterReset = useSettingsStore.getState().settings;
    expect(afterReset.lastExerciseChartMetric).toBe('volume');
    expect(afterReset.lastExerciseChartScale).toBe('day');
    expect(afterReset.exerciseChartPreferences).toEqual({});
    expect(afterReset.exercisePrCollapsedStances).toEqual({});
  });
});
