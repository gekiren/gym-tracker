import { isTreadmillExercise } from '../src/utils/exerciseUtils';
import {
  calculateRemainingSeconds,
  calculateActualWorkSeconds,
  formatTimerDisplay,
} from '../src/utils/treadmillTimerUtils';

describe('Treadmill Exercise Utilities', () => {
  describe('isTreadmillExercise', () => {
    it('returns true for exact matches in Japanese and English', () => {
      expect(isTreadmillExercise('トレッドミル')).toBe(true);
      expect(isTreadmillExercise('treadmill')).toBe(true);
      expect(isTreadmillExercise('Treadmill')).toBe(true);
      expect(isTreadmillExercise('TREADMILL')).toBe(true);
    });

    it('returns true for names containing treadmill', () => {
      expect(isTreadmillExercise('トレッドミル（ランニング）')).toBe(true);
      expect(isTreadmillExercise('トレッドミル (傾斜ウォーキング)')).toBe(true);
      expect(isTreadmillExercise('Treadmill Running')).toBe(true);
      expect(isTreadmillExercise('Incline Treadmill')).toBe(true);
    });

    it('returns false for non-treadmill exercises', () => {
      expect(isTreadmillExercise('ベンチプレス')).toBe(false);
      expect(isTreadmillExercise('スクワット')).toBe(false);
      expect(isTreadmillExercise('エアロバイク')).toBe(false);
      expect(isTreadmillExercise('ランニング')).toBe(false);
      expect(isTreadmillExercise('')).toBe(false);
      expect(isTreadmillExercise(null)).toBe(false);
      expect(isTreadmillExercise(undefined)).toBe(false);
    });
  });

  describe('treadmillTimerUtils', () => {
    describe('calculateRemainingSeconds', () => {
      it('calculates remaining seconds correctly', () => {
        expect(calculateRemainingSeconds(300, 50)).toBe(250);
        expect(calculateRemainingSeconds(300, 300)).toBe(0);
        expect(calculateRemainingSeconds(300, 350)).toBe(0);
        expect(calculateRemainingSeconds(0, 10)).toBe(0);
        expect(calculateRemainingSeconds(-10, 5)).toBe(0);
        expect(calculateRemainingSeconds(300, -10)).toBe(300);
      });
    });

    describe('calculateActualWorkSeconds', () => {
      it('calculates actual worked seconds correctly', () => {
        // Target: 300s (5min). Remaining: 200s -> Worked: 100s
        expect(calculateActualWorkSeconds(300, 200)).toBe(100);
        // Completed: Remaining: 0s -> Worked: 300s
        expect(calculateActualWorkSeconds(300, 0)).toBe(300);
        // Not started: Remaining: 300s -> Worked: 0s
        expect(calculateActualWorkSeconds(300, 300)).toBe(0);
        // Overflow remaining -> Worked: 0s
        expect(calculateActualWorkSeconds(300, 350)).toBe(0);
        expect(calculateActualWorkSeconds(0, 50)).toBe(0);
      });
    });

    describe('formatTimerDisplay', () => {
      it('formats seconds into MM:SS correctly', () => {
        expect(formatTimerDisplay(0)).toBe('00:00');
        expect(formatTimerDisplay(5)).toBe('00:05');
        expect(formatTimerDisplay(65)).toBe('01:05');
        expect(formatTimerDisplay(600)).toBe('10:00');
        expect(formatTimerDisplay(3599)).toBe('59:59');
        expect(formatTimerDisplay(5999)).toBe('99:59');
        expect(formatTimerDisplay(6000)).toBe('99:59'); // Capped at 99:59
        expect(formatTimerDisplay(-10)).toBe('00:00');
        expect(formatTimerDisplay(59.9)).toBe('00:59');
      });
    });
  });

  describe('buildInitialSetsForExercise for Treadmill', () => {
    it('correctly populates prev_speed, prev_incline, and prev_work_seconds from previousSets', () => {
      const { buildInitialSetsForExercise } = require('../src/utils/workoutSetBuilder');
      const mockExercise = {
        id: 99,
        name: 'トレッドミル',
        previousSets: [
          {
            set_number: 1,
            speed: 8.5,
            incline: 2.0,
            work_seconds: 1200, // 20分
            weight: null,
            reps: null,
            rpe: null,
          },
          {
            set_number: 2,
            speed: 9.0,
            incline: 3.0,
            work_seconds: 900, // 15分
            weight: null,
            reps: null,
            rpe: null,
          },
        ],
      };

      const sets = buildInitialSetsForExercise(mockExercise);
      expect(sets).toHaveLength(2);

      // Set 1
      expect(sets[0].speed).toBeNull();
      expect(sets[0].incline).toBeNull();
      expect(sets[0].prev_speed).toBe(8.5);
      expect(sets[0].prev_incline).toBe(2.0);
      expect(sets[0].prev_work_seconds).toBe(1200);

      // Set 2
      expect(sets[1].speed).toBeNull();
      expect(sets[1].incline).toBeNull();
      expect(sets[1].prev_speed).toBe(9.0);
      expect(sets[1].prev_incline).toBe(3.0);
      expect(sets[1].prev_work_seconds).toBe(900);
    });

    it('correctly populates prev_work_seconds when alwaysOneSet is true', () => {
      const { buildInitialSetsForExercise } = require('../src/utils/workoutSetBuilder');
      const mockExercise = {
        id: 99,
        name: 'トレッドミル',
        previousSets: [
          {
            set_number: 1,
            speed: 7.2,
            incline: 1.5,
            work_seconds: 1800, // 30分
            weight: null,
            reps: null,
            rpe: null,
          },
        ],
      };

      const sets = buildInitialSetsForExercise(mockExercise, true);
      expect(sets).toHaveLength(1);
      expect(sets[0].prev_speed).toBe(7.2);
      expect(sets[0].prev_incline).toBe(1.5);
      expect(sets[0].prev_work_seconds).toBe(1800);
    });
  });
});

