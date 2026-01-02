process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const route = require('../routes/schoolAdmin');
const { parseSlot, resolveStage } = route.__test__ || {};

describe('parseSlot', () => {
  test('parses valid slot and computes minutes', () => {
    const res = parseSlot('08:00 - 09:30');
    expect(res.ok).toBe(true);
    expect(res.start).toBe(8 * 60);
    expect(res.end).toBe(9 * 60 + 30);
  });

  test('handles spaces and trims correctly', () => {
    const res = parseSlot(' 13:15- 14:00 ');
    expect(res.ok).toBe(true);
    expect(res.start).toBe(13 * 60 + 15);
    expect(res.end).toBe(14 * 60);
  });

  test('invalid or equal times return ok=false', () => {
    const a = parseSlot('08:00-08:00');
    const b = parseSlot('bad-input');
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });
});

describe('resolveStage', () => {
  const stages = ["رياض أطفال", "ابتدائي", "إعدادي", "ثانوي"];
  const map = {
    "رياض أطفال": ["رياض أطفال"],
    "ابتدائي": ["الصف الأول", "الصف الثاني", "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس"],
    "إعدادي": ["أول إعدادي", "ثاني إعدادي", "ثالث إعدادي"],
    "ثانوي": ["أول ثانوي", "ثاني ثانوي", "ثالث ثانوي"],
  };

  test('maps primary grades to ابتدائي', () => {
    expect(resolveStage('الصف الرابع', stages, map)).toBe('ابتدائي');
  });

  test('maps preparatory grades to إعدادي', () => {
    expect(resolveStage('ثاني إعدادي', stages, map)).toBe('إعدادي');
  });

  test('maps secondary grades to ثانوي', () => {
    expect(resolveStage('أول ثانوي', stages, map)).toBe('ثانوي');
  });

  test('fallback by substring when not in map', () => {
    expect(resolveStage('خامس إعدادي تجريبي', stages, map)).toBe('إعدادي');
  });

  test('unknown grade falls back to first stage', () => {
    expect(resolveStage('غير معروف', stages, map)).toBe(stages[0]);
  });
});
