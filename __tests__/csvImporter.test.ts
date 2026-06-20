jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(),
}));
jest.mock('expo-document-picker', () => ({}));
jest.mock('expo-file-system', () => ({}));
jest.mock('../src/db/database', () => ({
  getDB: jest.fn(),
  addCustomExercise: jest.fn(),
}));

import { parseCSVText } from '../src/utils/csvImporter';

describe('csvImporter - parseCSVText', () => {
  it('correctly parses simple comma separated text', () => {
    const csv = `Date,Exercise,Weight,Reps
2026-06-20,Bench Press,80,8
2026-06-20,Squat,100,5`;

    const result = parseCSVText(csv);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(['Date', 'Exercise', 'Weight', 'Reps']);
    expect(result[1]).toEqual(['2026-06-20', 'Bench Press', '80', '8']);
    expect(result[2]).toEqual(['2026-06-20', 'Squat', '100', '5']);
  });

  it('correctly handles quoted fields with commas inside', () => {
    const csv = `Date,Exercise,Notes
2026-06-20,"Bench Press, Close Grip","Felt good, stable"`;

    const result = parseCSVText(csv);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(['2026-06-20', 'Bench Press, Close Grip', 'Felt good, stable']);
  });

  it('correctly handles escaped quotes inside quotes', () => {
    const csv = `Date,Exercise,Notes
2026-06-20,Bench Press,"Using ""Larsen"" press variation"`;

    const result = parseCSVText(csv);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(['2026-06-20', 'Bench Press', 'Using "Larsen" press variation']);
  });

  it('handles CRLF (Windows) and LF (Unix) line endings properly', () => {
    const csv = "Date,Exercise\r\n2026-06-20,Bench Press\n2026-06-21,Squat\r\n";
    
    const result = parseCSVText(csv);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual(['2026-06-20', 'Bench Press']);
    expect(result[2]).toEqual(['2026-06-21', 'Squat']);
  });

  it('skips empty lines', () => {
    const csv = `Date,Exercise
2026-06-20,Bench Press


2026-06-21,Squat`;

    const result = parseCSVText(csv);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual(['2026-06-20', 'Bench Press']);
    expect(result[2]).toEqual(['2026-06-21', 'Squat']);
  });
});
