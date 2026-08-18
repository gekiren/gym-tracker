describe('TimeWheelPicker conversion logic', () => {
  // 12時間制 + AM/PM -> 24時間制 "HH:mm"
  const to24Hour = (isPm: boolean, h12: number, tens: number, ones: number) => {
    let finalH24 = 0;
    if (isPm) {
      finalH24 = h12 === 12 ? 12 : h12 + 12;
    } else {
      finalH24 = h12 === 12 ? 0 : h12;
    }
    const finalMin = tens * 10 + ones;
    return `${String(finalH24).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
  };

  // 24時間制 "HH:mm" -> 12時間制 + AM/PM
  const from24Hour = (value: string) => {
    const [hourStr, minStr] = (value || '12:00').split(':');
    const h24 = parseInt(hourStr, 10) || 0;
    const m = parseInt(minStr, 10) || 0;

    const isPm = h24 >= 12;
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const minuteTens = Math.floor((m % 60) / 10);
    const minuteOnes = (m % 60) % 10;
    return { isPm, h12, minuteTens, minuteOnes };
  };

  test('converts AM midnight (00:00) correctly', () => {
    const parsed = from24Hour('00:00');
    expect(parsed.isPm).toBe(false);
    expect(parsed.h12).toBe(12);
    expect(parsed.minuteTens).toBe(0);
    expect(parsed.minuteOnes).toBe(0);

    const back = to24Hour(parsed.isPm, parsed.h12, parsed.minuteTens, parsed.minuteOnes);
    expect(back).toBe('00:00');
  });

  test('converts AM morning (07:45) correctly', () => {
    const parsed = from24Hour('07:45');
    expect(parsed.isPm).toBe(false);
    expect(parsed.h12).toBe(7);
    expect(parsed.minuteTens).toBe(4);
    expect(parsed.minuteOnes).toBe(5);

    const back = to24Hour(parsed.isPm, parsed.h12, parsed.minuteTens, parsed.minuteOnes);
    expect(back).toBe('07:45');
  });

  test('converts PM noon (12:00) correctly', () => {
    const parsed = from24Hour('12:00');
    expect(parsed.isPm).toBe(true);
    expect(parsed.h12).toBe(12);
    expect(parsed.minuteTens).toBe(0);
    expect(parsed.minuteOnes).toBe(0);

    const back = to24Hour(parsed.isPm, parsed.h12, parsed.minuteTens, parsed.minuteOnes);
    expect(back).toBe('12:00');
  });

  test('converts PM afternoon (14:35) correctly', () => {
    const parsed = from24Hour('14:35');
    expect(parsed.isPm).toBe(true);
    expect(parsed.h12).toBe(2);
    expect(parsed.minuteTens).toBe(3);
    expect(parsed.minuteOnes).toBe(5);

    const back = to24Hour(parsed.isPm, parsed.h12, parsed.minuteTens, parsed.minuteOnes);
    expect(back).toBe('14:35');
  });

  test('converts PM late night (23:59) correctly', () => {
    const parsed = from24Hour('23:59');
    expect(parsed.isPm).toBe(true);
    expect(parsed.h12).toBe(11);
    expect(parsed.minuteTens).toBe(5);
    expect(parsed.minuteOnes).toBe(9);

    const back = to24Hour(parsed.isPm, parsed.h12, parsed.minuteTens, parsed.minuteOnes);
    expect(back).toBe('23:59');
  });
});
