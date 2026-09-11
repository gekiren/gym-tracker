import { isTreadmillExercise } from '../src/utils/exerciseUtils';

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
});
